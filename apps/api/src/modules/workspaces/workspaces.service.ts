import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.workspace.findMany({
      where: { tenantId },
      include: { environments: true, _count: { select: { integrationDefs: true, memberships: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(tenantId: string, workspaceId: string) {
    const ws = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, tenantId },
      include: { environments: true, memberships: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    if (!ws) throw new NotFoundException(`Workspace ${workspaceId} not found`);
    return ws;
  }

  async create(tenantId: string, dto: CreateWorkspaceDto) {
    const existing = await this.prisma.workspace.findFirst({
      where: { tenantId, slug: dto.slug },
    });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' already used in this tenant`);

    const workspace = await this.prisma.workspace.create({
      data: { tenantId, ...dto },
    });

    // Auto-create the three canonical environments
    await this.prisma.environment.createMany({
      data: [
        { workspaceId: workspace.id, type: 'DEV' },
        { workspaceId: workspace.id, type: 'TEST' },
        { workspaceId: workspace.id, type: 'PROD' },
      ],
    });

    return this.prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: { environments: true },
    });
  }
}
