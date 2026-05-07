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
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { passengerManifestTemplate } from './templates/passenger-manifest.template';
import { contractTemplate } from './templates/contract.template';
import { paymentReceiptTemplate } from './templates/payment-receipt.template';

export function slugToDocumentType(slug: string): 'passenger_manifest' | 'contract' | 'payment_receipt' {
  const normalized = String(slug).trim().toLowerCase();
  if (normalized === 'passenger-manifest') return 'passenger_manifest';
  if (normalized === 'contract') return 'contract';
  if (normalized === 'payment-receipt') return 'payment_receipt';
  throw new BadRequestException(
    `Unsupported document slug "${slug}". Use passenger-manifest, contract, or payment-receipt.`,
  );
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private whatsapp: WhatsappService,
  ) {}

  // ─── Generate & store document ────────────────────────────────────────────────

  async generate(bookingId: string, userId: string, docType: 'passenger_manifest' | 'contract' | 'payment_receipt') {
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
            driver: { include: { user: { select: { id: true, fullName: true, phone: true } } } },
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
        'This booking has no trip assigned (tripId is null). Link a trip to this booking in admin before generating PDFs. Other passengers on a trip do not auto-link this booking.',
      );
    }

    this.assertTripDataCompleteForPdf(booking);

    await this.enforceGenerationPolicy(bookingId, booking.trip!, docType);

    const existingReceipt =
      docType === 'payment_receipt'
        ? await this.prisma.document.findFirst({ where: { bookingId, type: docType } })
        : null;
    if (existingReceipt) return existingReceipt;

    const html = this.buildHtml(docType, booking);
    const fileUrl = await this.renderToPdf(html, bookingId, docType);

    const document = await this.prisma.document.create({
      data: { bookingId, type: docType, fileUrl },
    });

    if (docType === 'passenger_manifest') {
      this.dispatchManifestNotifications(booking, fileUrl).catch(() => {});
    }

    return document;
  }

  private async dispatchManifestNotifications(booking: any, filePath: string): Promise<void> {
    const reference = booking.bookingSerial
      ? `AMS-${String(booking.bookingSerial).padStart(6, '0')}`
      : booking.id;

    const origin = booking.trip.route.origin.nameAr;
    const destination = booking.trip.route.destination.nameAr;
    const departureAt = new Date(booking.trip.departureAt);
    const passengerCount: number = Array.isArray(booking.passengers)
      ? booking.passengers.length
      : booking.seatCount ?? 0;

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = fs.readFileSync(filePath);
    } catch (e) {
      this.logger.warn(`dispatchManifestNotifications: could not read PDF file — ${(e as Error).message}`);
      return;
    }

    const riderData = this.resolveRiderDataForPdf(booking);
    const driverPhone: string = booking.trip?.driver?.user?.phone ?? '';

    if (driverPhone) {
      await this.whatsapp.notifyDriverWithManifest({
        driverPhone,
        referenceNumber: reference,
        originNameAr: origin,
        destinationNameAr: destination,
        departureAt,
        pdfBuffer,
      });
    } else {
      this.logger.warn(`dispatchManifestNotifications: driver phone missing for booking ${reference}`);
    }

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
  }

  private async dispatchManifestWithPdf(booking: any): Promise<void> {
    const html = this.buildHtml('passenger_manifest', booking);
    let filePath: string | null = null;
    try {
      filePath = await this.renderToPdf(html, booking.id, 'passenger_manifest');
      await this.dispatchManifestNotifications(booking, filePath);
    } finally {
      if (filePath) {
        try { fs.unlinkSync(filePath); } catch (e) {
          this.logger.warn(`dispatchManifestWithPdf: could not delete temp PDF ${filePath} — ${(e as Error).message}`);
        }
      }
    }
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
    docType: 'passenger_manifest' | 'contract' | 'payment_receipt',
  ): Promise<void> {
    if (docType === 'contract') {
      const { status } = trip;
      if (status === 'cancelled') {
        throw new BadRequestException('Cannot generate contract for a cancelled trip');
      }
      const count = await this.prisma.document.count({ where: { bookingId, type: 'contract' } });
      // After completion: only one final contract is allowed.
      if (status === 'completed' && count >= 1) {
        throw new ConflictException('Transport contract has already been issued for this completed booking');
      }
      // While active: allow up to 3 re-generations (driver may update passenger list on the road).
      if (count >= 3) {
        throw new BadRequestException('Maximum of 3 contract generations reached for this booking');
      }
      return;
    }

    if (docType !== 'passenger_manifest') return;

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

  /** Guest bookings may have no linked rider user — use booking fields + passengers. No signup required. */
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

  // ─── Build HTML ───────────────────────────────────────────────────────────────

  private buildHtml(docType: string, booking: any): string {
    const issuedAt = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date());

    const departureAt = new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(booking.trip.departureAt));

    const tripData = {
      departureAt,
      origin: booking.trip.route.origin,
      destination: booking.trip.route.destination,
      driver: {
        fullName: booking.trip.driver.user.fullName,
        phone: booking.trip.driver.user.phone ?? '',
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
        issuedAt,
        trip: tripData,
        rider: riderData,
        passengers,
      });
    }

    if (docType === 'contract') {
      return contractTemplate({
        bookingId: booking.id,
        issuedAt,
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

    // payment_receipt
    return paymentReceiptTemplate({
      bookingId: booking.id,
      issuedAt,
      trip: tripData,
      rider: riderData,
      basePrice: Number(booking.basePrice).toFixed(2),
      seasonMultiplier: Number(booking.seasonMultiplier).toFixed(2),
      platformFee: Number(booking.platformFee).toFixed(2),
      driverPayout: Number(booking.driverPayout).toFixed(2),
      totalPrice: Number(booking.totalPrice).toFixed(2),
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      passengerCount: booking.seatCount,
    });
  }

  // ─── Render HTML → PDF ────────────────────────────────────────────────────────

  private async renderToPdf(html: string, bookingId: string, docType: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const uniq = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
    const fileName = `${docType}-${bookingId}-${uniq}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const chromiumPath = this.config.get<string>('CHROMIUM_PATH') || process.env.CHROMIUM_PATH;

    let browser: puppeteer.Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: chromiumPath?.trim() || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      // Wait for Google Fonts (@import Cairo) to finish loading so Arabic glyphs render correctly.
      // Uses a 6-second hard cap so a network hiccup cannot stall generation indefinitely.
      await page.evaluate(
        () =>
          Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => setTimeout(resolve, 6000)),
          ]),
      );
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `PDF render failed bookingId=${bookingId} docType=${docType} file=${fileName}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(`PDF generation failed: ${message}`);
    } finally {
      await browser?.close();
    }

    return filePath;
  }
}
