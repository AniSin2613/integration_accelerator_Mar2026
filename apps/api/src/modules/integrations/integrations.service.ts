import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CamelService } from '../camel/camel.service';
import * as fs from 'fs';
import * as path from 'path';

// Base directory for route files; shared Docker volume is mounted here.
const ROUTES_DIR = process.env.CAMEL_ROUTES_DIR ?? '/app/camel-routes';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly camel: CamelService,
  ) {}

  async findAll() {
    const rows = await this.prisma.integrationDefinition.findMany({
      include: {
        templateVersion: {
          include: { templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } } },
        },
        releaseArtifacts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      ...row,
      templateVersion: row.templateVersion
        ? {
            ...row.templateVersion,
            templateDefinition: (row.templateVersion as any).templateDef,
          }
        : null,
      lastDeployedAt: row.releaseArtifacts[0]?.createdAt ?? null,
    }));
  }

  async findOne(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      include: {
        templateVersion: {
          include: { templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } } },
        },
        mappingSets: {
          include: { rules: { orderBy: { createdAt: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);
    return {
      ...integration,
      templateVersion: integration.templateVersion
        ? {
            ...integration.templateVersion,
            templateDefinition: (integration.templateVersion as any).templateDef,
          }
        : null,
    };
  }

  /**
   * Generate Camel YAML for an integration using the shared @cogniviti/camel builder.
   * Writes the route file to the shared Docker volume so camel-runner can execute it.
   */
  async generateYaml(id: string) {
    const integration = await this.findOne(id);
    const ms = (integration as any).mappingSets?.[0];
    const rules = ms?.rules ?? [];

    const yaml = this.camel.generateRestToRestYaml({
      routeId: `${integration.id}`,
      description: `${integration.name}`,
      sourceBaseUrl: 'https://{{source.base-url}}',
      sourcePath: '{{source.path}}',
      targetBaseUrl: 'https://{{target.base-url}}',
      targetPath: '{{target.path}}',
      httpMethod: 'POST',
      fieldMappings: rules.map((r: any) => ({
        sourceField: r.sourceField,
        targetField: r.targetField,
        transformType: (r.transformConfig as any)?.type,
        transformConfig: r.transformConfig as Record<string, unknown>,
      })),
    });

    // Write the route file to the shared volume for camel-runner
    try {
      fs.mkdirSync(ROUTES_DIR, { recursive: true });
      const filePath = path.join(ROUTES_DIR, `${integration.id}.yaml`);
      fs.writeFileSync(filePath, yaml, 'utf-8');
    } catch {
      // Non-fatal: volume may not be mounted in local dev without Docker
    }

    return {
      integrationId: integration.id,
      mappingSetId: ms?.id ?? null,
      yaml,
    };
  }
}
