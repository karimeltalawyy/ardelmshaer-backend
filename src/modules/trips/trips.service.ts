import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CreateDriverBookingDto } from './dto/create-driver-booking.dto';
import { CreateAdminDriverBookingDto } from './dto/create-admin-driver-booking.dto';
import { SearchTripsDto } from './dto/search-trips.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripStockQueryDto } from './dto/trip-stock-query.dto';
import { PublishTripStockDto } from './dto/publish-trip-stock.dto';
import { calculatePrice } from '../../common/utils/price-calculator.util';
import { ensureCarTypeConfig } from '../../common/utils/car-type-config.util';

// Relations included on every trip response
const TRIP_INCLUDE = {
  driver: {
    include: { user: { select: { fullName: true, phone: true } } },
  },
  car: true,
  route: {
    include: {
      origin: { select: { id: true, nameAr: true, nameEn: true, type: true } },
      destination: { select: { id: true, nameAr: true, nameEn: true, type: true } },
    },
  },
  season: { select: { id: true, nameEn: true, nameAr: true, priceMultiplier: true } },
  cancellationPolicy: {
    select: { id: true, hoursBeforeTrip: true, refundPercentage: true, descriptionAr: true, descriptionEn: true },
  },
} as const;

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  private mapTripBookingsForDriver(
    bookings: Array<{
      id: string;
      status: string;
      paymentStatus: string;
      paymentMethod: string;
      totalPrice: any;
      passengers: Array<{
        fullName: string;
        nationality: string;
        idNumber: string;
        phone: string;
      }>;
      documents: Array<{ type: string }>;
    }>,
  ) {
    return bookings.map((booking) => {
      const passengerManifestGenerationCount = booking.documents.filter(
        (doc) => doc.type === 'passenger_manifest',
      ).length;
      const contractGenerationCount = booking.documents.filter(
        (doc) => doc.type === 'contract',
      ).length;

      return {
        id: booking.id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        totalPrice: Number(booking.totalPrice),
        passengerManifestGenerationCount,
        contractGenerationCount,
        passengers: booking.passengers.map((passenger) => ({
          fullName: passenger.fullName,
          nationality: passenger.nationality,
          idNumber: passenger.idNumber,
          phone: passenger.phone,
        })),
      };
    });
  }

  private presentTrip<T extends Record<string, any>>(trip: T) {
    const {
      bookingMode: _bookingMode,
      pricePerSeat: _pricePerSeat,
      priceWholeCar,
      availableSeats: _availableSeats,
      ...rest
    } = trip;

    return {
      ...rest,
      price: priceWholeCar != null ? Number(priceWholeCar) : null,
    };
  }

  private buildSaudiDayRange(departureDate: string): { gte: Date; lt: Date } {
    if (!departureDate.includes('T')) {
      // Saudi Arabia is UTC+3 (no DST). Treat date-only filters as Saudi calendar day.
      const parts = departureDate.split('-').map(Number);
      if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) {
        throw new BadRequestException('Invalid departureDate format');
      }

      const [year, month, day] = parts;
      const startUtc = new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
      const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

      return { gte: startUtc, lt: endUtc };
    }

    // Fallback for full ISO datetime inputs.
    const date = new Date(departureDate);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid departureDate format');
    }

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return { gte: date, lt: nextDay };
  }

  // ─── Create trip ──────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateTripDto) {
    // Validate car belongs to an approved driver
    const car = await this.prisma.car.findUnique({
      where: { id: dto.carId },
      include: {
        driver: true,
        seats: true,
      },
    });

    if (!car) throw new NotFoundException('Car not found');
    if (car.status !== 'active') throw new BadRequestException('Car is not active');
    if (car.driver.userId !== userId) {
      // Allow admin to create trips for any driver
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'admin') throw new ForbiddenException('You do not own this car');
    }

    // Validate route
    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
      include: {
        origin: { select: { nameAr: true, nameEn: true } },
      },
    });
    if (!route || !route.isActive) throw new NotFoundException('Route not found or inactive');

    await ensureCarTypeConfig(this.prisma, car.carType);

    // Calculate price from route pricing + active season
    const priceData = await calculatePrice(this.prisma, dto.routeId, car.carType);

    const price = dto.price ?? priceData?.finalPrice ?? null;
    if (!price) {
      throw new BadRequestException(
        'No pricing found for this route + car type. Set pricing first or provide price manually.',
      );
    }

    const allowCustomPickupTime = dto.allowCustomPickupTime ?? false;
    const allowRiderCancellation = dto.allowRiderCancellation ?? true;
    const cancellationCutoffHours =
      allowRiderCancellation ? (dto.cancellationCutoffHours ?? null) : null;
    let cancellationPolicyId: string | null =
      allowRiderCancellation ? (dto.cancellationPolicyId ?? null) : null;

    if (!allowRiderCancellation) {
      cancellationPolicyId = null;
    } else if (cancellationPolicyId) {
      const policy = await this.prisma.cancellationPolicy.findUnique({
        where: { id: cancellationPolicyId },
      });
      if (!policy || !policy.isActive) {
        throw new BadRequestException('Selected cancellation policy is invalid or inactive');
      }
    }

    const pickupAddress = (dto.pickupAddress || route.origin?.nameAr || route.origin?.nameEn || '').trim() || null;

    const trip = await this.prisma.trip.create({
      data: {
        driverId: car.driver.id,
        carId: dto.carId,
        routeId: dto.routeId,
        seasonId: priceData?.seasonId ?? null,
        createdBy: userId,
        departureAt: new Date(dto.departureAt),
        bookingMode: 'whole_car',
        priceWholeCar: price,
        totalSeats: car.totalSeats,
        availableSeats: car.totalSeats,
        allowCustomPickupTime,
        allowRiderCancellation,
        cancellationPolicyId,
        cancellationCutoffHours,
        pickupAddress,
        status: 'scheduled',
      },
      include: TRIP_INCLUDE,
    });

    return this.presentTrip(trip);
  }

  // ─── Search trips (public) ────────────────────────────────────────────────────

  async search(dto: SearchTripsDto) {
    const where: any = {
      AND: [
        {
          // Rider search should return only bookable trips.
          // Ongoing trips are hidden from customer search.
          status: 'scheduled',
        },
        {
          bookings: {
            none: { status: { not: 'cancelled' } },
          },
        },
      ],
    };

    if (dto.routeId) {
      where.routeId = dto.routeId;
    } else if (dto.originId || dto.destinationId) {
      where.route = {};
      if (dto.originId) where.route.originId = dto.originId;
      if (dto.destinationId) where.route.destinationId = dto.destinationId;
    }

    if (dto.carType) {
      where.car = { carType: dto.carType };
    }

    if (dto.departureDate) {
      where.departureAt = this.buildSaudiDayRange(dto.departureDate);
    } else {
      // Without explicit date, keep only future scheduled trips.
      where.AND.push({ departureAt: { gte: new Date() } });
    }

    const trips = await this.prisma.trip.findMany({
      where,
      include: TRIP_INCLUDE,
      orderBy: { departureAt: 'asc' },
    });

    return trips.map((trip) => this.presentTrip(trip));
  }

  // ─── Get one ──────────────────────────────────────────────────────────────────

  async findOne(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        ...TRIP_INCLUDE,
        car: true,
        bookings: {
          where: { status: { not: 'cancelled' } },
          include: {
            passengers: true,
            documents: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    return {
      ...this.presentTrip(trip),
      bookings: this.mapTripBookingsForDriver(trip.bookings),
    };
  }

  // ─── Driver's trips ───────────────────────────────────────────────────────────

  // ─── Driver: create trip + booking in one shot ────────────────────────────────

  async createDriverBooking(userId: string, dto: CreateDriverBookingDto) {
    // 1. Get driver profile + first active car
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { cars: { where: { status: 'active' }, take: 1 } },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    if (driver.approvalStatus !== 'approved') throw new BadRequestException('Driver account is not approved');
    const car = driver.cars[0];
    if (!car) throw new BadRequestException('No active car assigned to this driver');

    // 2. Find or auto-create route — drivers may issue manifests for any origin/destination pair
    let route = await this.prisma.route.findFirst({
      where: { originId: dto.originId, destinationId: dto.destinationId },
    });
    if (!route) {
      route = await this.prisma.route.create({
        data: { originId: dto.originId, destinationId: dto.destinationId, estimatedDurationMin: 0 },
      });
    }

    // 3. Calculate price
    const priceData = await calculatePrice(this.prisma, route.id, car.carType);
    const priceWholeCar = priceData?.finalPrice ?? 0;

    // 4. Create trip
    const trip = await this.prisma.trip.create({
      data: {
        driverId: driver.id,
        carId: car.id,
        routeId: route.id,
        departureAt: new Date(dto.departureAt),
        bookingMode: 'whole_car',
        priceWholeCar,
        status: 'scheduled',
        allowCustomPickupTime: false,
        allowRiderCancellation: false,
        createdBy: userId,
      },
    });

    // 5. Create booking with passengers
    const booking = await this.prisma.booking.create({
      data: {
        tripId: trip.id,
        riderId: userId,
        seatCount: dto.passengerCount,
        contactPhone: dto.contactPhone,
        paymentMethod: (dto.paymentMethod ?? 'cash') as any,
        paymentStatus: 'pending',
        status: 'confirmed',
        bookingMode: 'whole_car',
        basePrice: priceWholeCar,
        seasonMultiplier: 1.0,
        totalPrice: priceWholeCar,
        platformFee: 0,
        driverPayout: priceWholeCar,
        passengers: {
          create: dto.passengers.map((p) => ({
            fullName: p.fullName,
            nationality: p.nationality,
            idNumber: p.idNumber ?? '',
            phone: p.phone ?? '',
          })),
        },
      },
      include: {
        passengers: true,
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true } },
                destination: { select: { nameAr: true } },
              },
            },
          },
        },
      },
    });

    return { trip: this.presentTrip(trip), booking };
  }

  async createAdminDriverBooking(userId: string, dto: CreateAdminDriverBookingDto) {
    const car = await this.prisma.car.findUnique({
      where: { id: dto.carId },
      include: {
        driver: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
    });

    if (!car) throw new NotFoundException('Car not found');
    if (car.status !== 'active') throw new BadRequestException('Selected car is not active');
    if (!car.driver || car.driver.approvalStatus !== 'approved') {
      throw new BadRequestException('Selected car does not have an approved driver assigned');
    }

    // For admin manifests the price is set manually, so we don't need an active
    // route with pricing. Try both directions; create a route on-the-fly if none exists.
    const routeInclude = {
      origin: { select: { nameAr: true, nameEn: true } },
      destination: { select: { nameAr: true, nameEn: true } },
    } as const;

    let route = await this.prisma.route.findFirst({
      where: {
        OR: [
          { originId: dto.originId, destinationId: dto.destinationId },
          { originId: dto.destinationId, destinationId: dto.originId },
        ],
      },
      include: routeInclude,
    });

    if (!route) {
      route = await this.prisma.route.create({
        data: {
          originId: dto.originId,
          destinationId: dto.destinationId,
          estimatedDurationMin: 0,
          isActive: false,
        },
        include: routeInclude,
      });
    }

    const priceData = await calculatePrice(this.prisma, route.id, car.carType);
    const seasonId = priceData?.seasonId ?? null;
    const tripPrice = Number(dto.price);

    const trip = await this.prisma.trip.create({
      data: {
        driverId: car.driver.id,
        carId: car.id,
        routeId: route.id,
        seasonId,
        departureAt: new Date(dto.departureAt),
        bookingMode: 'whole_car',
        priceWholeCar: tripPrice,
        totalSeats: car.totalSeats,
        availableSeats: car.totalSeats,
        status: 'scheduled',
        allowCustomPickupTime: false,
        allowRiderCancellation: false,
        pickupAddress: (route.origin.nameAr || route.origin.nameEn || '').trim() || null,
        createdBy: userId,
      },
      include: TRIP_INCLUDE,
    });

    const booking = await this.prisma.booking.create({
      data: {
        riderId: userId,
        riderName: car.driver.user.fullName,
        riderPhone: dto.contactPhone,
        tripId: trip.id,
        seatCount: dto.passengerCount,
        contactPhone: dto.contactPhone,
        paymentMethod: (dto.paymentMethod ?? 'cash') as any,
        paymentStatus: 'pending',
        status: 'confirmed',
        bookingMode: 'whole_car',
        basePrice: tripPrice,
        seasonMultiplier: 1.0,
        totalPrice: tripPrice,
        platformFee: 0,
        driverPayout: tripPrice,
        originId: dto.originId,
        destinationId: dto.destinationId,
        requestedDate: new Date(dto.departureAt),
        carTypePreference: car.carType,
        passengers: {
          create: dto.passengers.map((p) => ({
            fullName: p.fullName,
            nationality: p.nationality,
            idNumber: p.idNumber ?? '',
            phone: p.phone ?? '',
          })),
        },
      },
      include: {
        passengers: true,
        trip: {
          include: {
            route: {
              include: {
                origin: { select: { nameAr: true } },
                destination: { select: { nameAr: true } },
              },
            },
            car: { select: { brand: true, model: true, plateNumber: true, carType: true } },
            driver: { include: { user: { select: { fullName: true, phone: true } } } },
          },
        },
      },
    });

    return { trip: this.presentTrip(trip), booking };
  }

  async findMyTrips(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driver) return [];

    const trips = await this.prisma.trip.findMany({
      where: { driverId: driver.id },
      include: TRIP_INCLUDE,
      orderBy: { departureAt: 'desc' },
    });

    return trips.map((trip) => this.presentTrip(trip));
  }

  // ─── Admin: all trips ─────────────────────────────────────────────────────────

  async findAll(status?: string) {
    const trips = await this.prisma.trip.findMany({
      where: status ? { status: status as any } : undefined,
      include: TRIP_INCLUDE,
      orderBy: { departureAt: 'desc' },
    });

    return trips.map((trip) => this.presentTrip(trip));
  }

  async getDailyStock(dto: TripStockQueryDto) {
    const route = await this.prisma.route.findUnique({
      where: { id: dto.routeId },
      include: {
        origin: { select: { nameAr: true, nameEn: true } },
        destination: { select: { nameAr: true, nameEn: true } },
      },
    });

    if (!route || !route.isActive) {
      throw new NotFoundException('Route not found or inactive');
    }

    const dayRange = this.buildSaudiDayRange(dto.departureDate);

    const cars = await this.prisma.car.findMany({
      where: {
        status: 'active',
        driver: { approvalStatus: 'approved' },
      },
      include: {
        driver: { include: { user: { select: { fullName: true, phone: true } } } },
      },
      orderBy: { plateNumber: 'asc' },
    });

    const carIds = cars.map((c) => c.id);
    if (carIds.length === 0) {
      return {
        route: {
          id: route.id,
          origin: route.origin,
          destination: route.destination,
        },
        departureDate: dto.departureDate,
        summary: { totalCars: 0, availableCars: 0, publishedCars: 0, busyCars: 0 },
        stock: [],
      };
    }

    const dayTrips = await this.prisma.trip.findMany({
      where: {
        carId: { in: carIds },
        departureAt: dayRange,
        status: { in: ['scheduled', 'in_progress'] },
      },
      include: {
        route: {
          include: {
            origin: { select: { nameAr: true } },
            destination: { select: { nameAr: true } },
          },
        },
      },
      orderBy: { departureAt: 'asc' },
    });

    const tripByCar = new Map<string, (typeof dayTrips)[number]>();
    for (const trip of dayTrips) {
      if (!tripByCar.has(trip.carId)) tripByCar.set(trip.carId, trip);
    }

    const stock = cars.map((car) => {
      const trip = tripByCar.get(car.id);
      const publishedOnThisRoute = !!trip && trip.routeId === dto.routeId;
      const busyOnOtherRoute = !!trip && trip.routeId !== dto.routeId;

      const status = publishedOnThisRoute
        ? 'published'
        : busyOnOtherRoute
          ? 'busy'
          : 'available';

      return {
        carId: car.id,
        carType: car.carType,
        plateNumber: car.plateNumber,
        brand: car.brand,
        model: car.model,
        totalSeats: car.totalSeats,
        hasSeatMap: false,
        driver: {
          id: car.driver.id,
          fullName: car.driver.user.fullName,
          phone: car.driver.user.phone,
        },
        status,
        trip: trip
          ? {
              id: trip.id,
              routeId: trip.routeId,
              routeLabel: `${trip.route.origin.nameAr} ← ${trip.route.destination.nameAr}`,
              departureAt: trip.departureAt,
              tripStatus: trip.status,
            }
          : null,
      };
    });

    return {
      route: {
        id: route.id,
        origin: route.origin,
        destination: route.destination,
      },
      departureDate: dto.departureDate,
      summary: {
        totalCars: stock.length,
        availableCars: stock.filter((i) => i.status === 'available').length,
        publishedCars: stock.filter((i) => i.status === 'published').length,
        busyCars: stock.filter((i) => i.status === 'busy').length,
      },
      stock,
    };
  }

  async publishFromStock(userId: string, dto: PublishTripStockDto) {
    const route = await this.prisma.route.findUnique({ where: { id: dto.routeId } });
    if (!route || !route.isActive) {
      throw new NotFoundException('Route not found or inactive');
    }

    const publishDate = new Date(dto.departureAt);
    if (Number.isNaN(publishDate.getTime())) {
      throw new BadRequestException('Invalid departureAt');
    }

    // Reuse Saudi day for "single daily stock" conflict checks.
    const saudiDate = new Date(publishDate.getTime() + 3 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const dayRange = this.buildSaudiDayRange(saudiDate);

    const created: any[] = [];
    const skipped: { carId: string; reason: string }[] = [];

    for (const carId of dto.carIds) {
      const car = await this.prisma.car.findUnique({
        where: { id: carId },
        include: {
          driver: true,
        },
      });

      if (!car) {
        skipped.push({ carId, reason: 'Car not found' });
        continue;
      }

      if (car.status !== 'active') {
        skipped.push({ carId, reason: 'Car is not active' });
        continue;
      }

      const driver = await this.prisma.driverProfile.findUnique({
        where: { id: car.driverId },
      });
      if (!driver || driver.approvalStatus !== 'approved') {
        skipped.push({ carId, reason: 'Driver is not approved' });
        continue;
      }

      const conflict = await this.prisma.trip.findFirst({
        where: {
          carId,
          departureAt: dayRange,
          status: { in: ['scheduled', 'in_progress'] },
        },
      });
      if (conflict) {
        skipped.push({ carId, reason: 'Car already has a trip on this service day' });
        continue;
      }

      try {
        const trip = await this.create(userId, {
          carId,
          routeId: dto.routeId,
          departureAt: dto.departureAt,
          price: dto.price,
          allowCustomPickupTime: false,
        });
        created.push(trip);
      } catch (error: any) {
        skipped.push({
          carId,
          reason: error?.message || 'Failed to publish trip for this car',
        });
      }
    }

    return {
      routeId: dto.routeId,
      departureAt: dto.departureAt,
      requested: dto.carIds.length,
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
    };
  }

  // ─── Update status ────────────────────────────────────────────────────────────

  async updateStatus(tripId: string, userId: string, dto: UpdateTripStatusDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { driver: true },
    });

    if (!trip) throw new NotFoundException('Trip not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === 'admin';
    const isOwner = trip.driver.userId === userId;

    if (!isAdmin && !isOwner) throw new ForbiddenException('Access denied');

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      scheduled:    ['in_progress', 'cancelled'],
      in_progress:  ['completed', 'cancelled'],
      completed:    [],
      cancelled:    [],
    };

    if (!validTransitions[trip.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from "${trip.status}" to "${dto.status}"`,
      );
    }

    const updatedTrip = await this.prisma.trip.update({
      where: { id: tripId },
      data: { status: dto.status },
      include: TRIP_INCLUDE,
    });

    return this.presentTrip(updatedTrip);
  }

  // ─── Cancel trip (convenience) ────────────────────────────────────────────────

  async cancel(tripId: string, userId: string) {
    return this.updateStatus(tripId, userId, { status: 'cancelled' });
  }

  // ─── Hard-delete trip (admin only) ────────────────────────────────────────────

  async hardDelete(tripId: string): Promise<void> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Trip not found');

    await this.prisma.$transaction([
      this.prisma.booking.updateMany({
        where: { tripId },
        data: { tripId: null },
      }),
      this.prisma.trip.delete({ where: { id: tripId } }),
    ]);
  }
}
