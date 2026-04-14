import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { authConfig } from '../../common/config/auth.config';
import { JwtPayload } from './auth.service';
import { RequestUser } from '../../common/decorators/current-user.decorator';

/**
 * Extract JWT from the `cb_access_token` cookie first,
 * then fallback to the Authorization header (for non-browser clients).
 */
function extractToken(req: Request): string | null {
  const fromCookie = req.cookies?.[authConfig.accessCookieName];
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization ?? '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken]),
      secretOrKey: authConfig.jwtSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { memberships: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Derive the highest role from the user's memberships
    const roleHierarchy = ['PLATFORM_ADMIN', 'ADMIN', 'RELEASE_MANAGER', 'BUILDER', 'VIEWER'];
    const userRoles = user.memberships.map((m) => m.role);
    const highestRole =
      roleHierarchy.find((r) => userRoles.includes(r as any)) ?? 'VIEWER';

    return { userId: user.id, role: highestRole };
  }
}
