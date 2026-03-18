import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecent(limit = 20) {
    const runs = await this.prisma.workflowRun.findMany({
      include: {
        environment: { select: { id: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const integrationIds = Array.from(new Set(runs.map((r) => r.integrationDefId)));
    const integrations = await this.prisma.integrationDefinition.findMany({
      where: { id: { in: integrationIds } },
      select: { id: true, name: true, status: true },
    });
    const integrationMap = new Map(integrations.map((i) => [i.id, i]));

    return runs.map((run) => ({
      ...run,
      integrationDef: integrationMap.get(run.integrationDefId) ?? null,
    }));
  }

  async getLatestHealthAcrossEnvironments() {
    const snapshot = await this.prisma.healthSnapshot.findFirst({
      include: { environment: { select: { id: true, type: true } } },
      orderBy: { snapshotAt: 'desc' },
    });

    const runs = await this.prisma.workflowRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { status: true, durationMs: true },
    });

    const totalRuns = runs.length;
    const successRuns = runs.filter((r) => r.status === 'SUCCESS').length;
    const failureRuns = runs.filter((r) => r.status === 'FAILED').length;
    const durations = runs.map((r) => r.durationMs ?? 0).filter((d) => d > 0);
    const avgLatencyMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;
    const sorted = [...durations].sort((a, b) => a - b);
    const p95LatencyMs =
      sorted.length > 0 ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : null;

    return {
      id: snapshot?.id ?? 'derived-health',
      uptimePct:
        snapshot?.uptimePct != null
          ? Number(snapshot.uptimePct)
          : totalRuns === 0
          ? 100
          : Number(((successRuns / totalRuns) * 100).toFixed(2)),
      totalRuns,
      successRuns,
      failureRuns,
      avgLatencyMs: snapshot?.avgLatencyMs ?? avgLatencyMs,
      p95LatencyMs,
      snapshotAt: snapshot?.snapshotAt ?? new Date(),
      environment: snapshot?.environment ?? null,
    };
  }

  async findByEnvironment(environmentId: string) {
    return this.prisma.workflowRun.findMany({
      where: { environmentId },
      include: { runItems: { take: 50, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(runId: string) {
    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
      include: {
        runItems: { orderBy: { createdAt: 'asc' } },
        replayRequests: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);
    return run;
  }

  async requestReplay(runId: string, requestedByUserId: string) {
    const run = await this.prisma.workflowRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException(`Run ${runId} not found`);

    return this.prisma.replayRequest.create({
      data: { workflowRunId: runId, requestedByUserId, status: 'PENDING' },
    });
  }

  async getHealthSummary(environmentId: string) {
    const snapshot = await this.prisma.healthSnapshot.findFirst({
      where: { environmentId },
      orderBy: { snapshotAt: 'desc' },
    });

    const recentRuns = await this.prisma.workflowRun.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { status: true, durationMs: true, recordsProcessed: true, errorCount: true, createdAt: true },
    });

    return { snapshot, recentRuns };
  }
}
