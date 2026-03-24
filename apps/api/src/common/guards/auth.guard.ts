import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RequestUser } from '../decorators/current-user.decorator';

/**
 * Auth stub guard.
 *
 * For Phase 1 this validates a static Bearer token configured via AUTH_STUB_SECRET
 * and extracts the user identity from X-User-Id / X-User-Role headers.
 * Full auth (JWT + RBAC) will replace this in a later sprint.
 *
 * How to authenticate in dev:
 *   Authorization: Bearer dev_stub_secret_not_for_production
 *   X-User-Id: <uuid>
 *   X-User-Role: ADMIN
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

    // Extract user context from headers (Phase 1 stub — replaced by JWT claims later)
    const userId = (req.headers['x-user-id'] as string) ??
      this.config.get<string>('AUTH_STUB_USER_ID', 'system-stub-user');
    const role = (req.headers['x-user-role'] as string) ??
      this.config.get<string>('AUTH_STUB_USER_ROLE', 'ADMIN');

    const user: RequestUser = { userId, role };
    (req as any).user = user;

    return true;
  }
}
