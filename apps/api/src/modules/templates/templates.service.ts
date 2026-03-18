import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.templateDefinition.findMany({
      include: {
        versions: { where: { isLatest: true }, take: 1 },
      },
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(templateId: string) {
    const template = await this.prisma.templateDefinition.findUnique({
      where: { id: templateId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { schemaPacks: { include: { schemaPack: { include: { fields: true } } } } },
        },
      },
    });
    if (!template) throw new NotFoundException(`Template ${templateId} not found`);
    return template;
  }

  async findLatestVersion(templateId: string) {
    const version = await this.prisma.templateVersion.findFirst({
      where: { templateDefId: templateId, isLatest: true },
      include: {
        schemaPacks: { include: { schemaPack: { include: { fields: true } } } },
      },
    });
    if (!version) throw new NotFoundException(`No published version found for template ${templateId}`);
    return version;
  }
}
