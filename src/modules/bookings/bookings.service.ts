import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { UpdateBookingPassengersDto } from './dto/update-booking-passengers.dto';
import { CreateGuestBookingDto } from './dto/create-guest-booking.dto';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizeSaudiPhone } from '../../common/validators/is-saudi-phone.validator';

const BOOKING_INCLUDE = {
  trip: {
    include: {
      cancellationPolicy: {
        select: {
          id: true,
          hoursBeforeTrip: true,
          refundPercentage: true,
          descriptionAr: true,
          descriptionEn: true,
        },
      },
      route: {
        include: {
          origin: { select: { nameAr: true, nameEn: true } },
          destination: { select: { nameAr: true, nameEn: true } },
        },
      },
      car: { select: { brand: true, model: true, plateNumber: true, carType: true } },
      driver: { include: { user: { select: { fullName: true, phone: true } } } },
    },
  },
  passengers: true,
  bookingSeats: {
    include: { carSeat: { select: { seatCode: true, position: true } } },
  },
  pickupBranch: { select: { id: true, nameAr: true, addressAr: true } },
} as const;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private pdfService: PdfService,
    private whatsappService: WhatsappService,
  ) {}

  private async generateDefaultDocuments(bookingId: string, userId: string): Promise<void> {
    const docs: Array<'passenger_manifest' | 'contract' | 'payment_receipt'> = [
      'passenger_manifest',
      'contract',
      'payment_receipt',
    ];
    const tasks = docs.map((docType) =>
      this.documentsService.generate(bookingId, userId, docType),
    );
    await Promise.allSettled(tasks);
  }

  private calcHoursUntilDeparture(departureAt: Date): number {
    return (departureAt.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  private getCancellationContext(booking: any, isAdmin: boolean) {
    const hoursUntilDeparture = this.calcHoursUntilDeparture(booking.trip.departureAt);
    const trip = booking.trip;
    const policy = trip.cancellationPolicy;

    const result = {
      canCancel: true,
      blockedReason: null as string | null,
      refundPercent: 0,
      estimatedRefundAmount: 0,
      allowRiderCancellation: !!trip.allowRiderCancellation,
      cancellationCutoffHours: trip.cancellationCutoffHours ?? null,
      policy: policy
        ? {
            id: policy.id,
            hoursBeforeTrip: policy.hoursBeforeTrip,
            refundPercent: policy.refundPercentage,
            descriptionAr: policy.descriptionAr,
            descriptionEn: policy.descriptionEn,
          }
        : null,
    };

    if (booking.status === 'cancelled') {
      result.canCancel = false;
      result.blockedReason = 'الحجز ملغي بالفعل';
      return result;
    }
    if (booking.status === 'no_show') {
      result.canCancel = false;
      result.blockedReason = 'تم وسم الحجز كعدم حضور';
      return result;
    }

    if (trip.status === 'in_progress') {
      result.canCancel = false;
      result.blockedReason = 'انطلقت الرحلة بالفعل';
      return result;
    }

    if (trip.status === 'completed' || trip.status === 'cancelled') {
      result.canCancel = false;
      result.blockedReason = 'لا يمكن إلغاء هذا الحجز بعد انتهاء الرحلة';
      return result;
    }

    if (trip.status !== 'scheduled') {
      result.canCancel = false;
      result.blockedReason = 'الحجز غير متاح للإلغاء';
      return result;
    }

    if (!isAdmin && !trip.allowRiderCancellation) {
      result.canCancel = false;
      result.blockedReason = 'الإلغاء غير مسموح لهذه الرحلة';
      return result;
    }

    if (
      !isAdmin &&
      trip.cancellationCutoffHours != null &&
      hoursUntilDeparture < trip.cancellationCutoffHours
    ) {
      result.canCancel = false;
      result.blockedReason = `الإلغاء يغلق قبل ${trip.cancellationCutoffHours} ساعة من موعد الرحلة`;
      return result;
    }

    if (
      booking.paymentStatus === 'paid' &&
      policy &&
      hoursUntilDeparture >= policy.hoursBeforeTrip
    ) {
      result.refundPercent = policy.refundPercentage;
      result.estimatedRefundAmount =
        Math.round((Number(booking.totalPrice) * policy.refundPercentage) * 100) / 10000;
    }

    return result;
  }

  private withCancellationMeta(booking: any, isAdmin: boolean) {
    return {
      ...booking,
      bookingNumber: `BOOK-${booking.bookingSerial}`,
      cancellation: this.getCancellationContext(booking, isAdmin),
    };
  }

  // ─── Create booking ───────────────────────────────────────────────────────────

  async create(riderId: string, dto: CreateBookingDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        car: { include: { seats: true } },
        season: true,
        route: { include: { origin: { select: { nameAr: true, nameEn: true } } } },
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'scheduled') {
      throw new BadRequestException(`Trip is ${trip.status} and cannot be booked`);
    }
    if (this.isTripServiceDateInPast(trip.departureAt)) {
      throw new BadRequestException('انطلقت الرحلة بالفعل');
    }

    const bookingMode = trip.bookingMode;
    const allowCustomPickupTime = !!trip.allowCustomPickupTime;
    const pickupMode = dto.pickupMode ?? 'branch';

    let pickupTime: Date | null = null;
    if (dto.pickupTime) {
      const parsed = new Date(dto.pickupTime);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid pickupTime format');
      }
      pickupTime = parsed;
    }
    let pickupBranchId: string | null = null;
    let pickupAddress: string | null = null;

    if (pickupMode === 'branch') {
      if (!dto.pickupBranchId) {
        throw new BadRequestException('pickupBranchId is required when pickupMode is branch');
      }
      const branch = await this.prisma.companyBranch.findUnique({
        where: { id: dto.pickupBranchId },
      });
      if (!branch || !branch.isActive) {
        throw new BadRequestException('Selected pickup branch is invalid or inactive');
      }
      const branchSlots = Array.isArray(branch.pickupSlotsJson) ? branch.pickupSlotsJson as string[] : [];
      if (branchSlots.length > 0) {
        if (!dto.pickupTime) {
          throw new BadRequestException('Pickup time is required for selected branch');
        }
        const parsedPickup = new Date(dto.pickupTime);
        if (Number.isNaN(parsedPickup.getTime())) {
          throw new BadRequestException('Invalid pickupTime format');
        }
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Riyadh',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(parsedPickup);
        const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
        const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
        const hhmm = `${hh}:${mm}`;
        if (!branchSlots.includes(hhmm)) {
          throw new BadRequestException('Selected pickup time is not available in branch slots');
        }
      }
      pickupBranchId = branch.id;
      pickupAddress = (branch.addressAr || branch.addressEn || '').trim() || null;
    } else {
      if (allowCustomPickupTime && !dto.pickupTime) {
        throw new BadRequestException('Pickup time is required for this trip');
      }
      if (!allowCustomPickupTime && dto.pickupTime) {
        throw new BadRequestException('Pickup time cannot be set for this trip');
      }

      const userPickupAddress = (dto.pickupAddress || '').trim();
      if (!userPickupAddress) {
        throw new BadRequestException('pickupAddress is required when pickupMode is user_location');
      }
      pickupAddress = userPickupAddress;
    }

    if (!pickupAddress) {
      pickupAddress =
        (trip.pickupAddress || trip.route?.origin?.nameAr || trip.route?.origin?.nameEn || '').trim() || null;
    }

    // ── per_seat validation ──────────────────────────────────────────────────
    if (bookingMode === 'per_seat') {
      if (!dto.seatIds || dto.seatIds.length === 0) {
        throw new BadRequestException('Select at least one seat for per_seat trips');
      }
      if (dto.passengerCount !== dto.seatIds.length) {
        throw new BadRequestException(
          `Passenger count (${dto.passengerCount}) must match seat count (${dto.seatIds.length})`,
        );
      }
      if (dto.seatIds.length !== dto.passengers.length) {
        throw new BadRequestException(
          `Seat count (${dto.seatIds.length}) must match passenger count (${dto.passengers.length})`,
        );
      }

      // Validate all seatIds belong to this trip's car
      const carSeatIds = trip.car.seats.map((s) => s.id);
      const invalidSeats = dto.seatIds.filter((id) => !carSeatIds.includes(id));
      if (invalidSeats.length > 0) {
        throw new BadRequestException('One or more seat IDs do not belong to this trip\'s car');
      }

      if ((trip.availableSeats ?? 0) < dto.seatIds.length) {
        throw new BadRequestException(
          `Only ${trip.availableSeats} seat(s) available`,
        );
      }
    } else {
      if (dto.passengerCount !== dto.passengers.length) {
        throw new BadRequestException(
          `Passenger count (${dto.passengerCount}) must match passenger rows (${dto.passengers.length})`,
        );
      }
      if (trip.totalSeats != null && dto.passengerCount > trip.totalSeats) {
        throw new BadRequestException(
          `Passenger count (${dto.passengerCount}) exceeds trip car capacity (${trip.totalSeats})`,
        );
      }
    }

    // ── Pricing ──────────────────────────────────────────────────────────────
    const pricePerUnit =
      bookingMode === 'per_seat'
        ? Number(trip.pricePerSeat)
        : Number(trip.priceWholeCar);

    const seatCount = bookingMode === 'per_seat' ? dto.seatIds!.length : dto.passengerCount;
    const basePrice = bookingMode === 'per_seat' ? pricePerUnit * seatCount! : pricePerUnit;
    const seasonMultiplier = trip.season ? trip.season.priceMultiplier : 1;

    // Platform commission from config (default 10%)
    const commissionConfig = await this.prisma.platformConfig.findUnique({
      where: { key: 'platform_commission_rate' },
    });
    const commissionRate = commissionConfig ? parseFloat(commissionConfig.value) : 0.1;

    const totalPrice = basePrice; // price already includes season multiplier (set at trip creation)
    const platformFee = Math.round(totalPrice * commissionRate * 100) / 100;
    const driverPayout = Math.round((totalPrice - platformFee) * 100) / 100;

    // ── Transactional seat lock + booking creation ────────────────────────────
    return this.prisma.$transaction(async (tx) => {
      // Conflict check for per_seat — inside transaction for atomicity
      if (bookingMode === 'per_seat') {
        const conflicting = await tx.bookingSeat.findFirst({
          where: {
            carSeatId: { in: dto.seatIds },
            status: { not: 'cancelled' },
            booking: { tripId: dto.tripId, status: { not: 'cancelled' } },
          },
        });

        if (conflicting) {
          throw new BadRequestException(
            'One or more selected seats are already reserved. Please select different seats.',
          );
        }
      } else {
        // Whole-car trip can only have one active booking at a time.
        const activeBooking = await tx.booking.findFirst({
          where: {
            tripId: dto.tripId,
            status: { not: 'cancelled' },
          },
          select: { id: true },
        });
        if (activeBooking) {
          throw new BadRequestException(
            'This car has already been booked for the selected trip',
          );
        }
      }

      // Create booking
      const booking = await tx.booking.create({
        data: {
          riderId,
          tripId: dto.tripId,
          bookingMode,
          seatCount,
          basePrice,
          seasonMultiplier,
          platformFee,
          driverPayout,
          totalPrice,
          paymentMethod: dto.paymentMethod,
          pickupMode,
          pickupBranchId,
          pickupTime,
          pickupAddress,
          contactPhone: dto.contactPhone,
          paymentStatus: dto.paymentMethod === 'cash' ? 'pending' : 'pending',
          status: 'confirmed',
        },
      });

      // Create passengers
      const passengers = await Promise.all(
        dto.passengers.map((p) =>
          tx.passenger.create({
            data: {
              bookingId: booking.id,
              fullName: p.fullName,
              nationality: p.nationality,
              idNumber: p.idNumber,
              phone: p.phone,
            },
          }),
        ),
      );

      // Create booking seats (per_seat only)
      if (bookingMode === 'per_seat') {
        await Promise.all(
          dto.seatIds!.map((seatId, i) =>
            tx.bookingSeat.create({
              data: {
                bookingId: booking.id,
                carSeatId: seatId,
                passengerId: passengers[i].id,
                status: 'confirmed',
              },
            }),
          ),
        );

        // Decrement available seats
        await tx.trip.update({
          where: { id: dto.tripId },
          data: { availableSeats: { decrement: dto.seatIds!.length } },
        });
      }

      const created = await tx.booking.findUnique({
        where: { id: booking.id },
        include: BOOKING_INCLUDE,
      });
      // Best effort: automatically create required booking documents.
      // Failure here must not fail the booking itself.
      this.generateDefaultDocuments(booking.id, riderId).catch((err) => {
        this.logger.warn(
          `Auto document generation failed for booking ${booking.id}: ${err?.message ?? err}`,
        );
      });

      return this.withCancellationMeta(created, false);
    });
  }

  // ─── Create guest booking ────────────────────────────────────────────────────

  async createGuest(dto: CreateGuestBookingDto): Promise<{
    bookingId: string;
    referenceNumber: string;
    tripDetails: {
      originNameAr: string;
      destinationNameAr: string;
      departureAt: Date;
      driverName: string;
      vehiclePlate: string;
      carType: string;
    };
  }> {
    if (dto.passengerCount !== dto.passengers.length) {
      throw new BadRequestException('عدد المسافرين لا يتطابق مع البيانات المُدخلة');
    }

    const normalizedPhone = normalizeSaudiPhone(dto.riderPhone);

    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: {
        route: { include: { origin: true, destination: true } },
        driver: { include: { user: true } },
        car: true,
      },
    });

    if (!trip) throw new NotFoundException('الرحلة غير موجودة');
    if (trip.status !== 'scheduled') throw new BadRequestException('الرحلة غير متاحة للحجز');
    if (this.isTripServiceDateInPast(trip.departureAt)) {
      throw new BadRequestException('انطلقت الرحلة بالفعل');
    }
    if (trip.bookingMode !== 'whole_car') throw new BadRequestException('يدعم الحجز العام السيارة كاملة فقط');

    const basePrice = Number(trip.priceWholeCar ?? 0);
    const commissionConfig = await this.prisma.platformConfig.findUnique({
      where: { key: 'platform_commission_rate' },
    });
    const commissionRate = commissionConfig ? parseFloat(commissionConfig.value) : 0.1;
    const platformFee = Math.round(basePrice * commissionRate * 100) / 100;
    const driverPayout = basePrice - platformFee;

    const booking = await this.prisma.$transaction(async (tx) => {
      // Check inside transaction to prevent race condition
      const existingBooking = await tx.booking.findFirst({
        where: { tripId: dto.tripId, status: { not: 'cancelled' } },
      });
      if (existingBooking) throw new ConflictException('هذه الرحلة محجوزة بالفعل');

      const b = await tx.booking.create({
        data: {
          tripId: dto.tripId,
          riderName: dto.riderName,
          riderPhone: normalizedPhone,
          contactPhone: normalizedPhone,
          bookingMode: 'whole_car',
          seatCount: dto.passengerCount,
          basePrice,
          platformFee,
          driverPayout,
          totalPrice: basePrice,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'pending',
          status: 'confirmed',
          pickupMode: 'user_location',
          pickupAddress: dto.pickupAddress,
          passengers: {
            create: dto.passengers.map((p) => ({
              fullName: p.fullName,
              nationality: p.nationality,
              idNumber: p.idNumber,
              phone: normalizedPhone,
            })),
          },
        },
      });
      return b;
    });

    const referenceNumber = `AMS-${booking.bookingSerial.toString().padStart(6, '0')}`;

    // Fire-and-forget — do NOT await these; a WhatsApp failure must not fail the booking
    const notifyData = {
      referenceNumber,
      riderName: dto.riderName,
      riderPhone: normalizedPhone,
      originNameAr: trip.route.origin.nameAr,
      destinationNameAr: trip.route.destination.nameAr,
      departureAt: trip.departureAt,
      passengerCount: dto.passengerCount,
      passengers: dto.passengers,
      vehiclePlate: trip.car?.plateNumber ?? '',
      driverName: trip.driver?.user?.fullName ?? '',
    };

    this.pdfService.generateBookingManifest(notifyData).then((pdfBuffer) => {
      this.whatsappService.notifyAdmin({ ...notifyData, pdfBuffer }).catch(() => {});
    }).catch(() => {});

    this.whatsappService.notifyRider({
      riderPhone: normalizedPhone,
      riderName: dto.riderName,
      referenceNumber,
      originNameAr: trip.route.origin.nameAr,
      destinationNameAr: trip.route.destination.nameAr,
      departureAt: trip.departureAt,
      pickupAddress: dto.pickupAddress,
    }).catch(() => {});

    return {
      bookingId: booking.id,
      referenceNumber,
      tripDetails: {
        originNameAr: trip.route.origin.nameAr,
        destinationNameAr: trip.route.destination.nameAr,
        departureAt: trip.departureAt,
        driverName: trip.driver?.user?.fullName ?? '',
        vehiclePlate: trip.car?.plateNumber ?? '',
        carType: trip.car?.carType ?? '',
      },
    };
  }

  // ─── Get my bookings (rider) ──────────────────────────────────────────────────

  async findMyBookings(riderId: string) {
    const rows = await this.prisma.booking.findMany({
      where: { riderId },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((b) => this.withCancellationMeta(b, false));
  }

  // ─── Get one ──────────────────────────────────────────────────────────────────

  async findOne(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: BOOKING_INCLUDE,
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin' && booking.riderId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.withCancellationMeta(booking, user?.role === 'admin');
  }

  // ─── Admin: all bookings ──────────────────────────────────────────────────────

  async findAll(status?: string, tripId?: string) {
    const rows = await this.prisma.booking.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(tripId ? { tripId } : {}),
      },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((b) => this.withCancellationMeta(b, true));
  }

  // ─── Cancel booking ───────────────────────────────────────────────────────────

  async cancel(bookingId: string, userId: string, dto: CancelBookingDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && booking.riderId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Booking is already cancelled');
    }

    const cancellation = this.getCancellationContext(booking, isAdmin);
    if (!cancellation.canCancel) {
      throw new BadRequestException(cancellation.blockedReason ?? 'Booking cannot be cancelled');
    }
    const refundPercentage = cancellation.refundPercent;

    const paymentStatus =
      booking.paymentStatus === 'paid' && refundPercentage > 0
        ? 'refunded'
        : booking.paymentStatus;

    return this.prisma.$transaction(async (tx) => {
      // Cancel booking seats
      await tx.bookingSeat.updateMany({
        where: { bookingId },
        data: { status: 'cancelled' },
      });

      // Restore available seats for per_seat trips
      if (booking.bookingMode === 'per_seat' && booking.seatCount) {
        await tx.trip.update({
          where: { id: booking.tripId },
          data: { availableSeats: { increment: booking.seatCount } },
        });
      }

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          paymentStatus,
          cancellationReason: dto.cancellationReason ?? null,
          cancelledAt: new Date(),
        },
        include: BOOKING_INCLUDE,
      });

      return this.withCancellationMeta(updated, isAdmin);
    });
  }

  async markNoShow(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { driver: true } } },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    const isAssignedDriver = booking.trip.driver.userId === userId;
    if (!isAdmin && !isAssignedDriver) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cancelled booking cannot be marked as no-show');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'no_show' },
      include: BOOKING_INCLUDE,
    });

    return this.withCancellationMeta(updated, isAdmin);
  }

  async updatePassengers(bookingId: string, userId: string, dto: UpdateBookingPassengersDto) {
    if (dto.passengers.length !== dto.passengerCount) {
      throw new BadRequestException('passengers length must match passengerCount');
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { trip: { include: { driver: true } } },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    const isAssignedDriver = booking.trip.driver.userId === userId;
    if (!isAdmin && !isAssignedDriver) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot update passengers for cancelled booking');
    }
    if (booking.bookingMode !== 'whole_car') {
      throw new BadRequestException('Passenger manifest updates are supported for whole-car bookings only');
    }
    if (booking.trip.totalSeats != null && dto.passengerCount > booking.trip.totalSeats) {
      throw new BadRequestException(
        `Passenger count (${dto.passengerCount}) exceeds trip car capacity (${booking.trip.totalSeats})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.passenger.deleteMany({ where: { bookingId } });
      await tx.passenger.createMany({
        data: dto.passengers.map((p) => ({
          bookingId,
          fullName: p.fullName,
          nationality: p.nationality,
          idNumber: p.idNumber,
          phone: p.phone,
        })),
      });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { seatCount: dto.passengerCount },
        include: BOOKING_INCLUDE,
      });

      return this.withCancellationMeta(updated, isAdmin);
    });
  }

  private isTripServiceDateInPast(departureAt: Date): boolean {
    const toDateOnly = (d: Date) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);

    const tripDate = toDateOnly(departureAt);
    const today = toDateOnly(new Date());
    return tripDate < today;
  }
}
