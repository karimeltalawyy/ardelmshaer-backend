import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../common/s3/s3.service';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpsertConfigDto } from './dto/upsert-config.dto';
import { CreateCancellationPolicyDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';
import { CreateAdminUserDto } from './dto/create-user.dto';
import { UpdateAdminUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────────

  async getDashboard() {
    const [
      totalUsers,
      riderCount,
      driverCount,
      adminCount,
      suspendedUsers,
      pendingDrivers,
      approvedDrivers,
      totalTrips,
      scheduledTrips,
      inProgressTrips,
      completedTrips,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      revenueAgg,
      collectedAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'rider' } }),
      this.prisma.user.count({ where: { role: 'driver' } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({ where: { status: 'suspended' } }),
      this.prisma.driverProfile.count({ where: { approvalStatus: 'pending' } }),
      this.prisma.driverProfile.count({ where: { approvalStatus: 'approved' } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'scheduled' } }),
      this.prisma.trip.count({ where: { status: 'in_progress' } }),
      this.prisma.trip.count({ where: { status: 'completed' } }),
      this.prisma.booking.count({ where: { status: { not: 'cancelled' } } }),
      this.prisma.booking.count({ where: { status: 'confirmed' } }),
      this.prisma.booking.count({ where: { status: 'cancelled' } }),
      this.prisma.booking.aggregate({
        where: { status: { not: 'cancelled' } },
        _sum: { totalPrice: true, platformFee: true },
      }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'paid' },
        _sum: { totalPrice: true, platformFee: true },
      }),
    ]);

    const recentBookings = await this.prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        rider: { select: { fullName: true } },
        origin: { select: { nameAr: true } },
        destination: { select: { nameAr: true } },
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

    return {
      users: { total: totalUsers, riders: riderCount, drivers: driverCount, admins: adminCount, suspended: suspendedUsers },
      drivers: { pending: pendingDrivers, approved: approvedDrivers },
      trips: { total: totalTrips, scheduled: scheduledTrips, inProgress: inProgressTrips, completed: completedTrips },
      bookings: { active: totalBookings, confirmed: confirmedBookings, cancelled: cancelledBookings },
      revenue: {
        total: Number(revenueAgg._sum.totalPrice ?? 0),
        platformFees: Number(revenueAgg._sum.platformFee ?? 0),
        collected: Number(collectedAgg._sum.totalPrice ?? 0),
        collectedFees: Number(collectedAgg._sum.platformFee ?? 0),
      },
      recentBookings: recentBookings.map((b) => ({
        id: b.id,
        rider: b.rider?.fullName ?? '',
        route: b.trip
          ? `${b.trip.route.origin.nameAr} → ${b.trip.route.destination.nameAr}`
          : `${b.origin?.nameAr ?? ''} → ${b.destination?.nameAr ?? ''}`,
        status: b.status,
        paymentStatus: b.paymentStatus,
        totalPrice: Number(b.totalPrice),
        createdAt: b.createdAt,
      })),
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  async getUsers(role?: string, status?: string, search?: string) {
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        nationality: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        driverProfile: {
          select: { id: true, approvalStatus: true, licenseNumber: true },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        nationality: true,
        idNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        driverProfile: {
          include: {
            documents: true,
            cars: {
              select: { id: true, brand: true, model: true, plateNumber: true, carType: true, status: true },
            },
          },
        },
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            totalPrice: true,
            createdAt: true,
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
        },
        _count: { select: { bookings: true, sessions: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(adminId: string, dto: CreateAdminUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (phoneExists) throw new BadRequestException('Phone already registered');
    }

    const role = dto.role ?? 'rider';
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          password: hashedPassword,
          phone: dto.phone ?? null,
          nationality: dto.nationality ?? '',
          idNumber: dto.idNumber ?? '',
          role: role as any,
          status: (dto.status ?? 'active') as any,
        },
      });

      if (role === 'driver') {
        await tx.driverProfile.create({
          data: {
            userId: user.id,
            licenseNumber: dto.licenseNumber ?? '',
            approvalStatus: 'approved',
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        });
      }

      return user;
    });

    await this.writeAuditLog(adminId, 'User', created.id, 'create', null, {
      email: created.email,
      role: created.role,
      status: created.status,
    });

    return { id: created.id, fullName: created.fullName, email: created.email, role: created.role, status: created.status };
  }

  async updateUserStatus(userId: string, adminId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId) throw new BadRequestException('Cannot change your own status');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status as any },
      select: { id: true, fullName: true, email: true, role: true, status: true },
    });

    await this.writeAuditLog(adminId, 'User', userId, 'update_status', { status: user.status }, { status: dto.status });
    return updated;
  }

  async updateUserRole(userId: string, adminId: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId) throw new BadRequestException('Cannot change your own role');

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role: dto.role as any },
        select: { id: true, fullName: true, email: true, role: true, status: true },
      });

      if (dto.role === 'driver') {
        await tx.driverProfile.upsert({
          where: { userId },
          update: { approvalStatus: 'approved', approvedBy: adminId, approvedAt: new Date() },
          create: { userId, licenseNumber: '', approvalStatus: 'approved', approvedBy: adminId, approvedAt: new Date() },
        });
      }

      return updatedUser;
    });

    await this.writeAuditLog(adminId, 'User', userId, 'update_role', { role: user.role }, { role: dto.role });
    return updated;
  }

  async deleteUser(userId: string, adminId: string) {
    if (userId === adminId) throw new BadRequestException('Cannot delete your own account');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { driverProfile: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction(async (tx) => {
      // ── Driver-specific cleanup ─────────────────────────────────────────
      // Must happen before deleting DriverProfile (which cascades Car → CarSeat),
      // because BookingSeat.carSeatId → CarSeat is a blocking FK.
      if (user.driverProfile) {
        const driverProfileId = user.driverProfile.id;

        const trips = await tx.trip.findMany({
          where: { driverId: driverProfileId },
          select: { id: true },
        });
        const tripIds = trips.map((t) => t.id);

        if (tripIds.length > 0) {
          const bookings = await tx.booking.findMany({
            where: { tripId: { in: tripIds } },
            select: { id: true },
          });
          const bookingIds = bookings.map((b) => b.id);

          if (bookingIds.length > 0) {
            // NotificationLog.bookingId is NOT NULL — delete before bookings
            await tx.notificationLog.deleteMany({ where: { bookingId: { in: bookingIds } } });
            // Booking cascade removes: BookingSeat, Passenger, Document
            await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
          }

          // Trips can now be removed (no more booking or carSeat FK references)
          await tx.trip.deleteMany({ where: { driverId: driverProfileId } });
        }
      }

      // ── Shared user-level cleanup ───────────────────────────────────────
      // Nullify rider reference on bookings (riderId is nullable)
      await tx.booking.updateMany({ where: { riderId: userId }, data: { riderId: null } });
      // Reassign trips created by this user to the deleting admin
      await tx.trip.updateMany({ where: { createdBy: userId }, data: { createdBy: adminId } });
      // Reassign platform configs last updated by this user to the deleting admin
      await tx.platformConfig.updateMany({ where: { updatedBy: userId }, data: { updatedBy: adminId } });
      // Reassign audit logs authored by this user to the deleting admin
      await tx.auditLog.updateMany({ where: { adminId: userId }, data: { adminId } });
      // Delete notification logs for this user
      await tx.notificationLog.deleteMany({ where: { userId } });
      // Nullify approvedBy on driver profiles approved by this admin (nullable)
      await tx.driverProfile.updateMany({ where: { approvedBy: userId }, data: { approvedBy: null } });
      // Remove sessions, driver docs and profile (Car + CarSeat cascade from profile)
      await tx.userSession.deleteMany({ where: { userId } });
      await tx.driverDocument.deleteMany({ where: { driver: { userId } } });
      await tx.driverProfile.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    await this.writeAuditLog(adminId, 'User', userId, 'delete', { email: user.email }, null);
    return { deleted: true, userId };
  }

  async updateUser(userId: string, adminId: string, dto: UpdateAdminUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (exists) throw new BadRequestException('Email already in use');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const exists = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (exists) throw new BadRequestException('Phone already in use');
    }

    const data: any = {};
    if (dto.fullName)    data.fullName    = dto.fullName;
    if (dto.email)       data.email       = dto.email;
    if (dto.phone)       data.phone       = dto.phone;
    if (dto.nationality) data.nationality = dto.nationality;
    if (dto.idNumber)    data.idNumber    = dto.idNumber;
    if (dto.role)        data.role        = dto.role;
    if (dto.status)      data.status      = dto.status;
    if (dto.password)    data.password    = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data,
        select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, profileImage: true },
      });

      if (dto.licenseNumber && u.role === 'driver') {
        await tx.driverProfile.upsert({
          where: { userId },
          update: { licenseNumber: dto.licenseNumber },
          create: {
            userId,
            licenseNumber: dto.licenseNumber,
            approvalStatus: 'approved',
            approvedBy: adminId,
            approvedAt: new Date(),
          },
        });
      }

      return u;
    });

    await this.writeAuditLog(adminId, 'User', userId, 'update', null, {
      ...data,
      password: dto.password ? '[changed]' : undefined,
    });

    return updated;
  }

  async uploadProfileImage(userId: string, adminId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, profileImage: true } });
    if (!user) throw new NotFoundException('User not found');

    // Delete old image if present
    if (user.profileImage) {
      await this.s3.delete(user.profileImage).catch(() => null);
    }

    const url = await this.s3.upload('drivers/profile-images', file);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage: url },
      select: { id: true, profileImage: true },
    });

    await this.writeAuditLog(adminId, 'User', userId, 'upload_profile_image', null, { profileImage: url });
    return updated;
  }

  // ─── Platform Config ──────────────────────────────────────────────────────────

  async getConfigs() {
    return this.prisma.platformConfig.findMany({
      include: { updatedByUser: { select: { fullName: true } } },
      orderBy: { key: 'asc' },
    });
  }

  async upsertConfig(adminId: string, dto: UpsertConfigDto) {
    const existing = await this.prisma.platformConfig.findUnique({ where: { key: dto.key } });

    const config = await this.prisma.platformConfig.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        updatedBy: adminId,
      },
      update: {
        value: dto.value,
        descriptionAr: dto.descriptionAr,
        descriptionEn: dto.descriptionEn,
        updatedBy: adminId,
      },
    });

    await this.writeAuditLog(
      adminId,
      'PlatformConfig',
      config.id,
      existing ? 'update' : 'create',
      existing ? { value: existing.value } : null,
      { value: dto.value },
    );

    return config;
  }

  async deleteConfig(key: string, adminId: string) {
    const config = await this.prisma.platformConfig.findUnique({ where: { key } });
    if (!config) throw new NotFoundException(`Config key '${key}' not found`);

    await this.prisma.platformConfig.delete({ where: { key } });
    await this.writeAuditLog(adminId, 'PlatformConfig', config.id, 'delete', { key, value: config.value }, null);
    return { deleted: true, key };
  }

  // ─── Cancellation Policies ────────────────────────────────────────────────────

  async getCancellationPolicies() {
    return this.prisma.cancellationPolicy.findMany({
      orderBy: { hoursBeforeTrip: 'desc' },
    });
  }

  async createCancellationPolicy(adminId: string, dto: CreateCancellationPolicyDto) {
    const refundPercentage = dto.refundPercentage ?? dto.refundPercent;
    if (refundPercentage == null) {
      throw new BadRequestException('refundPercentage is required');
    }

    const existing = await this.prisma.cancellationPolicy.findFirst({
      where: { hoursBeforeTrip: dto.hoursBeforeTrip, isActive: true },
    });
    if (existing) {
      throw new BadRequestException(`An active policy for ${dto.hoursBeforeTrip} hours already exists`);
    }

    const descriptionAr = (dto.descriptionAr || `إلغاء قبل ${dto.hoursBeforeTrip} ساعة — استرداد ${refundPercentage}%`).trim();
    const descriptionEn = (dto.descriptionEn || `Cancel ${dto.hoursBeforeTrip}h before — ${refundPercentage}% refund`).trim();

    const policy = await this.prisma.cancellationPolicy.create({
      data: {
        hoursBeforeTrip: dto.hoursBeforeTrip,
        refundPercentage,
        descriptionAr,
        descriptionEn,
      },
    });
    await this.writeAuditLog(adminId, 'CancellationPolicy', policy.id, 'create', null, {
      hoursBeforeTrip: dto.hoursBeforeTrip,
      refundPercentage,
      descriptionAr,
      descriptionEn,
    });
    return policy;
  }

  async updateCancellationPolicy(id: string, adminId: string, dto: UpdateCancellationPolicyDto) {
    const policy = await this.prisma.cancellationPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');

    const refundPercentage = dto.refundPercentage ?? dto.refundPercent;
    const data: any = {
      ...(dto.hoursBeforeTrip != null ? { hoursBeforeTrip: dto.hoursBeforeTrip } : {}),
      ...(refundPercentage != null ? { refundPercentage } : {}),
      ...(dto.descriptionAr != null ? { descriptionAr: dto.descriptionAr } : {}),
      ...(dto.descriptionEn != null ? { descriptionEn: dto.descriptionEn } : {}),
      ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
    };

    const updated = await this.prisma.cancellationPolicy.update({ where: { id }, data });
    await this.writeAuditLog(adminId, 'CancellationPolicy', id, 'update', { ...policy }, data);
    return updated;
  }

  async deleteCancellationPolicy(id: string, adminId: string) {
    const policy = await this.prisma.cancellationPolicy.findUnique({ where: { id } });
    if (!policy) throw new NotFoundException('Policy not found');

    // Soft-delete: deactivate instead of hard delete (bookings may reference it)
    const updated = await this.prisma.cancellationPolicy.update({
      where: { id },
      data: { isActive: false },
    });
    await this.writeAuditLog(adminId, 'CancellationPolicy', id, 'deactivate', { isActive: true }, { isActive: false });
    return updated;
  }

  // ─── Car management helpers ───────────────────────────────────────────────────

  async getDriversForCarManagement() {
    // Returns all users with role=driver, upserts a DriverProfile for any that lack one,
    // so the car creation form always has a reliable driverProfile.id to use.
    const driverUsers = await this.prisma.user.findMany({
      where: { role: 'driver' },
      include: { driverProfile: { select: { id: true } } },
      orderBy: { fullName: 'asc' },
    });

    const result: { id: string; user: { fullName: string; email: string } }[] = [];

    for (const u of driverUsers) {
      let profileId = u.driverProfile?.id;
      if (!profileId) {
        const created = await this.prisma.driverProfile.create({
          data: { userId: u.id, licenseNumber: '', approvalStatus: 'approved' },
        });
        profileId = created.id;
      }
      result.push({ id: profileId, user: { fullName: u.fullName, email: u.email } });
    }

    return result;
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  async getAuditLogs(filters: {
    entityType?: string;
    adminId?: string;
    action?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { entityType, adminId, action, search, from, to, page = 1, limit = 50 } = filters;
    const where: any = {
      ...(entityType ? { entityType } : {}),
      ...(adminId ? { adminId } : {}),
      ...(action ? { action } : {}),
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
        },
      } : {}),
      ...(search ? {
        admin: { fullName: { contains: search, mode: 'insensitive' } },
      } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { admin: { select: { id: true, fullName: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async writeAuditLog(
    adminId: string,
    entityType: string,
    entityId: string,
    action: string,
    oldValue: Record<string, any> | null,
    newValue: Record<string, any> | null,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId,
          entityType,
          entityId,
          action,
          oldValue: oldValue ?? undefined,
          newValue: newValue ?? undefined,
        },
      });
    } catch {
      // Audit log failure must never break the main operation
    }
  }
}
