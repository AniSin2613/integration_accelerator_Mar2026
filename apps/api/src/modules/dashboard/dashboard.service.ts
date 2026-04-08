import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(workspaceId?: string) {
    const whereWorkspace = workspaceId ? { workspaceId } : {};

    // ── Integrations overview ──
    const integrations = await this.prisma.integrationDefinition.findMany({
      where: { ...whereWorkspace },
      include: {
        templateDef: { select: { name: true, class: true, sourceSystem: true, targetSystem: true } },
        templateVersion: { select: { version: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    const activeIntegrations = integrations.filter((i) => i.status !== 'DRAFT').length;
    const healthyIntegrations = integrations.filter((i) => i.status === 'LIVE').length;
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

    // ── Health / Run stats ──
    const recentRuns = await this.prisma.workflowRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { status: true, durationMs: true, createdAt: true },
    });

    const totalRuns = recentRuns.length;
    const successRuns = recentRuns.filter((r) => r.status === 'SUCCESS').length;
    const failedRuns = recentRuns.filter((r) => r.status === 'FAILED').length;
    const successRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) + '%' : '--';

    // ── Needs Attention ──
    const pendingApprovals = await this.prisma.approvalRequest.count({
      where: { status: 'SUBMITTED' },
    });

    const connectionIssues = await this.prisma.connectionTestHistory.count({
      where: { success: false },
    });

    const replayQueue = await this.prisma.replayRequest.count({
      where: { status: 'PENDING' },
    });

    // ── Recent releases ──
    const releases = await this.prisma.releaseArtifact.findMany({
      where: { ...whereWorkspace },
      include: {
        integrationDef: { select: { name: true } },
        environmentReleases: {
          include: { environment: { select: { type: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
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
      take: 10,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, details: true },
    });

    // ── Format response ──
    return {
      workspaceSummary: {
        workspace: workspaceName,
        environment: environmentLabel,
        activeIntegrations,
        openIssues: attentionIntegrations + failedRuns,
        lastDeployment: lastDeploy?.deployedAt
          ? this.timeAgo(lastDeploy.deployedAt)
          : '--',
      },
      needsAttention: [
        { id: 'failed-runs', label: 'Failed Runs', icon: 'error', count: failedRuns, actionLabel: 'Review' },
        { id: 'pending-approvals', label: 'Pending Approvals', icon: 'approval', count: pendingApprovals, actionLabel: 'Review' },
        { id: 'connection-issues', label: 'Connection Issues', icon: 'cable', count: connectionIssues, actionLabel: 'Review' },
        { id: 'replay-queue', label: 'Replay Queue', icon: 'replay', count: replayQueue, actionLabel: 'Review' },
      ],
      kpis: [
        { id: 'active-integrations', label: 'Active Integrations', value: String(activeIntegrations), tone: 'neutral' },
        { id: 'healthy-integrations', label: 'Healthy Integrations', value: String(healthyIntegrations), tone: healthyIntegrations > 0 ? 'success' : 'neutral' },
        { id: 'success-rate', label: 'Success Rate', value: successRate, tone: totalRuns > 0 && successRuns / totalRuns >= 0.95 ? 'success' : totalRuns > 0 && successRuns / totalRuns < 0.8 ? 'danger' : 'neutral' },
        { id: 'last-deployment', label: 'Last Deployment', value: lastDeploy?.deployedAt ? this.timeAgo(lastDeploy.deployedAt) : '--', tone: 'neutral' },
      ],
      integrations: integrations.slice(0, 10).map((i) => ({
        id: i.id,
        name: i.name,
        templateType: i.templateDef.class === 'CERTIFIED' ? 'Certified Template' : 'Starter Template',
        environment: 'Dev',
        lastRun: '--',
        status: this.mapStatus(i.status),
      })),
      releases: releases.slice(0, 5).map((r) => ({
        id: r.id,
        name: `${r.integrationDef.name} ${r.version}`,
        path: r.environmentReleases[0]?.environment?.type
          ? `Promoted to ${r.environmentReleases[0].environment.type}`
          : 'Not deployed',
        status: r.status === 'DEPLOYED' ? 'Live' : r.status === 'APPROVED' ? 'Approved' : r.status,
        time: this.timeAgo(r.updatedAt),
      })),
      recentActivity: auditLogs.map((a) => ({
        id: a.id,
        icon: this.auditActionIcon(a.action),
        message: this.formatAuditMessage(a.action, a.entityType, a.entityId),
        time: this.timeAgo(a.createdAt),
      })),
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
