import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { CreateOverrideDto } from './dto/create-override.dto';

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        priceMultiplier: dto.priceMultiplier,
      },
    });
  }

  async findAll() {
    return this.prisma.season.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: {
        routeOverrides: {
          include: {
            routePricing: {
              include: {
                route: {
                  include: {
                    origin: true,
                    destination: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!season) throw new NotFoundException('Season not found');
    return season;
  }

  async update(id: string, dto: UpdateSeasonDto) {
    await this.findOne(id);

    const data: Record<string, any> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.season.update({
      where: { id },
      data,
    });
  }

  async getActiveSeason() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.season.findFirst({
      where: {
        isActive: true,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        routeOverrides: {
          include: {
            routePricing: {
              select: {
                carType: true,
                basePrice: true,
                routeId: true,
              },
            },
          },
        },
      },
    });
  }

  async addOverride(seasonId: string, dto: CreateOverrideDto) {
    await this.findOne(seasonId);

    return this.prisma.seasonRouteOverride.upsert({
      where: {
        seasonId_routePricingId: {
          seasonId,
          routePricingId: dto.routePricingId,
        },
      },
      create: {
        seasonId,
        routePricingId: dto.routePricingId,
        overridePrice: dto.overridePrice,
      },
      update: {
        overridePrice: dto.overridePrice,
      },
    });
  }

  async removeOverride(overrideId: string) {
    const override = await this.prisma.seasonRouteOverride.findUnique({
      where: { id: overrideId },
    });
    if (!override) throw new NotFoundException('Override not found');

    return this.prisma.seasonRouteOverride.delete({ where: { id: overrideId } });
  }
}
