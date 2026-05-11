import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';
import { ApplyDriverDto } from './dto/apply-driver.dto';
import { ReviewDriverDto, ReviewAction } from './dto/review-driver.dto';
import { DocumentType } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  // ─── Apply to become a driver ────────────────────────────────────────────────

  async apply(userId: string, dto: ApplyDriverDto) {
    const existing = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Driver application already exists');
    }

    const profile = await this.prisma.driverProfile.create({
      data: {
        userId,
        licenseNumber: dto.licenseNumber,
        approvalStatus: 'pending',
      },
      include: { documents: true },
    });

    return profile;
  }

  // ─── Get own driver profile ───────────────────────────────────────────────────

  async getMyProfile(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        documents: true,
        cars: true,
        user: { select: { fullName: true, email: true, phone: true, idNumber: true, profileImage: true } },
      },
    });

    if (!profile) throw new NotFoundException('Driver profile not found');
    return profile;
  }

  // ─── Upload document ──────────────────────────────────────────────────────────

  async uploadDocument(
    userId: string,
    docType: DocumentType,
    file: Express.Multer.File,
  ) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Submit your driver application first');
    }

    if (profile.approvalStatus === 'approved') {
      throw new ForbiddenException('Profile is already approved');
    }

    // Replace existing document of same type (re-upload)
    const existing = await this.prisma.driverDocument.findFirst({
      where: { driverId: profile.id, docType },
    });

    if (existing) {
      try {
        await this.s3.delete(existing.fileUrl);
      } catch {
        // S3 file may not exist if credentials weren't set — continue
      }
      await this.prisma.driverDocument.delete({ where: { id: existing.id } });
    }

    const fileUrl = await this.s3.upload(
      `drivers/${profile.id}/${docType}`,
      file,
    );

    const document = await this.prisma.driverDocument.create({
      data: {
        driverId: profile.id,
        docType,
        fileUrl,
        status: 'pending',
      },
    });

    return document;
  }

  // ─── Admin: list all drivers ──────────────────────────────────────────────────

  async findAll(status?: string) {
    return this.prisma.driverProfile.findMany({
      where: status ? { approvalStatus: status as any } : undefined,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, createdAt: true } },
        documents: true,
      },
      orderBy: { user: { createdAt: 'desc' } },
    });
  }

  // ─── Admin: get driver by id ──────────────────────────────────────────────────

  async findOne(driverId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, nationality: true, idNumber: true } },
        documents: true,
        cars: true,
      },
    });

    if (!profile) throw new NotFoundException('Driver not found');
    return profile;
  }

  // ─── Admin: approve or reject a driver ───────────────────────────────────────

  async review(driverId: string, adminId: string, dto: ReviewDriverDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
    });

    if (!profile) throw new NotFoundException('Driver not found');

    if (profile.approvalStatus !== 'pending') {
      throw new BadRequestException(
        `Driver is already ${profile.approvalStatus}`,
      );
    }

    if (dto.action === ReviewAction.reject && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (dto.action === ReviewAction.approve) {
      // Approve driver — update profile and promote user role in one transaction
      const [updatedProfile] = await this.prisma.$transaction([
        this.prisma.driverProfile.update({
          where: { id: driverId },
          data: {
            approvalStatus: 'approved',
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: profile.userId },
          data: { role: 'driver' },
        }),
        this.prisma.driverDocument.updateMany({
          where: { driverId, status: 'pending' },
          data: { status: 'approved' },
        }),
      ]);

      return updatedProfile;
    } else {
      return this.prisma.driverProfile.update({
        where: { id: driverId },
        data: {
          approvalStatus: 'rejected',
          rejectionReason: dto.rejectionReason,
        },
      });
    }
  }

  // ─── Driver booking documents ─────────────────────────────────────────────────

  async getMyBookingDocuments(userId: string) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];

    const docs = await this.prisma.document.findMany({
      where: {
        booking: {
          trip: { driverId: profile.id },
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            trip: {
              select: {
                departureAt: true,
                route: {
                  select: {
                    origin: { select: { nameAr: true } },
                    destination: { select: { nameAr: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return docs.map((d) => ({
      id: d.id,
      type: d.type,
      fileUrl: d.fileUrl,
      issuedAt: d.issuedAt,
      bookingId: d.bookingId,
      trip: {
        origin: d.booking.trip?.route?.origin?.nameAr ?? '',
        destination: d.booking.trip?.route?.destination?.nameAr ?? '',
        departureAt: d.booking.trip?.departureAt?.toISOString() ?? '',
      },
    }));
  }
}
