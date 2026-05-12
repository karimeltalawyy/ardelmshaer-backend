import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { S3Service } from '../../common/s3/s3.service';
import { passengerManifestTemplate } from './templates/passenger-manifest.template';
import { contractTemplate } from './templates/contract.template';

export type DocumentType = 'passenger_manifest' | 'contract';

export function slugToDocumentType(slug: string): DocumentType {
  const normalized = String(slug).trim().toLowerCase();
  if (normalized === 'passenger-manifest') return 'passenger_manifest';
  if (normalized === 'contract') return 'contract';
  throw new BadRequestException(
    `Unsupported document slug "${slug}". Use passenger-manifest or contract.`,
  );
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private whatsapp: WhatsappService,
    private s3: S3Service,
  ) {}

  // ─── Generate & store document ────────────────────────────────────────────────

  async generate(bookingId: string, userId: string, docType: DocumentType) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true, nameEn: true } },
                destination: { select: { nameAr: true, nameEn: true } },
              },
            },
            car: { select: { brand: true, model: true, plateNumber: true, carType: true } },
            driver: { include: { user: { select: { id: true, fullName: true, phone: true, profileImage: true } } } },
          },
        },
        passengers: true,
        rider: { select: { id: true, fullName: true, phone: true, role: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertAccess(booking, userId);

    if (!booking.trip) {
      throw new BadRequestException(
        'This booking has no trip assigned (tripId is null). Link a trip to this booking in admin before generating PDFs.',
      );
    }

    this.assertTripDataCompleteForPdf(booking);
    await this.enforceGenerationPolicy(bookingId, booking.trip!, docType);

    const html = await this.buildHtml(docType, booking);
    const pdfBuffer = await this.renderToPdf(html);

    const filename = `${docType}-${bookingId}-${Date.now()}.pdf`;
    const fileUrl = await this.s3.uploadBuffer('documents', pdfBuffer, filename, 'application/pdf');

    const document = await this.prisma.document.create({
      data: { bookingId, type: docType, fileUrl },
    });

    if (docType === 'passenger_manifest') {
      this.dispatchManifestNotifications(booking, pdfBuffer).catch((err) => {
        this.logger.warn(`manifest WhatsApp dispatch failed for booking ${bookingId}: ${(err as Error).message}`);
      });
    }

    return document;
  }

  private async dispatchManifestNotifications(
    booking: any,
    pdfBuffer: Buffer,
  ): Promise<{ driverSent: boolean; driverError: string | null; adminSent: boolean; adminError: string | null }> {
    const reference = booking.bookingSerial
      ? `AMS-${String(booking.bookingSerial).padStart(6, '0')}`
      : booking.id;

    const origin = booking.trip.route.origin.nameAr;
    const destination = booking.trip.route.destination.nameAr;
    const departureAt = new Date(booking.trip.departureAt);
    const passengerCount: number = Array.isArray(booking.passengers)
      ? booking.passengers.length
      : booking.seatCount ?? 0;

    const riderData = this.resolveRiderDataForPdf(booking);
    const driverPhone: string = booking.trip?.driver?.user?.phone ?? '';

    let driverSent = false;
    let driverError: string | null = null;

    if (driverPhone) {
      try {
        await this.whatsapp.notifyDriverWithManifest({
          driverPhone,
          referenceNumber: reference,
          originNameAr: origin,
          destinationNameAr: destination,
          departureAt,
          pdfBuffer,
        });
        driverSent = true;
      } catch (e) {
        driverError = (e as Error).message;
        this.logger.error(`dispatchManifestNotifications: driver notification failed — ${driverError}`);
      }
    } else {
      driverError = 'Driver phone number is missing on this trip';
      this.logger.warn(`dispatchManifestNotifications: driver phone missing for booking ${reference}`);
    }

    let adminSent = false;
    let adminError: string | null = null;

    try {
      await this.whatsapp.notifyAdminWithManifest({
        referenceNumber: reference,
        riderName: riderData.fullName,
        riderPhone: riderData.phone,
        originNameAr: origin,
        destinationNameAr: destination,
        departureAt,
        passengerCount,
        pdfBuffer,
      });
      adminSent = true;
    } catch (e) {
      adminError = (e as Error).message;
      this.logger.error(`dispatchManifestNotifications: admin notification failed — ${adminError}`);
    }

    return { driverSent, driverError, adminSent, adminError };
  }

  /** Avoid 500s from null route/driver/car; message helps ops fix data. */
  private assertTripDataCompleteForPdf(booking: any): void {
    const t = booking.trip;
    if (!t?.route?.origin || !t?.route?.destination) {
      throw new BadRequestException(
        'Trip route (origin/destination) is missing for this booking; cannot build PDF',
      );
    }
    if (!t?.driver?.user) {
      throw new BadRequestException(
        'Trip driver or driver user record is missing; cannot build PDF',
      );
    }
    if (!t?.car) {
      throw new BadRequestException('Trip vehicle (car) is missing; cannot build PDF');
    }
  }

  private async enforceGenerationPolicy(
    bookingId: string,
    trip: { status: string },
    docType: DocumentType,
  ): Promise<void> {
    if (docType === 'contract') {
      const { status } = trip;
      if (status === 'cancelled') {
        throw new BadRequestException('Cannot generate contract for a cancelled trip');
      }
      const count = await this.prisma.document.count({ where: { bookingId, type: 'contract' } });
      if (status === 'completed' && count >= 1) {
        throw new ConflictException('Transport contract has already been issued for this completed booking');
      }
      if (count >= 3) {
        throw new BadRequestException('Maximum of 3 contract generations reached for this booking');
      }
      return;
    }

    // passenger_manifest
    const { status } = trip;
    if (status === 'cancelled') {
      throw new BadRequestException('Cannot generate passenger manifest when the trip is cancelled');
    }

    const manifestCount = await this.prisma.document.count({
      where: { bookingId, type: 'passenger_manifest' },
    });

    if (status === 'completed' && manifestCount >= 2) {
      throw new BadRequestException(
        'Maximum of 2 passenger manifest generations allowed after the trip is completed',
      );
    }

    if (status !== 'completed' && manifestCount >= 5) {
      throw new BadRequestException(
        'Maximum passenger manifest regenerations reached while the trip is not completed',
      );
    }
  }

  // ─── Resend manifest WhatsApp notifications ──────────────────────────────────

  async notifyManifest(bookingId: string, userId: string): Promise<{
    driverSent: boolean; driverError: string | null;
    adminSent: boolean; adminError: string | null;
  }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true, nameEn: true } },
                destination: { select: { nameAr: true, nameEn: true } },
              },
            },
            car: { select: { brand: true, model: true, plateNumber: true, carType: true } },
            driver: { include: { user: { select: { id: true, fullName: true, phone: true, profileImage: true } } } },
          },
        },
        passengers: true,
        rider: { select: { id: true, fullName: true, phone: true, role: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertAccess(booking, userId);

    if (!booking.trip) {
      throw new BadRequestException('This booking has no trip assigned.');
    }

    this.assertTripDataCompleteForPdf(booking);

    const html = await this.buildHtml('passenger_manifest', booking);
    const pdfBuffer = await this.renderToPdf(html);
    return this.dispatchManifestNotifications(booking, pdfBuffer);
  }

  // ─── List documents for a booking ────────────────────────────────────────────

  async findByBooking(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        rider: { select: { id: true } },
        trip: {
          include: {
            driver: { include: { user: { select: { id: true } } } },
          },
        },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertAccess(booking, userId);

    return this.prisma.document.findMany({ where: { bookingId } });
  }

  async getHtml(bookingId: string, userId: string, docType: DocumentType): Promise<string> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true, nameEn: true } },
                destination: { select: { nameAr: true, nameEn: true } },
              },
            },
            car: { select: { brand: true, model: true, plateNumber: true, carType: true } },
            driver: { include: { user: { select: { id: true, fullName: true, phone: true, profileImage: true } } } },
          },
        },
        passengers: true,
        rider: { select: { id: true, fullName: true, phone: true, role: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertAccess(booking, userId);

    if (!booking.trip) {
      throw new BadRequestException(
        'This booking has no trip assigned. Link a trip before generating HTML.',
      );
    }

    this.assertTripDataCompleteForPdf(booking);
    return this.buildHtml(docType, booking);
  }

  private async assertAccess(booking: any, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) throw new ForbiddenException('Access denied');
    if (user.role === 'admin') return;

    const isRiderOwner = booking.riderId === userId || booking.rider?.id === userId;
    const isAssignedDriver = booking.trip?.driver?.user?.id === userId;
    if (!isRiderOwner && !isAssignedDriver) {
      throw new ForbiddenException('Access denied');
    }
  }

  /** Guest bookings may have no linked rider user — use booking fields + passengers. */
  private resolveRiderDataForPdf(booking: any): { fullName: string; phone: string } {
    const p0 =
      Array.isArray(booking.passengers) && booking.passengers.length > 0
        ? booking.passengers[0]
        : null;
    const serialLabel =
      typeof booking.bookingSerial === 'number' ? `حجز #${booking.bookingSerial}` : '—';

    const fullName =
      booking.rider?.fullName?.trim() ||
      booking.riderName?.trim() ||
      p0?.fullName?.trim() ||
      serialLabel;

    const phone =
      booking.rider?.phone?.trim() ||
      booking.riderPhone?.trim() ||
      booking.contactPhone?.trim() ||
      p0?.phone?.trim() ||
      '';

    return { fullName, phone };
  }

  private async fetchImageAsDataUri(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = await response.arrayBuffer();
      return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    } catch {
      return null;
    }
  }

  // ─── Build HTML ───────────────────────────────────────────────────────────────

  protected async buildHtml(docType: DocumentType, booking: any): Promise<string> {
    const now = new Date();
    const issuedAtShort = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const depDate = new Date(booking.trip.departureAt);
    const departureAt = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(depDate);

    const departureDate = `${depDate.getFullYear()}-${String(depDate.getMonth() + 1).padStart(2, '0')}-${String(depDate.getDate()).padStart(2, '0')}`;
    const departureTime = `${String(depDate.getHours()).padStart(2, '0')} : ${String(depDate.getMinutes()).padStart(2, '0')}`;

    const referenceNumber = typeof booking.bookingSerial === 'number'
      ? String(booking.bookingSerial)
      : booking.id.slice(0, 8).toUpperCase();

    const rawPhotoUrl = (booking.trip.driver.user.profileImage as string | null) ?? null;
    const driverPhoto = rawPhotoUrl ? await this.fetchImageAsDataUri(rawPhotoUrl) : null;

    const tripData = {
      departureAt,
      departureDate,
      departureTime,
      origin: booking.trip.route.origin,
      destination: booking.trip.route.destination,
      driver: {
        fullName: booking.trip.driver.user.fullName,
        phone: booking.trip.driver.user.phone ?? '',
        photo: driverPhoto,
        idNumber: (booking.trip.driver.licenseNumber as string) ?? '',
      },
      car: booking.trip.car,
      bookingMode: String(booking.trip.bookingMode),
    };

    const riderData = this.resolveRiderDataForPdf(booking);

    if (docType === 'passenger_manifest') {
      const passengers = booking.passengers.map((p: any) => ({
        fullName: p.fullName,
        nationality: p.nationality,
        idNumber: p.idNumber,
        phone: p.phone ?? '',
      }));
      return passengerManifestTemplate({
        bookingId: booking.id,
        referenceNumber,
        issuedAt: issuedAtShort,
        trip: tripData,
        rider: riderData,
        passengers,
      });
    }

    // contract
    return contractTemplate({
      bookingId: booking.id,
      referenceNumber,
      issuedAt: issuedAtShort,
      trip: tripData,
      rider: riderData,
      totalPrice: Number(booking.totalPrice).toFixed(2),
      paymentMethod: booking.paymentMethod,
      passengerCount: booking.seatCount,
      passengers: booking.passengers.map((p: any) => ({
        fullName: p.fullName,
        nationality: p.nationality,
        idNumber: p.idNumber,
        phone: p.phone ?? '',
      })),
    });
  }

  // ─── Render HTML → PDF Buffer ─────────────────────────────────────────────────

  private async renderToPdf(html: string): Promise<Buffer> {
    const chromiumPath = this.config.get<string>('CHROMIUM_PATH') || process.env.CHROMIUM_PATH;

    let browser: puppeteer.Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumPath?.trim() || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.evaluate(
        () =>
          Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => setTimeout(resolve, 6000)),
          ]),
      );
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      });
      return Buffer.from(pdf);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`PDF render failed: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new InternalServerErrorException(`PDF generation failed: ${message}`);
    } finally {
      await browser?.close();
    }
  }
}
