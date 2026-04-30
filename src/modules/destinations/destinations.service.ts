import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationType } from '@prisma/client';

@Injectable()
export class DestinationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDestinationDto) {
    return this.prisma.destination.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        type: dto.type,
        region: dto.region,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(type?: DestinationType, activeOnly?: boolean) {
    return this.prisma.destination.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
    });
    if (!destination) throw new NotFoundException('Destination not found');
    return destination;
  }

  async update(id: string, dto: UpdateDestinationDto) {
    await this.findOne(id);
    return this.prisma.destination.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.destination.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.destination.delete({ where: { id } });
  }
}
