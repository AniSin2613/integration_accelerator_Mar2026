import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { BindConnectionDto } from './dto/bind-connection.dto';

@Injectable()
export class ConnectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllFlat(workspaceSlug?: string) {
    return this.prisma.connectionDefinition.findMany({
      where: workspaceSlug
        ? {
            workspace: {
              slug: workspaceSlug,
            },
          }
        : undefined,
      include: { envBindings: { include: { environment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findByWorkspace(workspaceId: string) {
    return this.prisma.connectionDefinition.findMany({
      where: { workspaceId },
      include: { envBindings: { include: { environment: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(workspaceId: string, connectionId: string) {
    const conn = await this.prisma.connectionDefinition.findFirst({
      where: { id: connectionId, workspaceId },
      include: {
        envBindings: { include: { environment: true } },
        testHistory: { orderBy: { testedAt: 'desc' }, take: 5 },
      },
    });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);
    return conn;
  }

  async create(workspaceId: string, dto: CreateConnectionDto) {
    return this.prisma.connectionDefinition.create({
      data: {
        workspaceId,
        name: dto.name,
        family: dto.family,
        config: dto.config as Prisma.InputJsonValue,
      },
    });
  }

  async bindToEnvironment(connectionId: string, environmentId: string, dto: BindConnectionDto) {
    return this.prisma.connectionEnvBinding.upsert({
      where: { connectionDefId_environmentId: { connectionDefId: connectionId, environmentId } },
      update: { secretRef: dto.secretRef, overrideConfig: dto.overrideConfig as Prisma.InputJsonValue | undefined },
      create: { connectionDefId: connectionId, environmentId, secretRef: dto.secretRef, overrideConfig: dto.overrideConfig as Prisma.InputJsonValue | undefined },
    });
  }

  async testConnection(connectionId: string, environmentId: string) {
    // Stub — real connectivity check will be implemented per connection family
    const conn = await this.prisma.connectionDefinition.findUnique({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException(`Connection ${connectionId} not found`);

    const success = true; // stub result
    await this.prisma.connectionTestHistory.create({
      data: { connectionDefId: connectionId, environmentId, success },
    });
    return { connectionId, environmentId, success, testedAt: new Date().toISOString() };
  }

  async testConnectionDefault(connectionId: string) {
    const binding = await this.prisma.connectionEnvBinding.findFirst({
      where: { connectionDefId: connectionId },
      include: { environment: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!binding) throw new NotFoundException(`No environment binding for connection ${connectionId}`);
    return this.testConnection(connectionId, binding.environmentId);
  }
}
