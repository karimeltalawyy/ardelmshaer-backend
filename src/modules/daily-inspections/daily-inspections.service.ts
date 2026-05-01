import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubmitDailyInspectionDto } from './dto/submit-daily-inspection.dto';

@Injectable()
export class DailyInspectionsService {
  constructor(private prisma: PrismaService) {}

  async getToday(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.dailyInspection.findUnique({
      where: { driverId_inspectionDate: { driverId: driver.id, inspectionDate: today } },
    });

    if (!record) return { submitted: false };

    return { submitted: true, record: this.formatRecord(record) };
  }

  async submit(userId: string, dto: SubmitDailyInspectionDto) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const inspectionDate = new Date(dto.inspectionDate);
    inspectionDate.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyInspection.findUnique({
      where: { driverId_inspectionDate: { driverId: driver.id, inspectionDate } },
    });
    if (existing) throw new ConflictException('تم تسليم الفحص اليومي لهذا اليوم مسبقاً');

    const record = await this.prisma.dailyInspection.create({
      data: {
        driverId: driver.id,
        driverName: dto.driverName,
        plateNumber: dto.plateNumber,
        inspectionDate,
        inspectionTime: dto.inspectionTime.slice(0, 8),
        checklist: dto.checklist as any,
      },
    });

    return { id: record.id, submittedAt: record.submittedAt.toISOString(), pdfUrl: null };
  }

  async getHistory(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { userId } });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const records = await this.prisma.dailyInspection.findMany({
      where: { driverId: driver.id },
      orderBy: { inspectionDate: 'desc' },
    });

    return records.map((r) => this.formatRecord(r));
  }

  async findByDate(date: string) {
    const inspectionDate = new Date(date);
    inspectionDate.setHours(0, 0, 0, 0);

    const records = await this.prisma.dailyInspection.findMany({
      where: { inspectionDate },
      include: { driver: { include: { user: { select: { fullName: true, email: true } } } } },
      orderBy: { submittedAt: 'desc' },
    });

    return records.map((r) => ({
      id: r.id,
      driverFullName: r.driver.user.fullName,
      driverEmail: r.driver.user.email,
      plateNumber: r.plateNumber,
      inspectionDate: r.inspectionDate.toISOString().slice(0, 10),
      inspectionTime: r.inspectionTime,
      submittedAt: r.submittedAt.toISOString(),
      pdfUrl: r.pdfUrl ?? null,
    }));
  }

  private formatRecord(r: any) {
    return {
      id: r.id,
      driverName: r.driverName,
      plateNumber: r.plateNumber,
      inspectionDate: r.inspectionDate.toISOString().slice(0, 10),
      inspectionTime: r.inspectionTime,
      checklist: r.checklist,
      submittedAt: r.submittedAt.toISOString(),
      pdfUrl: r.pdfUrl ?? null,
    };
  }
}
