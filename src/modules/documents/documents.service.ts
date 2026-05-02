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
        'Booking must have an assigned trip to generate documents for this booking',
      );
    }

    await this.enforceGenerationPolicy(bookingId, booking.trip!, docType);

    const existingReceipt =
      docType === 'payment_receipt'
        ? await this.prisma.document.findFirst({ where: { bookingId, type: docType } })
        : null;
    if (existingReceipt) return existingReceipt;

    const html = this.buildHtml(docType, booking);
    const fileUrl = await this.renderToPdf(html, bookingId, docType);

    return this.prisma.document.create({
      data: { bookingId, type: docType, fileUrl },
    });
  }

  private async enforceGenerationPolicy(
    bookingId: string,
    trip: { status: string },
    docType: 'passenger_manifest' | 'contract' | 'payment_receipt',
  ): Promise<void> {
    if (docType === 'contract') {
      const exists = await this.prisma.document.findFirst({
        where: { bookingId, type: 'contract' },
      });
      if (exists) {
        throw new ConflictException('Transport contract has already been issued for this booking');
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

    if (!booking.rider && !booking.riderName) {
      throw new BadRequestException('Booking is missing rider details required for PDF generation');
    }

    const riderEffective = booking.rider ?? {
      id: booking.id,
      fullName: booking.riderName ?? '',
      phone: booking.riderPhone ?? booking.contactPhone ?? '',
      role: 'rider' as const,
    };

    const riderData = {
      fullName: riderEffective.fullName,
      phone: riderEffective.phone ?? '',
    };

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

    let browser: puppeteer.Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
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

    const configured = this.config.get<string>('PUBLIC_API_URL')?.trim().replace(/\/$/, '');
    const port = this.config.get<number>('PORT', 3000);
    const base = configured && configured.length > 0 ? configured : `http://127.0.0.1:${port}`;
    return `${base}/uploads/documents/${fileName}`;
  }
}
