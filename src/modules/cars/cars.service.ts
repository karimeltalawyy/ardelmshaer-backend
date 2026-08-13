import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { ensureAllCarTypeConfigs } from '../../common/utils/car-type-config.util';
import { CarType } from '@prisma/client';
import { CAR_CATALOG } from './car-catalog.data';

@Injectable()
export class CarsService {
  constructor(private prisma: PrismaService) {}

  // ─── Car Type Configs ─────────────────────────────────────────────────────────

  async getCarTypes() {
    await ensureAllCarTypeConfigs(this.prisma);
    return this.prisma.carTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { carType: 'asc' },
    });
  }

  async getCatalog(carType?: CarType) {
    if (carType) {
      return { carType, brands: CAR_CATALOG[carType] ?? [] };
    }

    return Object.entries(CAR_CATALOG).map(([type, brands]) => ({
      carType: type,
      brands,
    }));
  }

  // ─── Create car ───────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateCarDto) {
    const admin = await this.prisma.user.findUnique({ where: { id: userId } });
    if (admin?.role !== 'admin') {
      throw new ForbiddenException('Only admin can create cars');
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { id: dto.driverId },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found');
    if (driverProfile.approvalStatus !== 'approved') {
      throw new ForbiddenException('Car can only be assigned to an approved driver');
    }

    // Verify car type exists and is active
    const carTypeConfig = await this.prisma.carTypeConfig.findUnique({
      where: { carType: dto.carType },
    });
    if (!carTypeConfig || !carTypeConfig.isActive) {
      throw new BadRequestException(`Car type "${dto.carType}" is not available`);
    }

    const existing = await this.prisma.car.findUnique({
      where: { plateNumber: dto.plateNumber },
    });
    if (existing) {
      // Deactivating a car keeps the row (and its unique plate), so re-adding the
      // same plate fails here. Say so explicitly instead of "already registered",
      // which reads like the create silently did nothing.
      throw new ConflictException(
        existing.status === 'inactive'
          ? 'Plate number belongs to a deactivated car — reactivate that car instead of creating a new one'
          : 'Plate number already registered',
      );
    }

    return this.prisma.car.create({
      data: {
        driverId: driverProfile.id,
        carType: dto.carType,
        plateNumber: dto.plateNumber,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        totalSeats: dto.totalSeats,
        status: 'active',
      },
      include: { seats: true },
    });
  }

  // ─── My cars (driver) ─────────────────────────────────────────────────────────

  async findMyCars(userId: string) {
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!driverProfile) return [];

    return this.prisma.car.findMany({
      where: { driverId: driverProfile.id },
      include: { seats: true },
      orderBy: { status: 'asc' },
    });
  }

  // ─── Get one ──────────────────────────────────────────────────────────────────

  async findOne(carId: string) {
    const car = await this.prisma.car.findUnique({
      where: { id: carId },
      include: {
        seats: { orderBy: { seatCode: 'asc' } },
        driver: { include: { user: { select: { fullName: true, phone: true } } } },
      },
    });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  // ─── Admin: all cars ──────────────────────────────────────────────────────────

  async findAll(carType?: string, status?: string) {
    return this.prisma.car.findMany({
      where: {
        ...(carType ? { carType: carType as any } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        seats: false,
        driver: { include: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { status: 'asc' },
    });
  }

  // ─── Update car ───────────────────────────────────────────────────────────────

  async update(carId: string, userId: string, dto: UpdateCarDto) {
    await this.assertCarManager(carId, userId);

    if (dto.carType) {
      const carTypeConfig = await this.prisma.carTypeConfig.findUnique({
        where: { carType: dto.carType },
      });
      if (!carTypeConfig || !carTypeConfig.isActive) {
        throw new BadRequestException(`Car type "${dto.carType}" is not available`);
      }
    }

    if (dto.plateNumber) {
      const conflict = await this.prisma.car.findFirst({
        where: { plateNumber: dto.plateNumber, NOT: { id: carId } },
      });
      if (conflict) throw new ConflictException('Plate number already in use');
    }

    if (dto.driverId) {
      const targetDriver = await this.prisma.driverProfile.findUnique({
        where: { id: dto.driverId },
      });
      if (!targetDriver) throw new NotFoundException('Driver profile not found');
      if (targetDriver.approvalStatus !== 'approved') {
        throw new ForbiddenException('Car can only be assigned to an approved driver');
      }
    }

    return this.prisma.car.update({
      where: { id: carId },
      data: dto,
      include: { seats: true },
    });
  }

  // ─── Deactivate car ───────────────────────────────────────────────────────────

  async deactivate(carId: string, userId: string) {
    await this.assertCarManager(carId, userId);

    return this.prisma.car.update({
      where: { id: carId },
      data: { status: 'inactive' },
    });
  }

  // ─── Hard delete ─────────────────────────────────────────────────────────────

  async hardDelete(carId: string) {
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new NotFoundException('Car not found');
    return this.prisma.car.delete({ where: { id: carId } });
  }

  // ─── Public: available car counts ────────────────────────────────────────────

  async getAvailableCarCounts(requestedDate: string): Promise<{ starex: number; staria: number }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      throw new BadRequestException('requestedDate must be YYYY-MM-DD');
    }

    const dayStart = new Date(`${requestedDate}T00:00:00.000Z`);
    const dayEnd   = new Date(`${requestedDate}T23:59:59.999Z`);

    const busyTrips = await this.prisma.trip.findMany({
      where: {
        status: { in: ['scheduled', 'in_progress'] },
        departureAt: { gte: dayStart, lte: dayEnd },
      },
      select: { carId: true },
    });

    const busyCarIds = [...new Set(busyTrips.map((t) => t.carId))];

    const available = await this.prisma.car.findMany({
      where: {
        carType: { in: ['starex', 'staria'] },
        status: 'active',
        ...(busyCarIds.length ? { id: { notIn: busyCarIds } } : {}),
      },
      select: { carType: true },
    });

    return available.reduce(
      (acc, car) => {
        if (car.carType === 'starex') acc.starex++;
        else if (car.carType === 'staria') acc.staria++;
        return acc;
      },
      { starex: 0, staria: 0 },
    );
  }

  // ─── Public: car options with route pricing ──────────────────────────────────

  async getCarOptions(
    originId: string,
    destinationId: string,
    requestedDate: string,
  ): Promise<{
    starex: { count: number; price: number | null };
    staria: { count: number; price: number | null };
  }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      throw new BadRequestException('requestedDate must be YYYY-MM-DD');
    }

    const route = await this.prisma.route.findUnique({
      where: { originId_destinationId: { originId, destinationId } },
      include: {
        pricings: {
          where: { isActive: true, carType: { in: ['starex', 'staria'] } },
        },
      },
    });

    const priceMap: Record<string, number | null> = { starex: null, staria: null };
    for (const p of route?.pricings ?? []) {
      priceMap[p.carType] = Number(p.basePrice);
    }

    const dayStart = new Date(`${requestedDate}T00:00:00.000Z`);
    const dayEnd   = new Date(`${requestedDate}T23:59:59.999Z`);

    const busyTrips = await this.prisma.trip.findMany({
      where: {
        status: { in: ['scheduled', 'in_progress'] },
        departureAt: { gte: dayStart, lte: dayEnd },
      },
      select: { carId: true },
    });

    const busyCarIds = [...new Set(busyTrips.map((t) => t.carId))];

    const available = await this.prisma.car.findMany({
      where: {
        carType: { in: ['starex', 'staria'] },
        status: 'active',
        ...(busyCarIds.length ? { id: { notIn: busyCarIds } } : {}),
      },
      select: { carType: true },
    });

    const counts = available.reduce(
      (acc, car) => {
        if (car.carType === 'starex') acc.starex++;
        else if (car.carType === 'staria') acc.staria++;
        return acc;
      },
      { starex: 0, staria: 0 },
    );

    return {
      starex: { count: counts.starex, price: priceMap['starex'] },
      staria: { count: counts.staria, price: priceMap['staria'] },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async assertCarOwner(carId: string, userId: string) {
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new NotFoundException('Car not found');

    const profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile || car.driverId !== profile.id) {
      throw new ForbiddenException('You do not own this car');
    }
    return car;
  }

  private async assertCarManager(carId: string, userId: string) {
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new NotFoundException('Car not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.role === 'admin') return car;

    const profile = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!profile || car.driverId !== profile.id) {
      throw new ForbiddenException('You do not own this car');
    }
    return car;
  }
}
