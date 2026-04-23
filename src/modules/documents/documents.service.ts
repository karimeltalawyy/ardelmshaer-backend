import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { passengerManifestTemplate } from './templates/passenger-manifest.template';
import { contractTemplate } from './templates/contract.template';
import { paymentReceiptTemplate } from './templates/payment-receipt.template';

@Injectable()
export class DocumentsService {
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
        bookingSeats: {
          include: { carSeat: { select: { seatCode: true } }, passenger: true },
        },
        rider: { select: { id: true, fullName: true, phone: true, role: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    await this.assertAccess(booking, userId);

    // Check if already generated — return existing
    const existing = await this.prisma.document.findFirst({
      where: { bookingId, type: docType },
    });
    if (existing) return existing;

    const html = this.buildHtml(docType, booking);
    const fileUrl = await this.renderToPdf(html, bookingId, docType);

    return this.prisma.document.create({
      data: { bookingId, type: docType, fileUrl },
    });
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
      bookingMode: booking.bookingMode,
    };

    const riderData = {
      fullName: booking.rider.fullName,
      phone: booking.rider.phone ?? '',
    };

    if (docType === 'passenger_manifest') {
      const passengers = booking.passengers.map((p: any) => {
        const seat = booking.bookingSeats.find((bs: any) => bs.passengerId === p.id);
        return {
          fullName: p.fullName,
          nationality: p.nationality,
          idNumber: p.idNumber,
          phone: p.phone ?? '',
          seatCode: seat?.carSeat?.seatCode,
        };
      });
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
        seatCount: booking.seatCount,
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
      seatCount: booking.seatCount,
    });
  }

  // ─── Render HTML → PDF ────────────────────────────────────────────────────────

  private async renderToPdf(html: string, bookingId: string, docType: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const fileName = `${docType}-${bookingId}.pdf`;
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
      throw new InternalServerErrorException(`PDF generation failed: ${err.message}`);
    } finally {
      await browser?.close();
    }

    const port = this.config.get<number>('PORT', 3000);
    return `http://localhost:${port}/uploads/documents/${fileName}`;
  }
}
