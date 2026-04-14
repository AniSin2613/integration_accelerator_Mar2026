import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(workspaceId?: string) {
    const whereWorkspace = workspaceId ? { workspaceId } : {};

    // ── Integrations ──
    const integrations = await this.prisma.integrationDefinition.findMany({
      where: { ...whereWorkspace },
      include: {
        templateDef: { select: { name: true, class: true, sourceSystem: true, targetSystem: true } },
        templateVersion: { select: { version: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const totalIntegrations = integrations.length;
    const activeIntegrations = integrations.filter((i) => i.status !== 'DRAFT').length;
    const draftIntegrations = integrations.filter((i) => i.status === 'DRAFT').length;
    const attentionIntegrations = integrations.filter((i) => i.status === 'ATTENTION_NEEDED').length;

    // ── Workspace info ──
    let workspaceName = 'Default Workspace';
    let environmentLabel = 'Dev';
    if (workspaceId) {
      const ws = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      });
      if (ws) workspaceName = ws.name;
    }

    // ── Connections ──
    const connections = await this.prisma.connectionDefinition.findMany({
      where: { ...whereWorkspace, deletedAt: null },
      select: {
        id: true,
        name: true,
        family: true,
        testHistory: {
          orderBy: { testedAt: 'desc' },
          take: 1,
          select: { success: true, testedAt: true, errorMessage: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalConnections = connections.length;
    const healthyConnections = connections.filter(
      (c) => c.testHistory.length > 0 && c.testHistory[0].success,
    ).length;
    const failingConnections = connections.filter(
      (c) => c.testHistory.length > 0 && !c.testHistory[0].success,
    ).length;
    const untestedConnections = connections.filter(
      (c) => c.testHistory.length === 0,
    ).length;

    // ── Health / Run stats ──
    const recentRuns = await this.prisma.workflowRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        durationMs: true,
        errorCount: true,
        createdAt: true,
        integrationDefId: true,
      },
    });

    // Fetch integration names for failed runs
    const failedRuns_ = recentRuns.filter((r) => r.status === 'FAILED').slice(0, 8);
    const integrationIds = [...new Set(failedRuns_.map((r) => r.integrationDefId))];
    const integrationNames = integrationIds.length > 0
      ? await this.prisma.integrationDefinition.findMany({
          where: { id: { in: integrationIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(integrationNames.map((i) => [i.id, i.name]));

    const totalRuns = recentRuns.length;
    const successRuns = recentRuns.filter((r) => r.status === 'SUCCESS').length;
    const failedRuns = recentRuns.filter((r) => r.status === 'FAILED').length;
    const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : null;
    const avgDuration = totalRuns > 0
      ? (recentRuns.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / totalRuns / 1000).toFixed(1)
      : null;

    // ── Recent failures ──
    const recentFailures = failedRuns_
      .map((r) => ({
        id: r.id,
        integration: nameMap.get(r.integrationDefId) ?? 'Unknown',
        error: (r.errorCount ?? 0) > 0 ? `${r.errorCount} error(s)` : 'Pipeline failed',
        time: this.timeAgo(r.createdAt),
      }));

    // ── Needs Attention ──
    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'SUBMITTED' },
    });

    const replayQueue = await this.prisma.replayRequest.count({
      where: { status: 'PENDING' },
    });

    // ── Last deployment time ──
    const lastDeploy = await this.prisma.environmentRelease.findFirst({
      where: { deployedAt: { not: null } },
      orderBy: { deployedAt: 'desc' },
      select: { deployedAt: true },
    });

    // ── Recent activity from audit log ──
    const auditLogs = await this.prisma.auditLog.findMany({
      ...(workspaceId ? { where: { workspaceId } } : {}),
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, details: true },
    });

    // ── Format response ──
    return {
      workspace: {
        name: workspaceName,
        environment: environmentLabel,
        totalIntegrations,
        totalConnections,
      },
      kpis: {
        totalIntegrations,
        activeIntegrations,
        draftIntegrations,
        connectedSystems: `${healthyConnections}/${totalConnections}`,
        failingConnections,
        untestedConnections,
        totalRuns,
        successRate,
        avgDurationSec: avgDuration,
        lastDeployment: lastDeploy?.deployedAt ? this.timeAgo(lastDeploy.deployedAt) : null,
      },
      needsAttention: [
        { id: 'failed-runs', label: 'Failed Runs', icon: 'error', count: failedRuns, href: '/monitoring' },
        { id: 'pending-approvals', label: 'Pending Approvals', icon: 'approval', count: pendingApprovals, href: '/integrations' },
        { id: 'connection-issues', label: 'Connection Issues', icon: 'cable', count: failingConnections, href: '/connections' },
        { id: 'replay-queue', label: 'Replay Queue', icon: 'replay', count: replayQueue, href: '/monitoring' },
      ].filter((item) => item.count > 0),
      integrations: integrations.slice(0, 10).map((i) => ({
        id: i.id,
        name: i.name,
        templateType: i.templateDef.class === 'CERTIFIED' ? 'Certified Template' : 'Starter Template',
        environment: 'Dev',
        lastRun: '--',
        status: this.mapStatus(i.status),
      })),
      connections: connections.slice(0, 10).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.family,
        system: c.family,
        health: c.testHistory.length === 0 ? 'untested' : c.testHistory[0].success ? 'healthy' : 'failing',
        lastTest: c.testHistory.length > 0 ? this.timeAgo(c.testHistory[0].testedAt) : '--',
        latencyMs: null,
      })),
      recentActivity: auditLogs.map((a) => ({
        id: a.id,
        icon: this.auditActionIcon(a.action),
        message: this.formatAuditMessage(a.action, a.entityType, a.entityId),
        time: this.timeAgo(a.createdAt),
      })),
      recentFailures,
    };
  }

  async search(query: string, workspaceId?: string) {
    const q = `%${query}%`;
    const whereWorkspace = workspaceId ? { workspaceId } : {};

    const [integrations, connections, templates] = await Promise.all([
      this.prisma.integrationDefinition.findMany({
        where: { ...whereWorkspace, name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, status: true },
        take: 10,
      }),
      this.prisma.connectionDefinition.findMany({
        where: { ...whereWorkspace, deletedAt: null, name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, family: true },
        take: 10,
      }),
      this.prisma.templateDefinition.findMany({
        where: { name: { contains: query, mode: 'insensitive' } },
        select: { id: true, name: true, class: true, sourceSystem: true, targetSystem: true },
        take: 10,
      }),
    ]);

    return {
      integrations: integrations.map((i) => ({ id: i.id, name: i.name, type: 'integration' as const, status: i.status })),
      connections: connections.map((c) => ({ id: c.id, name: c.name, type: 'connection' as const, family: c.family })),
      templates: templates.map((t) => ({ id: t.id, name: t.name, type: 'template' as const, source: t.sourceSystem, target: t.targetSystem })),
    };
  }

  async getNotifications(workspaceId?: string, limit = 20) {
    const auditLogs = await this.prisma.auditLog.findMany({
      ...(workspaceId ? { where: { workspaceId } } : {}),
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, details: true },
    });

    return auditLogs.map((a) => ({
      id: a.id,
      icon: this.auditActionIcon(a.action),
      message: this.formatAuditMessage(a.action, a.entityType, a.entityId),
      time: this.timeAgo(a.createdAt),
      action: a.action,
      createdAt: a.createdAt,
    }));
  }

  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  private mapStatus(status: string): 'Healthy' | 'Warning' | 'Draft' {
    switch (status) {
      case 'LIVE': return 'Healthy';
      case 'IN_TEST':
      case 'ATTENTION_NEEDED': return 'Warning';
      default: return 'Draft';
    }
  }

  private auditActionIcon(action: string): string {
    switch (action) {
      case 'MAPPING_APPROVED': return 'check_circle';
      case 'MAPPING_REJECTED': return 'cancel';
      case 'RELEASE_APPROVED': return 'verified';
      case 'RELEASE_DEPLOYED': return 'publish';
      default: return 'info';
    }
  }

  private formatAuditMessage(action: string, entityType?: string | null, entityId?: string | null): string {
    const entity = entityType ? ` ${entityType.toLowerCase().replace(/_/g, ' ')}` : '';
    switch (action) {
      case 'MAPPING_APPROVED': return `Mapping rule approved${entity}`;
      case 'MAPPING_REJECTED': return `Mapping rule rejected${entity}`;
      case 'RELEASE_APPROVED': return `Release approved${entity}`;
      case 'RELEASE_DEPLOYED': return `Release deployed${entity}`;
      default: return `${action.replace(/_/g, ' ').toLowerCase()}${entity}`;
    }
  }
}
