import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Auth stub guard.
 *
 * For Phase 1 this validates a static Bearer token configured via AUTH_STUB_SECRET.
 * This intentionally does NOT implement JWT signing, refresh tokens, or OAuth flows.
 * Full auth (JWT + RBAC) will replace this in a later sprint.
 *
 * How to authenticate in dev:
 *   Authorization: Bearer dev_stub_secret_not_for_production
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'] ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const expectedSecret = this.config.get<string>('AUTH_STUB_SECRET');

    if (!token || token !== expectedSecret) {
      throw new UnauthorizedException('Valid Bearer token required');
    }

    return true;
  }
}
