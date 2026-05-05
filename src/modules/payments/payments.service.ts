import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CollectPaymentDto } from './dto/collect-payment.dto';
import { OverridePaymentDto } from './dto/override-payment.dto';

const PAYMENT_INCLUDE = {
  trip: {
    include: {
      route: {
        include: {
          origin: { select: { nameAr: true, nameEn: true } },
          destination: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
  },
  rider: { select: { id: true, fullName: true, phone: true } },
} as const;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  // ─── Driver: confirm cash collected ──────────────────────────────────────────

  async collectCash(bookingId: string, driverUserId: string, dto: CollectPaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { include: { driver: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (!booking.trip) throw new BadRequestException('لا يمكن تحصيل دفعة لطلب لم يُربط برحلة');

    if (booking.trip.driver.userId !== driverUserId) {
      throw new ForbiddenException('This booking does not belong to your trip');
    }

    if (booking.paymentMethod !== 'cash') {
      throw new BadRequestException('This booking is not a cash payment');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot collect payment for a cancelled booking');
    }

    if (booking.paymentStatus === 'paid') {
      throw new BadRequestException('Payment has already been collected');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'paid' },
      include: PAYMENT_INCLUDE,
    });
  }

  // ─── Get payment details for a booking ───────────────────────────────────────

  async findOne(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ...PAYMENT_INCLUDE,
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true, nameEn: true } },
                destination: { select: { nameAr: true, nameEn: true } },
              },
            },
            driver: { include: { user: { select: { fullName: true, phone: true } } } },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    const isRider = booking.riderId === userId;
    const isDriver = booking.trip?.driver.userId === userId;

    if (!isAdmin && !isRider && !isDriver) {
      throw new ForbiddenException('Access denied');
    }

    return this.buildPaymentSummary(booking);
  }

  // ─── Rider: my payment history ────────────────────────────────────────────────

  async findMyPayments(riderId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { riderId },
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(this.buildPaymentSummary);
  }

  // ─── Driver: payments on my trips ─────────────────────────────────────────────

  async findDriverPayments(driverUserId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: driverUserId },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found');

    const bookings = await this.prisma.booking.findMany({
      where: {
        trip: { driverId: driverProfile.id },
        status: { not: 'cancelled' },
      },
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    const payments = bookings.map(this.buildPaymentSummary);

    const totalEarned = bookings
      .filter((b) => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + Number(b.driverPayout), 0);

    const pendingAmount = bookings
      .filter((b) => b.paymentStatus === 'pending')
      .reduce((sum, b) => sum + Number(b.driverPayout), 0);

    return {
      summary: {
        totalEarned: Math.round(totalEarned * 100) / 100,
        pendingAmount: Math.round(pendingAmount * 100) / 100,
        totalBookings: bookings.length,
        paidBookings: bookings.filter((b) => b.paymentStatus === 'paid').length,
        pendingBookings: bookings.filter((b) => b.paymentStatus === 'pending').length,
      },
      payments,
    };
  }

  // ─── Admin: all payments ──────────────────────────────────────────────────────

  async findAll(filters: {
    paymentStatus?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};

    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    // Exclude cancelled bookings from payment views by default
    where.status = { not: 'cancelled' };

    const bookings = await this.prisma.booking.findMany({
      where,
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map(this.buildPaymentSummary);
  }

  // ─── Admin: financial summary ─────────────────────────────────────────────────

  async getSummary() {
    const [all, paid, pending, refunded, cancelled] = await Promise.all([
      this.prisma.booking.aggregate({
        where: { status: { not: 'cancelled' } },
        _sum: { totalPrice: true, platformFee: true, driverPayout: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'paid', status: { not: 'cancelled' } },
        _sum: { totalPrice: true, platformFee: true, driverPayout: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'pending', status: { not: 'cancelled' } },
        _sum: { totalPrice: true, platformFee: true, driverPayout: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'refunded' },
        _sum: { totalPrice: true },
        _count: true,
      }),
      this.prisma.booking.aggregate({
        where: { status: 'cancelled' },
        _count: true,
      }),
    ]);

    return {
      totalBookings: all._count,
      cancelledBookings: cancelled._count,
      revenue: {
        total: Number(all._sum.totalPrice ?? 0),
        collected: Number(paid._sum.totalPrice ?? 0),
        pending: Number(pending._sum.totalPrice ?? 0),
        refunded: Number(refunded._sum.totalPrice ?? 0),
      },
      platformFees: {
        total: Number(all._sum.platformFee ?? 0),
        collected: Number(paid._sum.platformFee ?? 0),
        pending: Number(pending._sum.platformFee ?? 0),
      },
      driverPayouts: {
        total: Number(all._sum.driverPayout ?? 0),
        paid: Number(paid._sum.driverPayout ?? 0),
        pending: Number(pending._sum.driverPayout ?? 0),
      },
      byPaymentStatus: {
        paid: paid._count,
        pending: pending._count,
        refunded: refunded._count,
      },
    };
  }

  // ─── Admin: override payment status ──────────────────────────────────────────

  async overrideStatus(bookingId: string, dto: OverridePaymentDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'cancelled' && dto.status !== 'refunded') {
      throw new BadRequestException('Cancelled bookings can only be set to refunded');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: dto.status as any },
      include: PAYMENT_INCLUDE,
    });
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────

  private buildPaymentSummary(booking: any) {
    return {
      bookingId: booking.id,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      passengerCount: booking.seatCount,
      basePrice: Number(booking.basePrice),
      seasonMultiplier: Number(booking.seasonMultiplier),
      platformFee: Number(booking.platformFee),
      driverPayout: Number(booking.driverPayout),
      totalPrice: Number(booking.totalPrice),
      createdAt: booking.createdAt,
      trip: booking.trip
        ? {
            departureAt: booking.trip.departureAt,
            origin: booking.trip.route?.origin,
            destination: booking.trip.route?.destination,
          }
        : null,
      rider: booking.rider ?? null,
    };
  }
}
