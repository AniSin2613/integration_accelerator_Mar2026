import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { authConfig } from '../../common/config/auth.config';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;      // user id
  email: string;
  tenantId: string;
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /* ─── Login ─────────────────────────────────────────────────────────── */

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueTokenPair(user);
  }

  /* ─── Refresh ───────────────────────────────────────────────────────── */

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: authConfig.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokenPair(user);
  }

  /* ─── Change password (logged-in user) ──────────────────────────────── */

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for this account');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.setPassword(userId, newPassword);
  }

  /* ─── Reset password (no auth, by email) ────────────────────────────── */

  async resetPassword(email: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found with that email address');
    }

    await this.setPassword(user.id, newPassword);
  }

  /* ─── Helpers ───────────────────────────────────────────────────────── */

  /* ─── Profile ────────────────────────────────────────────────────────── */

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, tenantId: true, memberships: { select: { role: true } } },
    });
    if (!user) throw new BadRequestException('User not found');
    const roleHierarchy = ['PLATFORM_ADMIN', 'ADMIN', 'RELEASE_MANAGER', 'BUILDER', 'VIEWER'];
    const roles = user.memberships.map((m) => m.role);
    const highestRole = roleHierarchy.find((r) => roles.includes(r as any)) ?? 'VIEWER';
    return { id: user.id, name: user.name, email: user.email, role: highestRole };
  }

  private async setPassword(userId: string, plaintext: string): Promise<void> {
    if (plaintext.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hash = await bcrypt.hash(plaintext, authConfig.bcryptRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });
  }

  private async issueTokenPair(user: {
    id: string;
    email: string;
    tenantId: string;
    name: string;
  }): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      name: user.name,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync({ ...payload } as Record<string, unknown>, {
        secret: authConfig.jwtSecret,
        expiresIn: authConfig.accessTokenExpiry as any,
      }),
      this.jwt.signAsync({ ...payload } as Record<string, unknown>, {
        secret: authConfig.jwtRefreshSecret,
        expiresIn: authConfig.refreshTokenExpiry as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
