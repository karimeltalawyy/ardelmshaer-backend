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
import { FulfillRequestDto } from './dto/fulfill-request.dto';
import { DocumentsService } from '../documents/documents.service';
import { PdfService } from '../pdf/pdf.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { normalizeSaudiPhone } from '../../common/validators/is-saudi-phone.validator';
import { PickupMode } from '@prisma/client';

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
  origin: { select: { nameAr: true, nameEn: true } },
  destination: { select: { nameAr: true, nameEn: true } },
  passengers: true,
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
    const docs: Array<'passenger_manifest' | 'contract'> = ['passenger_manifest', 'contract'];
    const tasks = docs.map((docType) =>
      this.documentsService.generate(bookingId, userId, docType),
    );
    await Promise.allSettled(tasks);
  }

  private calcHoursUntilDeparture(departureAt: Date): number {
    return (departureAt.getTime() - Date.now()) / (1000 * 60 * 60);
  }

  private getCancellationContext(booking: any, isAdmin: boolean) {
    if (!booking.trip) {
      return {
        canCancel: false,
        blockedReason: 'طلب الحجز لم يُربط برحلة بعد',
        refundPercent: 0,
        estimatedRefundAmount: 0,
        allowRiderCancellation: false,
        cancellationCutoffHours: null,
        policy: null,
      };
    }
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

    const basePrice = Number(trip.priceWholeCar);
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
    const result = await this.prisma.$transaction(async (tx) => {
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

      // Create booking
      const booking = await tx.booking.create({
        data: {
          riderId,
          tripId: dto.tripId,
          bookingMode: 'whole_car',
          seatCount: dto.passengerCount,
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

      return created;
    });

    // Notify the rider immediately (fire-and-forget). The booking is against an
    // already-scheduled trip, so route/date/pickup are known — mirrors assignTrip().
    // A WhatsApp failure must never fail the booking.
    const riderPhone = (result as any)?.riderPhone || result?.contactPhone;
    if (riderPhone) {
      const reference = `AMS-${result!.bookingSerial.toString().padStart(6, '0')}`;
      const pickupAddr =
        result!.pickupMode === PickupMode.user_location
          ? (result!.pickupAddress ?? '')
          : (result!.pickupBranch?.addressAr ?? '');
      this.whatsappService.notifyRider({
        riderPhone,
        riderName: (result as any)?.riderName || 'العميل',
        referenceNumber: reference,
        originNameAr: result!.trip?.route?.origin?.nameAr ?? '',
        destinationNameAr: result!.trip?.route?.destination?.nameAr ?? '',
        departureAt: result!.trip?.departureAt ?? new Date(),
        pickupAddress: pickupAddr,
      }).catch(() => {});
    }

    return this.withCancellationMeta(result, false);
  }

  // ─── Create guest booking (demand-driven request) ───────────────────────────

  async createGuest(dto: CreateGuestBookingDto): Promise<{
    id: string;
    reference: string;
    originName: string;
    destinationName: string;
    requestedDate: string;
    carTypePreference: string;
    totalPrice: number;
  }> {
    if (dto.passengerCount !== dto.passengers.length) {
      throw new BadRequestException('عدد المسافرين لا يتطابق مع البيانات المُدخلة');
    }
    const [origin, destination] = await Promise.all([
      this.prisma.destination.findUnique({ where: { id: dto.originId } }),
      this.prisma.destination.findUnique({ where: { id: dto.destinationId } }),
    ]);
    if (!origin) throw new NotFoundException('نقطة الانطلاق غير موجودة');
    if (!destination) throw new NotFoundException('الوجهة غير موجودة');

    const route = await this.prisma.route.findUnique({
      where: {
        originId_destinationId: {
          originId: dto.originId,
          destinationId: dto.destinationId,
        },
      },
    });

    const pricing = route
      ? await this.prisma.routePricing.findFirst({
          where: { routeId: route.id, carType: dto.carTypePreference, isActive: true },
        })
      : null;

    const actualPrice = pricing?.basePrice ?? 0;

    const booking = await this.prisma.booking.create({
      data: {
        bookingMode:       'whole_car',
        basePrice:         actualPrice,
        platformFee:       0,
        driverPayout:      0,
        totalPrice:        actualPrice,
        paymentMethod:     'cash',
        paymentStatus:     'pending',
        status:            'confirmed',
        pickupMode:        'user_location',
        contactPhone:      dto.contactPhone,
        seatCount:         dto.passengerCount,
        originId:          dto.originId,
        destinationId:     dto.destinationId,
        requestedDate:     new Date(dto.requestedDate),
        carTypePreference: dto.carTypePreference,
        passengers: {
          create: dto.passengers.map((p) => ({
            fullName:    p.fullName,
            nationality: p.nationality,
            idNumber:    p.idNumber,
            phone:       p.phone,
          })),
        },
      },
    });

    const reference = `AMS-${booking.bookingSerial.toString().padStart(6, '0')}`;

    // Fire-and-forget — WhatsApp failure must not fail the booking
    this.whatsappService.notifyAdminBookingRequest({
      referenceNumber:   reference,
      contactPhone:      dto.contactPhone,
      originNameAr:      origin.nameAr,
      destinationNameAr: destination.nameAr,
      requestedDate:     dto.requestedDate,
      carTypePreference: dto.carTypePreference,
      passengerCount:    dto.passengerCount,
      passengers:        dto.passengers,
    }).catch(() => {});

    // Confirm to the rider immediately. The company commits to fulfilling the
    // trip even before a specific car/driver is assigned, so we send the
    // approved ams_booking_confirmed template right away. Pickup is coordinated
    // afterwards, so we send a placeholder for the (required) pickup field.
    this.whatsappService.notifyRider({
      riderPhone:        dto.contactPhone,
      riderName:         dto.passengers[0]?.fullName || 'العميل',
      referenceNumber:   reference,
      originNameAr:      origin.nameAr,
      destinationNameAr: destination.nameAr,
      departureAt:       new Date(dto.requestedDate),
      pickupAddress:     'سيتم التنسيق معكم لتحديد مكان الإقلاع',
    }).catch(() => {});

    return {
      id:                booking.id,
      reference,
      originName:        origin.nameAr,
      destinationName:   destination.nameAr,
      requestedDate:     dto.requestedDate,
      carTypePreference: dto.carTypePreference,
      totalPrice:        Number(actualPrice),
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
      await tx.bookingSeat.updateMany({
        where: { bookingId },
        data: { status: 'cancelled' },
      });

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
    if (!booking.trip) throw new BadRequestException('لا يمكن تطبيق هذا الإجراء على طلب لم يُربط برحلة');

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
    if (!booking.trip) throw new BadRequestException('لا يمكن تعديل ركاب طلب لم يُربط برحلة');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    const isAssignedDriver = booking.trip.driver.userId === userId;
    if (!isAdmin && !isAssignedDriver) {
      throw new ForbiddenException('Access denied');
    }

    if (booking.status === 'cancelled') {
      throw new BadRequestException('Cannot update passengers for cancelled booking');
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

  async fulfillRequest(bookingId: string, dto: FulfillRequestDto, adminUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.tripId) throw new BadRequestException('الطلب مرتبط برحلة بالفعل');
    if (!booking.originId || !booking.destinationId)
      throw new BadRequestException('الطلب لا يحتوي على وجهة محددة');

    let route = await this.prisma.route.findFirst({
      where: { originId: booking.originId, destinationId: booking.destinationId },
    });
    if (!route) {
      route = await this.prisma.route.create({
        data: {
          originId: booking.originId,
          destinationId: booking.destinationId,
          estimatedDurationMin: 0,
        },
      });
    }

    const car = await this.prisma.car.findUnique({ where: { id: dto.carId } });
    if (!car) throw new NotFoundException('Car not found');
    if (car.status !== 'active') throw new BadRequestException('المركبة غير نشطة');

    const departureAt = new Date(dto.departureAt);

    const result = await this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          carId: dto.carId,
          driverId: car.driverId,
          routeId: route.id,
          departureAt,
          createdBy: adminUserId,
          bookingMode: 'whole_car',
          totalSeats: car.totalSeats,
          availableSeats: car.totalSeats,
          allowRiderCancellation: false,
          status: 'scheduled',
        },
      });

      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: { tripId: trip.id, status: 'confirmed' },
        include: BOOKING_INCLUDE,
      });

      return this.withCancellationMeta(updated, true);
    });

    const b = result as any;
    const riderPhone = b.riderPhone || b.contactPhone;
    if (riderPhone) {
      const reference = `AMS-${b.bookingSerial?.toString().padStart(6, '0')}`;
      const pickupAddress = b.pickupMode === PickupMode.user_location
        ? (b.pickupAddress ?? '')
        : (b.pickupBranch?.addressAr ?? '');
      this.whatsappService.notifyRider({
        riderPhone,
        riderName: b.riderName || 'العميل',
        referenceNumber: reference,
        originNameAr: b.trip?.route?.origin?.nameAr ?? '',
        destinationNameAr: b.trip?.route?.destination?.nameAr ?? '',
        departureAt,
        pickupAddress,
      }).catch(() => {});
    }

    return result;
  }

  async assignTrip(bookingId: string, tripId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.tripId) throw new BadRequestException('هذا الحجز مرتبط برحلة بالفعل');

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');
    if (trip.status !== 'scheduled') throw new BadRequestException('يمكن الربط بالرحلات المجدولة فقط');

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { tripId, status: 'confirmed' },
      include: BOOKING_INCLUDE,
    });

    const riderPhone = updated.riderPhone || updated.contactPhone;
    if (riderPhone) {
      const reference = `AMS-${updated.bookingSerial.toString().padStart(6, '0')}`;
      const pickupAddress = updated.pickupMode === PickupMode.user_location
        ? (updated.pickupAddress ?? '')
        : (updated.pickupBranch?.addressAr ?? '');
      this.whatsappService.notifyRider({
        riderPhone,
        riderName: updated.riderName || 'العميل',
        referenceNumber: reference,
        originNameAr: updated.trip?.route?.origin?.nameAr ?? '',
        destinationNameAr: updated.trip?.route?.destination?.nameAr ?? '',
        departureAt: updated.trip?.departureAt ?? new Date(),
        pickupAddress,
      }).catch(() => {});
    }

    return this.withCancellationMeta(updated, true);
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
