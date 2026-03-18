import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    tenantId: string;
    workspaceId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...entry,
        details: entry.details as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findByWorkspace(workspaceId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
