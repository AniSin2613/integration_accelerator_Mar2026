import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DemoTargetType } from '@prisma/client';

@Injectable()
export class DemoTargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordReceipt(params: {
    targetType: DemoTargetType;
    targetName: string;
    mode: 'success' | 'error';
    integrationDefId?: string | null;
    testRunId?: string | null;
    requestHeaders?: Record<string, string | string[] | undefined>;
    requestContentType?: string | null;
    rawRequestBody: string;
    parsedJsonBody?: unknown;
    responseStatusCode: number;
    rawResponseBody: string;
    responseHeaders?: Record<string, string>;
  }) {
    return this.prisma.demoTargetReceipt.create({
      data: {
        targetType: params.targetType,
        targetName: params.targetName,
        mode: params.mode,
        integrationDefId: params.integrationDefId ?? null,
        testRunId: params.testRunId ?? null,
        requestHeaders: (params.requestHeaders ?? {}) as any,
        requestContentType: params.requestContentType ?? null,
        rawRequestBody: params.rawRequestBody,
        parsedJsonBody: (params.parsedJsonBody ?? null) as any,
        responseStatusCode: params.responseStatusCode,
        rawResponseBody: params.rawResponseBody,
        responseHeaders: (params.responseHeaders ?? {}) as any,
      },
    });
  }

  async listReceipts(params: { integrationId?: string; limit?: number }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
    return this.prisma.demoTargetReceipt.findMany({
      where: {
        ...(params.integrationId ? { integrationDefId: params.integrationId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
