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
import { CreateSeatsDto } from './dto/create-seats.dto';
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
    if (existing) throw new ConflictException('Plate number already registered');

    return this.prisma.car.create({
      data: {
        driverId: driverProfile.id,
        carType: dto.carType,
        plateNumber: dto.plateNumber,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        totalSeats: dto.totalSeats,
        seatLayoutJson: dto.seatLayoutJson ?? undefined,
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

  // ─── Seats ────────────────────────────────────────────────────────────────────

  async setSeats(carId: string, userId: string, dto: CreateSeatsDto) {
    const car = await this.assertCarManager(carId, userId);

    const carTypeConfig = await this.prisma.carTypeConfig.findUnique({
      where: { carType: car.carType },
    });

    if (carTypeConfig?.bookingMode !== 'per_seat') {
      throw new BadRequestException(
        'Seat layouts are only for per_seat cars (minibus, bus)',
      );
    }

    if (dto.seats.length !== car.totalSeats) {
      throw new BadRequestException(
        `Seat count (${dto.seats.length}) must match car's total seats (${car.totalSeats})`,
      );
    }

    // Validate unique seat codes
    const codes = dto.seats.map((s) => s.seatCode);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException('Seat codes must be unique within a car');
    }

    // Replace all seats in a transaction
    await this.prisma.$transaction([
      this.prisma.carSeat.deleteMany({ where: { carId } }),
      this.prisma.carSeat.createMany({
        data: dto.seats.map((s) => ({
          carId,
          seatCode: s.seatCode,
          position: s.position,
          isExtraLegroom: s.isExtraLegroom ?? false,
        })),
      }),
    ]);

    return this.prisma.carSeat.findMany({
      where: { carId },
      orderBy: { seatCode: 'asc' },
    });
  }

  async getSeats(carId: string) {
    const car = await this.prisma.car.findUnique({ where: { id: carId } });
    if (!car) throw new NotFoundException('Car not found');

    return this.prisma.carSeat.findMany({
      where: { carId },
      orderBy: { seatCode: 'asc' },
    });
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
