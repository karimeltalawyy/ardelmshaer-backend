import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    if (dto.phone) {
      const phoneExists = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (phoneExists) throw new ConflictException('Phone already registered');
    }

    if (dto.role && dto.role !== 'rider') {
      throw new BadRequestException('Public registration is limited to rider accounts');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          password: hashedPassword,
          phone: dto.phone ?? null,
          role: 'rider',
          status: 'active',
        },
      });

      return created;
    });

    const tokens = await this.createSession(user.id, user.role);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, deviceInfo?: string) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.identifier },
    });

    if (!user) {
      const byId = await this.prisma.user.findFirst({
        where: { idNumber: dto.identifier },
      });
      if (byId?.idNumber) user = byId;
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'suspended') {
      throw new UnauthorizedException('Your account has been suspended');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createSession(user.id, user.role, deviceInfo);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────

  async refreshAccessToken(incomingRefreshToken: string) {
    let payload: any;

    try {
      payload = this.jwtService.verify(incomingRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired, please login again');
    }

    const isMatch = await bcrypt.compare(
      incomingRefreshToken,
      session.refreshToken,
    );

    if (!isMatch) {
      // Token reuse detected — revoke session immediately
      await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const access_token = this.signAccessToken(
      session.user.id,
      session.user.role,
      session.id,
    );

    return { access_token };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(sessionId: string) {
    await this.prisma.userSession.deleteMany({ where: { id: sessionId } });
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async createSession(
    userId: string,
    role: string,
    deviceInfo?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken: 'pending',
        deviceInfo: deviceInfo ?? null,
        expiresAt,
      },
    });

    const access_token = this.signAccessToken(userId, role, session.id);

    const refresh_token = this.jwtService.sign(
      { sub: userId, sessionId: session.id },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
      },
    );

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshToken: await bcrypt.hash(refresh_token, 10) },
    });

    return { access_token, refresh_token };
  }

  private signAccessToken(userId: string, role: string, sessionId: string) {
    return this.jwtService.sign(
      { sub: userId, role, sessionId },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
      },
    );
  }

  private sanitizeUser(user: any) {
    const { password, ...safe } = user;
    return safe;
  }
}
