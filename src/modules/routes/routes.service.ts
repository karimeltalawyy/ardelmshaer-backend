import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { SetPricingDto } from './dto/set-pricing.dto';
import { ensureCarTypeConfig } from '../../common/utils/car-type-config.util';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRouteDto) {
    const existing = await this.prisma.route.findUnique({
      where: {
        originId_destinationId: {
          originId: dto.originId,
          destinationId: dto.destinationId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('A route between these destinations already exists');
    }

    return this.prisma.route.create({
      data: {
        originId: dto.originId,
        destinationId: dto.destinationId,
        estimatedDurationMin: dto.estimatedDurationMin ?? 0,
      },
      include: {
        origin: true,
        destination: true,
        pricings: true,
      },
    });
  }

  async findAll(originId?: string, destinationId?: string) {
    return this.prisma.route.findMany({
      where: {
        ...(originId ? { originId } : {}),
        ...(destinationId ? { destinationId } : {}),
      },
      include: {
        origin: true,
        destination: true,
        pricings: true,
      },
      orderBy: { origin: { nameEn: 'asc' } },
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        origin: true,
        destination: true,
        pricings: true,
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return route;
  }

  async update(id: string, dto: UpdateRouteDto) {
    await this.findOne(id);

    return this.prisma.route.update({
      where: { id },
      data: dto,
      include: {
        origin: true,
        destination: true,
        pricings: true,
      },
    });
  }

  async setPricing(routeId: string, dto: SetPricingDto) {
    await this.findOne(routeId);
    await ensureCarTypeConfig(this.prisma, dto.carType);

    return this.prisma.routePricing.upsert({
      where: {
        routeId_carType: {
          routeId,
          carType: dto.carType,
        },
      },
      create: {
        routeId,
        carType: dto.carType,
        basePrice: dto.basePrice,
      },
      update: {
        basePrice: dto.basePrice,
        isActive: true,
      },
    });
  }

  async deleteRoute(id: string) {
    await this.findOne(id);
    return this.prisma.route.delete({ where: { id } });
  }

  async removePricing(pricingId: string) {
    const pricing = await this.prisma.routePricing.findUnique({
      where: { id: pricingId },
    });
    if (!pricing) throw new NotFoundException('Pricing entry not found');

    return this.prisma.routePricing.delete({ where: { id: pricingId } });
  }
}
