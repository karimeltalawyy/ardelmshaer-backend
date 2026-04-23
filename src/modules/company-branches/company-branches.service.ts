import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCompanyBranchDto } from './dto/create-company-branch.dto';
import { UpdateCompanyBranchDto } from './dto/update-company-branch.dto';

@Injectable()
export class CompanyBranchesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyBranchDto) {
    const pickupSlots = (dto.pickupSlots ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
      .sort();
    return this.prisma.companyBranch.create({
      data: {
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        addressAr: dto.addressAr,
        addressEn: dto.addressEn,
        pickupSlotsJson: pickupSlots,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(activeOnly?: boolean) {
    return this.prisma.companyBranch.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.companyBranch.findUnique({ where: { id } });
    if (!branch) throw new NotFoundException('Company branch not found');
    return branch;
  }

  async update(id: string, dto: UpdateCompanyBranchDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.pickupSlots) {
      data.pickupSlotsJson = dto.pickupSlots
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      delete data.pickupSlots;
    }
    return this.prisma.companyBranch.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.companyBranch.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
