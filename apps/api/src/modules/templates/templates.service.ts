import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ACTIVE_TEMPLATE_IDS = [
  'tpl_coupa_invoice_sap_v1',
  'tpl_coupa_po_sap',
  'tpl_coupa_requisition_sap',
  'tpl_coupa_sim_to_supplier',
  'tpl_coupa_supplier_info_sap',
  'tpl_coupa_invoice_json_demo',
  'tpl_coupa_invoice_xml_demo',
  'tpl_rest_to_rest_v1',
  'tpl_rest_to_json_file_v1',
  'tpl_rest_to_xml_file_v1',
] as const;

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.templateDefinition.findMany({
      where: {
        id: { in: [...ACTIVE_TEMPLATE_IDS] },
      },
      include: {
        versions: { where: { isLatest: true }, take: 1 },
      },
      orderBy: [{ class: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(templateId: string) {
    if (!ACTIVE_TEMPLATE_IDS.includes(templateId as (typeof ACTIVE_TEMPLATE_IDS)[number])) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

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
    if (!ACTIVE_TEMPLATE_IDS.includes(templateId as (typeof ACTIVE_TEMPLATE_IDS)[number])) {
      throw new NotFoundException(`No published version found for template ${templateId}`);
    }

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
