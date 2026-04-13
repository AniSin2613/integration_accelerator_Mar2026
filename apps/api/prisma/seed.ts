/**
 * Cogniviti Bridge — Database Seed
 *
 * Seeds minimal but realistic data:
 *   - 1 tenant (ACME Manufacturing)
 *   - 1 workspace (Procurement Integrations)
 *   - 3 environments (Dev, Test, Prod)
 *   - 2 users (admin + builder)
 *   - 2 template definitions (1 certified + 1 starter)
 *   - 2 template versions
 *   - 2 schema packs with fields
 *   - 1 integration definition (REST-to-REST, used for vertical slice)
 *   - 1 connection definition
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { seedCoupaSchemas } from './seed-coupa-schemas';

const prisma = new PrismaClient();

async function backfillGenericProfiles(prismaClient: PrismaClient) {
  const targetProfiles = await prismaClient.targetProfile.findMany({
    include: {
      versions: true,
      currentVersion: true,
    },
  });

  for (const profile of targetProfiles) {
    const family = await prismaClient.profileFamily.upsert({
      where: {
        direction_system_interfaceName: {
          direction: 'TARGET',
          system: profile.system,
          interfaceName: profile.object,
        },
      },
      update: {
        object: profile.object,
      },
      create: {
        direction: 'TARGET',
        system: profile.system,
        interfaceName: profile.object,
        object: profile.object,
        platformOwned: true,
      },
    });

    await prismaClient.targetProfile.update({
      where: { id: profile.id },
      data: { profileFamilyId: family.id },
    });

    for (const v of profile.versions) {
      await prismaClient.profileVersion.upsert({
        where: {
          profileFamilyId_version: {
            profileFamilyId: family.id,
            version: v.version,
          },
        },
        update: {
          schemaSnapshot: v.snapshotJson as any,
          status: v.id === profile.currentVersionId ? 'CURRENT' : 'DEPRECATED',
          publishedAt: v.publishedAt,
          deprecatedAt: v.id === profile.currentVersionId ? null : v.publishedAt,
          endOfSupportAt: v.id === profile.currentVersionId ? null : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        create: {
          profileFamilyId: family.id,
          version: v.version,
          schemaSnapshot: v.snapshotJson as any,
          status: v.id === profile.currentVersionId ? 'CURRENT' : 'DEPRECATED',
          publishedAt: v.publishedAt,
          deprecatedAt: v.id === profile.currentVersionId ? null : v.publishedAt,
          endOfSupportAt: v.id === profile.currentVersionId ? null : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }

    const currentBaseline = await prismaClient.profileVersion.findFirst({
      where: {
        profileFamilyId: family.id,
        status: 'CURRENT',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (currentBaseline) {
      await prismaClient.effectiveProfileVersion.upsert({
        where: {
          id: `eff_${family.id}_global_current`,
        },
        update: {
          profileFamilyId: family.id,
          baselineProfileVersionId: currentBaseline.id,
          workspaceId: null,
          status: 'ACTIVE',
          effectiveSchemaSnapshot: currentBaseline.schemaSnapshot as any,
          schemaHash: currentBaseline.schemaHash ?? `${family.id.slice(0, 8)}-${currentBaseline.version}`,
          publishedAt: currentBaseline.publishedAt ?? new Date(),
        },
        create: {
          id: `eff_${family.id}_global_current`,
          profileFamilyId: family.id,
          baselineProfileVersionId: currentBaseline.id,
          workspaceId: null,
          status: 'ACTIVE',
          effectiveSchemaSnapshot: currentBaseline.schemaSnapshot as any,
          schemaHash: currentBaseline.schemaHash ?? `${family.id.slice(0, 8)}-${currentBaseline.version}`,
          publishedAt: currentBaseline.publishedAt ?? new Date(),
        },
      });
    }
  }

  const integrations = await prismaClient.integrationDefinition.findMany({
    where: {
      targetProfileId: { not: null },
    },
    include: {
      targetProfile: true,
    },
  });

  for (const integration of integrations) {
    const familyId = integration.targetProfile?.profileFamilyId;
    if (!familyId) continue;

    const effective = await prismaClient.effectiveProfileVersion.findFirst({
      where: {
        profileFamilyId: familyId,
        status: 'ACTIVE',
        workspaceId: null,
      },
      orderBy: { publishedAt: 'desc' },
    });
    if (!effective) continue;

    await prismaClient.integrationDefinition.update({
      where: { id: integration.id },
      data: {
        pinnedTargetEffectiveProfileVersionId: effective.id,
        targetSchemaHash: effective.schemaHash,
        targetProfileUpdateStatus: 'UP_TO_DATE',
      },
    });
  }
}

async function main() {
  console.log('🌱 Seeding Cogniviti Bridge database...');

  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-manufacturing' },
    update: {},
    create: {
      name: 'ACME Manufacturing',
      slug: 'acme-manufacturing',
    },
  });
  console.log(`  Tenant: ${tenant.name}`);

  // ── Workspace ─────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'procurement' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Procurement Integrations',
      slug: 'procurement',
    },
  });
  console.log(`  Workspace: ${workspace.name}`);

  // ── Environments ──────────────────────────────────────────────────────────
  const envDev = await prisma.environment.upsert({
    where: { workspaceId_type: { workspaceId: workspace.id, type: 'DEV' } },
    update: {},
    create: { workspaceId: workspace.id, type: 'DEV', name: 'Dev' },
  });

  const envTest = await prisma.environment.upsert({
    where: { workspaceId_type: { workspaceId: workspace.id, type: 'TEST' } },
    update: {},
    create: { workspaceId: workspace.id, type: 'TEST', name: 'Test' },
  });

  const envProd = await prisma.environment.upsert({
    where: { workspaceId_type: { workspaceId: workspace.id, type: 'PROD' } },
    update: {},
    create: { workspaceId: workspace.id, type: 'PROD', name: 'Prod' },
  });
  console.log(`  Environments: DEV (${envDev.id}), TEST (${envTest.id}), PROD (${envProd.id})`);

  // ── Users ─────────────────────────────────────────────────────────────────
  // NOTE: passwordHash is null here — auth stub validates against a dev token.
  // Real password hashing (bcrypt/argon2) will be added with full auth.
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@acme.example' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@acme.example',
      name: 'Alex Admin',
      passwordHash: null,
    },
  });

  const builderUser = await prisma.user.upsert({
    where: { email: 'builder@acme.example' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'builder@acme.example',
      name: 'Blake Builder',
      passwordHash: null,
    },
  });
  console.log(`  Users: ${adminUser.email}, ${builderUser.email}`);

  // ── Memberships ───────────────────────────────────────────────────────────
  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: adminUser.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: adminUser.id, workspaceId: workspace.id, role: 'ADMIN' },
  });

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: builderUser.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: builderUser.id, workspaceId: workspace.id, role: 'BUILDER' },
  });
  console.log('  Memberships created');

  // ── Template: Certified — Coupa Invoice to SAP Invoice ────────────────────
  const coupaToSapTemplate = await prisma.templateDefinition.upsert({
    where: { id: 'tpl_coupa_invoice_sap_v1' },
    update: {},
    create: {
      id: 'tpl_coupa_invoice_sap_v1',
      name: 'Coupa Invoice → SAP Invoice',
      description:
        'Certified business accelerator. Syncs approved invoices from Coupa to SAP FI via BAPI_ACC_DOCUMENT_POST. Includes supplier normalization, tax code mapping, and cost center derivation.',
      class: 'CERTIFIED',
      sourceSystem: 'Coupa',
      targetSystem: 'SAP',
      businessObject: 'INVOICE',
    },
  });

  // Workflow structure for the certified template
  const coupaToSapWorkflow = {
    boxes: [
      { id: 'trigger', label: 'Trigger', type: 'TRIGGER', order: 1, icon: 'bolt', configurable: true },
      { id: 'source', label: 'Source Connection', type: 'SOURCE', order: 2, icon: 'database', configurable: true },
      { id: 'fetch', label: 'Data Fetch', type: 'FETCH', order: 3, icon: 'download', configurable: false },
      { id: 'mapping', label: 'Mapping & Transform', type: 'MAPPING', order: 4, icon: 'schema', configurable: true },
      { id: 'rules', label: 'Validation Logic', type: 'RULES', order: 5, icon: 'rule', configurable: true },
      { id: 'target', label: 'Target Connection', type: 'TARGET', order: 6, icon: 'dns', configurable: true },
      { id: 'delivery', label: 'Delivery', type: 'DELIVERY', order: 7, icon: 'send', configurable: false },
      { id: 'error', label: 'Error Handling', type: 'ERROR', order: 8, icon: 'error', configurable: true },
    ],
  };

  const coupaToSapVersion = await prisma.templateVersion.upsert({
    where: { templateDefId_version: { templateDefId: coupaToSapTemplate.id, version: '1.0.0' } },
    update: { isLatest: true },
    create: {
      templateDefId: coupaToSapTemplate.id,
      version: '1.0.0',
      workflowStructure: coupaToSapWorkflow,
      isLatest: true,
      publishedAt: new Date(),
      camelRouteTemplate: null, // Populated by packages/camel builder
    },
  });
  console.log(`  Template: ${coupaToSapTemplate.name} v${coupaToSapVersion.version}`);

  // ── Template: Starter — REST to REST ─────────────────────────────────────
  const restToRestTemplate = await prisma.templateDefinition.upsert({
    where: { id: 'tpl_rest_to_rest_v1' },
    update: {},
    create: {
      id: 'tpl_rest_to_rest_v1',
      name: 'REST → REST',
      description:
        'Technical starter template. Pre-scaffolded REST-to-REST passthrough pattern with configurable source endpoint, target endpoint, mapping, and validation slots. Not a blank canvas.',
      class: 'STARTER',
      sourceSystem: 'Generic REST',
      targetSystem: 'Generic REST',
      businessObject: 'GENERIC',
    },
  });

  const restToRestWorkflow = {
    boxes: [
      { id: 'trigger', label: 'Trigger', type: 'TRIGGER', order: 1, icon: 'bolt', configurable: true },
      { id: 'source', label: 'Source Connection', type: 'SOURCE', order: 2, icon: 'api', configurable: true },
      { id: 'mapping', label: 'Mapping & Transform', type: 'MAPPING', order: 3, icon: 'schema', configurable: true },
      { id: 'target', label: 'Target Connection', type: 'TARGET', order: 4, icon: 'api', configurable: true },
      { id: 'error', label: 'Error Handling', type: 'ERROR', order: 5, icon: 'error', configurable: true },
    ],
  };

  const restToRestVersion = await prisma.templateVersion.upsert({
    where: { templateDefId_version: { templateDefId: restToRestTemplate.id, version: '1.0.0' } },
    update: { isLatest: true },
    create: {
      templateDefId: restToRestTemplate.id,
      version: '1.0.0',
      workflowStructure: restToRestWorkflow,
      isLatest: true,
      publishedAt: new Date(),
    },
  });
  console.log(`  Template: ${restToRestTemplate.name} v${restToRestVersion.version}`);

  // ── Schema Packs ──────────────────────────────────────────────────────────
  const coupaSchemaPack = await prisma.schemaPack.upsert({
    where: { id: 'sp_coupa_invoice_v1' },
    update: {},
    create: {
      id: 'sp_coupa_invoice_v1',
      name: 'Coupa Invoice v1',
      system: 'Coupa',
      object: 'Invoice',
      version: '1',
      fields: {
        create: [
          { path: 'invoice_number', dataType: 'String', required: true, description: 'Unique invoice identifier' },
          { path: 'supplier.id', dataType: 'String', required: true, description: 'Coupa supplier ID' },
          { path: 'supplier.name', dataType: 'String', required: false, description: 'Supplier display name' },
          { path: 'invoice_date', dataType: 'Date', required: true, description: 'Invoice date (ISO 8601)' },
          { path: 'payment_due_date', dataType: 'Date', required: false },
          { path: 'currency', dataType: 'String', required: true, example: 'USD' },
          { path: 'total_amount', dataType: 'Decimal', required: true },
          { path: 'tax_amount', dataType: 'Decimal', required: false },
          { path: 'line_items[*].line_num', dataType: 'Integer', required: true },
          { path: 'line_items[*].description', dataType: 'String', required: false },
          { path: 'line_items[*].amount', dataType: 'Decimal', required: true },
          { path: 'line_items[*].account_code', dataType: 'String', required: false },
          { path: 'status', dataType: 'String', required: true, example: 'approved' },
        ],
      },
    },
  });

  const sapSchemaPack = await prisma.schemaPack.upsert({
    where: { id: 'sp_sap_invoice_v1' },
    update: {},
    create: {
      id: 'sp_sap_invoice_v1',
      name: 'SAP BAPI Invoice v1',
      system: 'SAP',
      object: 'Invoice',
      version: '1',
      fields: {
        create: [
          { path: 'HEADER.COMP_CODE', dataType: 'String', required: true, description: 'Company code' },
          { path: 'HEADER.DOC_DATE', dataType: 'Date', required: true, description: 'Document date (YYYYMMDD)' },
          { path: 'HEADER.PSTNG_DATE', dataType: 'Date', required: true, description: 'Posting date (YYYYMMDD)' },
          { path: 'HEADER.REF_DOC_NO', dataType: 'String', required: false, description: 'Reference document (invoice number)' },
          { path: 'HEADER.CURRENCY', dataType: 'String', required: true },
          { path: 'HEADER.VENDOR_NO', dataType: 'String', required: true },
          { path: 'ITEM[*].ITEM_NO', dataType: 'String', required: true },
          { path: 'ITEM[*].GL_ACCOUNT', dataType: 'String', required: true },
          { path: 'ITEM[*].AMOUNT', dataType: 'Decimal', required: true },
          { path: 'ITEM[*].TAX_CODE', dataType: 'String', required: false },
          { path: 'ITEM[*].COSTCENTER', dataType: 'String', required: false },
        ],
      },
    },
  });
  console.log('  Schema packs seeded');

  // Bind schema packs to the Coupa→SAP template version
  await prisma.schemaPackBinding.upsert({
    where: {
      templateVersionId_schemaPackId_role: {
        templateVersionId: coupaToSapVersion.id,
        schemaPackId: coupaSchemaPack.id,
        role: 'SOURCE',
      },
    },
    update: {},
    create: {
      templateVersionId: coupaToSapVersion.id,
      schemaPackId: coupaSchemaPack.id,
      role: 'SOURCE',
    },
  });

  await prisma.schemaPackBinding.upsert({
    where: {
      templateVersionId_schemaPackId_role: {
        templateVersionId: coupaToSapVersion.id,
        schemaPackId: sapSchemaPack.id,
        role: 'TARGET',
      },
    },
    update: {},
    create: {
      templateVersionId: coupaToSapVersion.id,
      schemaPackId: sapSchemaPack.id,
      role: 'TARGET',
    },
  });

  // ── Sample Connection Definition ──────────────────────────────────────────
  const sourceConn = await prisma.connectionDefinition.upsert({
    where: { id: 'conn_sample_rest_source' },
    update: {},
    create: {
      id: 'conn_sample_rest_source',
      workspaceId: workspace.id,
      name: 'Sample REST Source',
      family: 'REST_OPENAPI',
      // Non-sensitive config only. Credentials go in secret manager via secretRef.
      config: {
        baseUrl: 'https://api.example.com',
        authScheme: 'BEARER',
        contentType: 'application/json',
      },
    },
  });

  const targetConn = await prisma.connectionDefinition.upsert({
    where: { id: 'conn_sample_rest_target' },
    update: {},
    create: {
      id: 'conn_sample_rest_target',
      workspaceId: workspace.id,
      name: 'Sample REST Target',
      family: 'REST_OPENAPI',
      config: {
        baseUrl: 'https://erp.example.com',
        authScheme: 'BEARER',
        contentType: 'application/json',
      },
    },
  });
  console.log(`  Connections: ${sourceConn.name}, ${targetConn.name}`);

  // Bind connections to Dev environment
  await prisma.connectionEnvBinding.upsert({
    where: {
      connectionDefId_environmentId: {
        connectionDefId: sourceConn.id,
        environmentId: envDev.id,
      },
    },
    update: {},
    create: {
      connectionDefId: sourceConn.id,
      environmentId: envDev.id,
      secretRef: 'secrets/dev/rest-source-token',  // reference, not raw value
      overrideConfig: { baseUrl: 'https://dev-api.example.com' },
    },
  });

  await prisma.connectionEnvBinding.upsert({
    where: {
      connectionDefId_environmentId: {
        connectionDefId: targetConn.id,
        environmentId: envDev.id,
      },
    },
    update: {},
    create: {
      connectionDefId: targetConn.id,
      environmentId: envDev.id,
      secretRef: 'secrets/dev/rest-target-token',
      overrideConfig: { baseUrl: 'https://dev-erp.example.com' },
    },
  });

  // ── Integration Definition (REST-to-REST, for vertical slice) ─────────────
  const integration = await prisma.integrationDefinition.upsert({
    where: { id: 'int_rest_to_rest_sample' },
    update: {},
    create: {
      id: 'int_rest_to_rest_sample',
      workspaceId: workspace.id,
      templateDefId: restToRestTemplate.id,
      templateVersionId: restToRestVersion.id,
      name: 'Sample REST to REST Sync',
      status: 'DRAFT',
    },
  });
  console.log(`  Integration: ${integration.name}`);

  // ── Mapping Set with sample rules ─────────────────────────────────────────
  const mappingSet = await prisma.mappingSet.upsert({
    where: { id: 'ms_rest_to_rest_v1' },
    update: {},
    create: {
      id: 'ms_rest_to_rest_v1',
      integrationDefId: integration.id,
      version: 1,
      rules: {
        create: [
          {
            sourceField: 'id',
            targetField: 'externalId',
            mappingType: 'DIRECT',
            status: 'APPROVED',
          },
          {
            sourceField: 'name',
            targetField: 'displayName',
            mappingType: 'DIRECT',
            status: 'PENDING_REVIEW',
          },
          {
            sourceField: 'createdAt',
            targetField: 'createdDate',
            mappingType: 'DIRECT',
            transformConfig: { type: 'DATE_FORMAT', fromFormat: 'ISO8601', toFormat: 'YYYYMMDD' },
            status: 'PENDING_REVIEW',
            aiConfidence: 0.95,
            aiEvidenceSource: 'INTERNAL_APPROVED|OFFICIAL_FIELD_DICTIONARY|CURATED_SCHEMA_PACK',
            aiExplanation: 'Both fields represent document creation date. Format conversion required.',
          },
        ],
      },
    },
  });
  console.log(`  Mapping set: ${mappingSet.id}`);

  // ── Stub workflow run (for monitoring page) ────────────────────────────────
  const run = await prisma.workflowRun.create({
    data: {
      environmentId: envDev.id,
      integrationDefId: integration.id,
      status: 'SUCCESS',
      trigger: 'SCHEDULE',
      startedAt: new Date(Date.now() - 60_000),
      completedAt: new Date(),
      durationMs: 1234,
      recordsProcessed: 42,
      errorCount: 0,
    },
  });
  console.log(`  Workflow run: ${run.id} (${run.status})`);

  // Seed a health snapshot for the Dev environment
  await prisma.healthSnapshot.create({
    data: {
      environmentId: envDev.id,
      uptimePct: 99.99,
      errorRatePct: 0.05,
      avgLatencyMs: 340,
      recordsProcessed: 124000,
    },
  });
  console.log('  Health snapshot created');

  // ── Coupa schema packs & templates ──────────────────────────────────────
  await seedCoupaSchemas(prisma);

  // ── Demo templates: Coupa → JSON and Coupa → XML ─────────────────────────
  await seedCoupaDemoTemplates(prisma);

  // ── Generic profile registry backfill from legacy target profiles ───────
  await backfillGenericProfiles(prisma);

  console.log('\n✅ Seed complete.');
}

// ─── Coupa Demo Template Seeder ───────────────────────────────────────────────
// These templates are the primary entry points for hands-on demo flows.
// They target the internal JSON/XML demo receiver endpoints so no external
// target system configuration is required at test time.
async function seedCoupaDemoTemplates(prismaClient: PrismaClient) {
  console.log('\n🎯 Seeding Coupa demo templates (JSON + XML)...');

  const upsertPublishedProfileBaseline = async (params: {
    key: string;
    direction: 'SOURCE' | 'TARGET';
    system: string;
    interfaceName: string;
    object: string;
    profileName: string;
    description?: string;
    version: string;
    fields: Array<{
      path: string;
      dataType: string;
      required: boolean;
      businessName?: string;
      description?: string;
      example?: string;
    }>;
  }) => {
    const family = await prismaClient.profileFamily.upsert({
      where: {
        direction_system_interfaceName: {
          direction: params.direction,
          system: params.system,
          interfaceName: params.interfaceName,
        },
      },
      update: {
        object: params.object,
        platformOwned: true,
      },
      create: {
        direction: params.direction,
        system: params.system,
        interfaceName: params.interfaceName,
        object: params.object,
        platformOwned: true,
      },
    });

    const snapshot = {
      name: params.profileName,
      system: params.system,
      object: params.object,
      description: params.description ?? null,
      fields: params.fields.map((field, sortOrder) => ({
        path: field.path,
        dataType: field.dataType,
        required: field.required,
        businessName: field.businessName ?? null,
        description: field.description ?? null,
        validationRule: null,
        defaultValue: null,
        example: field.example ?? null,
        sortOrder,
      })),
      overlays: [],
    };

    const schemaHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(snapshot))
      .digest('hex')
      .slice(0, 16);

    const baselineVersion = await prismaClient.profileVersion.upsert({
      where: {
        profileFamilyId_version: {
          profileFamilyId: family.id,
          version: params.version,
        },
      },
      update: {
        status: 'CURRENT',
        schemaSnapshot: snapshot as any,
        schemaHash,
        publishedAt: new Date(),
        deprecatedAt: null,
        endOfSupportAt: null,
      },
      create: {
        profileFamilyId: family.id,
        version: params.version,
        status: 'CURRENT',
        schemaSnapshot: snapshot as any,
        schemaHash,
        publishedAt: new Date(),
      },
    });

    await prismaClient.effectiveProfileVersion.upsert({
      where: { id: `eff_${params.key}_global_current` },
      update: {
        profileFamilyId: family.id,
        baselineProfileVersionId: baselineVersion.id,
        workspaceId: null,
        status: 'ACTIVE',
        effectiveSchemaSnapshot: snapshot as any,
        schemaHash,
        publishedAt: new Date(),
      },
      create: {
        id: `eff_${params.key}_global_current`,
        profileFamilyId: family.id,
        baselineProfileVersionId: baselineVersion.id,
        workspaceId: null,
        status: 'ACTIVE',
        effectiveSchemaSnapshot: snapshot as any,
        schemaHash,
        publishedAt: new Date(),
      },
    });

    return {
      familyId: family.id,
      baselineProfileVersionId: baselineVersion.id,
      snapshot,
    };
  };

  const upsertPublishedDemoTargetProfile = async (params: {
    id: string;
    schemaPackId: string;
    system: string;
    object: string;
    name: string;
    description?: string;
    version: string;
    fields: Array<{
      path: string;
      dataType: string;
      required: boolean;
      businessName?: string;
      description?: string;
      example?: string;
    }>;
  }) => {
    const baseline = await upsertPublishedProfileBaseline({
      key: params.id,
      direction: 'TARGET',
      system: params.system,
      interfaceName: params.object,
      object: params.object,
      profileName: params.name,
      description: params.description,
      version: params.version,
      fields: params.fields,
    });

    const profile = await prismaClient.targetProfile.upsert({
      where: { id: params.id },
      update: {
        schemaPackId: params.schemaPackId,
        system: params.system,
        object: params.object,
        name: params.name,
        description: params.description,
        isPublished: true,
        profileFamilyId: baseline.familyId,
        fields: {
          deleteMany: {},
          create: params.fields.map((field, sortOrder) => ({
            path: field.path,
            dataType: field.dataType,
            required: field.required,
            businessName: field.businessName ?? null,
            description: field.description ?? null,
            example: field.example ?? null,
            sortOrder,
          })),
        },
      },
      create: {
        id: params.id,
        schemaPackId: params.schemaPackId,
        system: params.system,
        object: params.object,
        name: params.name,
        description: params.description,
        isPublished: true,
        profileFamilyId: baseline.familyId,
        fields: {
          create: params.fields.map((field, sortOrder) => ({
            path: field.path,
            dataType: field.dataType,
            required: field.required,
            businessName: field.businessName ?? null,
            description: field.description ?? null,
            example: field.example ?? null,
            sortOrder,
          })),
        },
      },
    });

    const targetVersion = await prismaClient.targetProfileVersion.upsert({
      where: {
        targetProfileId_version: {
          targetProfileId: profile.id,
          version: params.version,
        },
      },
      update: {
        snapshotJson: baseline.snapshot as any,
        publishedAt: new Date(),
      },
      create: {
        targetProfileId: profile.id,
        version: params.version,
        snapshotJson: baseline.snapshot as any,
      },
    });

    await prismaClient.targetProfile.update({
      where: { id: profile.id },
      data: {
        currentVersionId: targetVersion.id,
        isPublished: true,
        profileFamilyId: baseline.familyId,
      },
    });

    return {
      profileId: profile.id,
      profileFamilyId: baseline.familyId,
      baselineProfileVersionId: baseline.baselineProfileVersionId,
      currentVersionId: targetVersion.id,
      targetProfileState: {
        profileId: profile.id,
        profileName: params.name,
        system: params.system,
        object: params.object,
        isPublished: true,
        status: 'profile-ready',
        effectiveFieldCount: params.fields.length,
        effectiveRequiredCount: params.fields.filter((field) => field.required).length,
        currentVersionId: targetVersion.id,
      },
    };
  };

  // Reusable prebuilt-template guard + helper.
  // Use this checklist whenever adding a new prebuilt template:
  // 1) class must be CERTIFIED so it appears in the Prebuilt catalog
  // 2) source and target schema packs must both be bound
  // 3) source/target/validation/response/operations baselines must all be present
  // 4) mappingType values must be valid Prisma enums only
  // 5) target requiredness should only be set intentionally, never inferred by accident
  const VALID_MAPPING_TYPES = new Set(['DIRECT', 'CONSTANT', 'DERIVED', 'LOOKUP', 'CONDITIONAL']);

  type SeedTemplateMapping = {
    sourceField: string;
    targetField: string;
    mappingType?: string;
    transformConfig?: Record<string, unknown>;
  };

  const normalizeSeedMappings = (templateId: string, mappings: SeedTemplateMapping[]) => {
    return mappings.map((mapping, index) => {
      const normalizedType = String(mapping.mappingType ?? (mapping.transformConfig ? 'CONDITIONAL' : 'DIRECT')).toUpperCase();
      if (!VALID_MAPPING_TYPES.has(normalizedType)) {
        throw new Error(
          `[seed] Template ${templateId} has unsupported mappingType "${mapping.mappingType}" at index ${index}. ` +
          `Allowed values: ${Array.from(VALID_MAPPING_TYPES).join(', ')}`,
        );
      }
      return {
        ...mapping,
        mappingType: normalizedType as 'DIRECT' | 'CONSTANT' | 'DERIVED' | 'LOOKUP' | 'CONDITIONAL',
      };
    });
  };

  const upsertCertifiedPrebuiltTemplate = async (params: {
    id: string;
    name: string;
    description: string;
    sourceSystem: string;
    targetSystem: string;
    businessObject: 'INVOICE' | 'PURCHASE_ORDER' | 'SUPPLIER' | 'SUPPLIER_INFORMATION' | 'VENDOR';
    version: string;
    sourceSchemaPackId: string;
    targetSchemaPackId: string;
    sourceProfileFamilyId?: string | null;
    sourceProfileVersionId?: string | null;
    targetProfileFamilyId?: string | null;
    targetProfileVersionId?: string | null;
    workflowStructure: Record<string, unknown>;
    defaultMappings: {
      mappings: SeedTemplateMapping[];
      validationBaseline: Record<string, unknown>;
      responseHandlingBaseline: Record<string, unknown>;
      operationsBaseline: Record<string, unknown>;
      sourceStateBaseline: Record<string, unknown>;
      targetStateBaseline: Record<string, unknown>;
    };
  }) => {
    const missing: string[] = [];
    if (!params.sourceSchemaPackId) missing.push('sourceSchemaPackId');
    if (!params.targetSchemaPackId) missing.push('targetSchemaPackId');
    if (!params.defaultMappings.sourceStateBaseline) missing.push('defaultMappings.sourceStateBaseline');
    if (!params.defaultMappings.targetStateBaseline) missing.push('defaultMappings.targetStateBaseline');
    if (!params.defaultMappings.validationBaseline) missing.push('defaultMappings.validationBaseline');
    if (!params.defaultMappings.responseHandlingBaseline) missing.push('defaultMappings.responseHandlingBaseline');
    if (!params.defaultMappings.operationsBaseline) missing.push('defaultMappings.operationsBaseline');
    if (missing.length > 0) {
      throw new Error(`[seed] Template ${params.id} is missing required prebuilt config: ${missing.join(', ')}`);
    }

    const normalizedMappings = normalizeSeedMappings(params.id, params.defaultMappings.mappings ?? []);

    const template = await prismaClient.templateDefinition.upsert({
      where: { id: params.id },
      update: {
        name: params.name,
        description: params.description,
        class: 'CERTIFIED',
        sourceSystem: params.sourceSystem,
        targetSystem: params.targetSystem,
        businessObject: params.businessObject,
      },
      create: {
        id: params.id,
        name: params.name,
        description: params.description,
        class: 'CERTIFIED',
        sourceSystem: params.sourceSystem,
        targetSystem: params.targetSystem,
        businessObject: params.businessObject,
      },
    });

    const version = await prismaClient.templateVersion.upsert({
      where: { templateDefId_version: { templateDefId: template.id, version: params.version } },
      update: {
        isLatest: true,
        publishedAt: new Date(),
        sourceProfileFamilyId: params.sourceProfileFamilyId ?? null,
        sourceProfileVersionId: params.sourceProfileVersionId ?? null,
        targetProfileFamilyId: params.targetProfileFamilyId ?? null,
        targetProfileVersionId: params.targetProfileVersionId ?? null,
        workflowStructure: params.workflowStructure as any,
        defaultMappings: {
          ...params.defaultMappings,
          mappings: normalizedMappings,
        } as any,
      },
      create: {
        templateDefId: template.id,
        version: params.version,
        isLatest: true,
        publishedAt: new Date(),
        sourceProfileFamilyId: params.sourceProfileFamilyId ?? null,
        sourceProfileVersionId: params.sourceProfileVersionId ?? null,
        targetProfileFamilyId: params.targetProfileFamilyId ?? null,
        targetProfileVersionId: params.targetProfileVersionId ?? null,
        workflowStructure: params.workflowStructure as any,
        defaultMappings: {
          ...params.defaultMappings,
          mappings: normalizedMappings,
        } as any,
      },
    });

    await prismaClient.schemaPackBinding.upsert({
      where: {
        templateVersionId_schemaPackId_role: {
          templateVersionId: version.id,
          schemaPackId: params.sourceSchemaPackId,
          role: 'SOURCE',
        },
      },
      update: {},
      create: {
        templateVersionId: version.id,
        schemaPackId: params.sourceSchemaPackId,
        role: 'SOURCE',
      },
    });

    await prismaClient.schemaPackBinding.upsert({
      where: {
        templateVersionId_schemaPackId_role: {
          templateVersionId: version.id,
          schemaPackId: params.targetSchemaPackId,
          role: 'TARGET',
        },
      },
      update: {},
      create: {
        templateVersionId: version.id,
        schemaPackId: params.targetSchemaPackId,
        role: 'TARGET',
      },
    });

    console.log(`  ✓ Prebuilt template: ${template.name} v${version.version}`);
    return { template, version };
  };

  // Shared workflow structure for all demo templates
  const demoWorkflowStructure = {
    boxes: [
      { id: 'trigger', label: 'Trigger', type: 'TRIGGER', order: 1, icon: 'bolt', configurable: true },
      { id: 'source', label: 'Source Connection', type: 'SOURCE', order: 2, icon: 'database', configurable: true },
      { id: 'mapping', label: 'Mapping & Transform', type: 'MAPPING', order: 3, icon: 'schema', configurable: true },
      { id: 'validation', label: 'Validation', type: 'RULES', order: 4, icon: 'rule', configurable: true },
      { id: 'target', label: 'Target', type: 'TARGET', order: 5, icon: 'dns', configurable: true },
      { id: 'error', label: 'Error Handling', type: 'ERROR', order: 6, icon: 'error', configurable: true },
    ],
    triggerBaseline: {
      triggerType: 'Manual',
      cronExpression: '',
      timezone: 'UTC',
      webhookPath: '',
      webhookMethod: 'POST',
      manualExecutionEnabled: true,
      description: 'Manual trigger — run on demand via Test Panel',
    },
  };

  // ── Target fields & mappings are derived from the source schema pack ──
  // Requiredness is based on the uploaded Coupa Invoice workbook.
  // The target schema is a direct copy of the source schema — same paths,
  // same data types — with the `required` flag overridden per the workbook.
  // ALL fields mentioned in the workbook (header + line level) are required.
  const requiredTargetPaths = new Set([
    // ── INVOICE HEADER ──
    'updated-at',                          // Updated at
    'invoice-date',                        // Invoice Date
    'invoice-number',                      // Invoice Number
    'tax-amount',                          // Tax Amount
    'tax-rate',                            // Tax Rate
    'tax-code',                            // Tax Code
    'payment-term.code',                   // payment-term code
    'total-with-taxes',                    // Total with taxes
    'currency.code',                       // Currency
    'supplier.number',                     // Supplier number
    'document-type',                       // Document type
    // Company Code (header) → mapped to line-level account.code below

    // ── INVOICE LINE ──
    'invoice-lines[*].line-num',           // Invoice Line Number
    'invoice-lines[*].price',             // price
    'invoice-lines[*].quantity',          // quantity
    'invoice-lines[*].tax-code',          // tax-code
    'invoice-lines[*].account.code',      // segment-1 / segment-2 / segment-3 / Company Code
    'invoice-lines[*].description',       // description
  ]);

  // Shared validation baseline (uses target schema paths, structured rules)
  const sharedValidationBaseline = {
    policyMode: 'Balanced',
    errorConfig: {
      logEnabled: true,
      dlqEnabled: false,
      dlqTopic: '',
      notifyChannel: 'None',
      notifyRecipients: '',
      includeRecordData: false,
    },
    rules: [
      {
        id: 'v1',
        name: 'Invoice number must be present',
        field: 'invoice-number',
        operator: 'IS_NOT_EMPTY',
        value: '',
        severity: 'Error',
        enabled: true,
        source: 'auto',
      },
      {
        id: 'v2',
        name: 'Total amount must be positive',
        field: 'gross-total',
        operator: 'GREATER_THAN',
        value: '0',
        severity: 'Error',
        enabled: true,
        source: 'manual',
      },
      {
        id: 'v3',
        name: 'Status must be a recognised value',
        field: 'status',
        operator: 'IN',
        value: ['approved', 'pending', 'posted', 'invoice_hold'],
        severity: 'Warning',
        enabled: true,
        source: 'manual',
      },
    ],
  };

  // Shared response handling baseline
  const sharedResponseHandlingBaseline = {
    successCriteria: 'any_success',
    storeResponse: true,
    transformResponse: false,
    outputToSource: 'auto_if_expected',
    notificationEnabled: false,
    notificationDestinationUrl: '',
    notificationMethod: 'POST',
    notificationOnSuccess: false,
    notificationOnFailure: true,
    notificationPayloadMode: 'standard_response',
    businessErrorTranslationEnabled: false,
    loggingLevel: 'Standard',
    debugMode: false,
  };

  // Shared operations baseline
  const sharedOperationsBaseline = {
    storeRunHistory: true,
    storeErrorDetails: true,
    storePayloadSnapshots: false,
    retentionDays: 30,
    failureBehavior: 'retry',
    retryAttempts: 3,
    retryInterval: '5 min',
    partialSuccessPolicy: 'fail_entire_transaction',
    afterFinalFailureNotify: true,
    afterFinalFailureMarkFailed: true,
    afterFinalFailureMoveToQueue: false,
    notifyOnFirstFailure: true,
    notifyAfterFinalFailure: true,
    notifyOnSuccess: false,
    alertRecipients: '',
    notificationType: 'None',
    enableDetailedDiagnostics: false,
    includePayloadInAlerts: false,
    loggingLevel: 'Standard',
    debugMode: false,
  };

  // Shared Coupa source state baseline (user selects connection; object/endpoint pre-configured)
  const coupaSourceStateBaseline = {
    primary: {
      connectionId: '',
      connectionName: '(Select Coupa connection)',
      connectionFamily: 'REST_OPENAPI',
      healthStatus: 'UNCONFIGURED',
      businessObject: 'Invoice',
      operation: 'GET',
      endpointPath: '/api/invoices',
      queryParams: [{ key: 'status[in]', value: 'approved' }],
      customParams: [],
      paginationEnabled: true,
      paginationStrategy: 'Page',
      pageSize: 50,
      incrementalReadMode: 'Off',
    },
    enrichmentSources: [],
    processingPattern: 'Single Source',
  };

  const coupaInvoiceSourceSchemaPack = await prismaClient.schemaPack.findFirst({
    where: { system: 'Coupa', object: 'Invoice' },
    orderBy: { createdAt: 'desc' },
    include: { fields: { orderBy: { path: 'asc' } } },
  });

  const coupaSourceProfile = coupaInvoiceSourceSchemaPack
    ? await upsertPublishedProfileBaseline({
        key: 'source_coupa_invoice_v1',
        direction: 'SOURCE',
        system: 'Coupa',
        interfaceName: 'Invoice',
        object: 'Invoice',
        profileName: 'Coupa Invoice Source Profile',
        description: 'Platform-owned baseline profile for the Coupa Invoice interface.',
        version: coupaInvoiceSourceSchemaPack.version || '1.0.0',
        fields: coupaInvoiceSourceSchemaPack.fields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description ?? undefined,
          example: field.example ?? undefined,
        })),
      })
    : null;

  // Copy source schema fields to target, overriding requiredness from workbook
  const coupaInvoiceTargetFields = coupaInvoiceSourceSchemaPack
    ? coupaInvoiceSourceSchemaPack.fields.map((f) => ({
        path: f.path,
        businessName: f.path,
        dataType: f.dataType,
        required: requiredTargetPaths.has(f.path),
        description: f.description ?? undefined,
        example: f.example ?? undefined,
      }))
    : [];

  // Identity mappings: only required target fields get pre-mapped
  const coupaInvoiceMappings = coupaInvoiceTargetFields
    .filter((f) => f.required)
    .map((f) => ({
      sourceField: f.path,
      targetField: f.path,
      mappingType: 'DIRECT' as const,
    }));

  console.log(`  ℹ Target fields: ${coupaInvoiceTargetFields.length} total, ${coupaInvoiceTargetFields.filter((f) => f.required).length} required`);

  const jsonTargetSchemaPack = await prismaClient.schemaPack.upsert({
    where: { id: 'sp_demo_json_invoice_v1' },
    update: {
      name: 'Demo JSON Invoice v1',
      system: 'Demo JSON',
      object: 'Invoice',
      version: '1',
      fields: {
        deleteMany: {},
        create: coupaInvoiceTargetFields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description,
          example: field.example,
        })),
      },
    },
    create: {
      id: 'sp_demo_json_invoice_v1',
      name: 'Demo JSON Invoice v1',
      system: 'Demo JSON',
      object: 'Invoice',
      version: '1',
      fields: {
        create: coupaInvoiceTargetFields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description,
          example: field.example,
        })),
      },
    },
  });

  const xmlTargetSchemaPack = await prismaClient.schemaPack.upsert({
    where: { id: 'sp_demo_xml_invoice_v1' },
    update: {
      name: 'Demo XML Invoice v1',
      system: 'Demo XML',
      object: 'Invoice',
      version: '1',
      fields: {
        deleteMany: {},
        create: coupaInvoiceTargetFields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description,
          example: field.example,
        })),
      },
    },
    create: {
      id: 'sp_demo_xml_invoice_v1',
      name: 'Demo XML Invoice v1',
      system: 'Demo XML',
      object: 'Invoice',
      version: '1',
      fields: {
        create: coupaInvoiceTargetFields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description,
          example: field.example,
        })),
      },
    },
  });

  const jsonTargetProfile = await upsertPublishedDemoTargetProfile({
    id: 'tp_coupa_invoice_json_demo',
    schemaPackId: jsonTargetSchemaPack.id,
    system: 'Demo JSON',
    object: 'Invoice',
    name: 'Coupa Invoice → JSON Target Profile',
    description: 'Prebuilt target profile for Coupa Invoice to JSON E2E testing.',
    version: '1.0.0',
    fields: coupaInvoiceTargetFields,
  });

  const xmlTargetProfile = await upsertPublishedDemoTargetProfile({
    id: 'tp_coupa_invoice_xml_demo',
    schemaPackId: xmlTargetSchemaPack.id,
    system: 'Demo XML',
    object: 'Invoice',
    name: 'Coupa Invoice → XML Target Profile',
    description: 'Prebuilt target profile for Coupa Invoice to XML E2E testing.',
    version: '1.0.0',
    fields: coupaInvoiceTargetFields,
  });

  // ── Template 1: Coupa Invoice → JSON Demo Target ─────────────────────────
  const jsonTargetStateBaseline = {
    targets: [
      {
        id: 't1',
        name: 'Downloadable JSON Target',
        priority: 1,
        connectionId: 'INTERNAL_DEMO',
        connectionName: 'Internal JSON Demo Receiver',
        connectionFamily: 'DEMO_JSON',
        healthStatus: 'OK',
        businessObject: 'Invoice',
        operation: 'POST',
        endpointPath: '/demo-targets/json/coupa-json-demo',
        writeMode: 'Create',
        upsertKeyField: '',
        batchSize: 1,
        params: [
          { key: 'demoTargetType', value: 'JSON' },
          { key: 'demoTargetName', value: 'coupa-json-demo' },
        ],
        conflictHandling: 'Overwrite',
      },
    ],
    deliveryPattern: 'Single Target',
    targetProfileState: jsonTargetProfile.targetProfileState,
  };

  const coupaJsonTemplate = await prismaClient.templateDefinition.upsert({
    where: { id: 'tpl_coupa_invoice_json_demo' },
    update: {
      name: 'Coupa Invoice → JSON',
      description: 'Prebuilt E2E flow: fetch approved Coupa invoices and generate a downloadable JSON payload using the platform-owned target profile.',
    },
    create: {
      id: 'tpl_coupa_invoice_json_demo',
      name: 'Coupa Invoice → JSON',
      description: 'Prebuilt E2E flow: fetch approved Coupa invoices and generate a downloadable JSON payload using the platform-owned target profile.',
      class: 'STARTER',
      sourceSystem: 'Coupa',
      targetSystem: 'Demo JSON',
      businessObject: 'INVOICE',
    },
  });

  const coupaJsonVersion = await prismaClient.templateVersion.upsert({
    where: { templateDefId_version: { templateDefId: coupaJsonTemplate.id, version: '1.0.0' } },
    update: {
      isLatest: true,
      sourceProfileFamilyId: coupaSourceProfile?.familyId ?? null,
      sourceProfileVersionId: coupaSourceProfile?.baselineProfileVersionId ?? null,
      targetProfileFamilyId: jsonTargetProfile.profileFamilyId,
      targetProfileVersionId: jsonTargetProfile.baselineProfileVersionId,
      workflowStructure: demoWorkflowStructure,
      defaultMappings: {
        mappings: coupaInvoiceMappings,
        validationBaseline: sharedValidationBaseline,
        responseHandlingBaseline: sharedResponseHandlingBaseline,
        operationsBaseline: sharedOperationsBaseline,
        sourceStateBaseline: coupaSourceStateBaseline,
        targetStateBaseline: jsonTargetStateBaseline,
      },
    },
    create: {
      templateDefId: coupaJsonTemplate.id,
      version: '1.0.0',
      sourceProfileFamilyId: coupaSourceProfile?.familyId ?? null,
      sourceProfileVersionId: coupaSourceProfile?.baselineProfileVersionId ?? null,
      targetProfileFamilyId: jsonTargetProfile.profileFamilyId,
      targetProfileVersionId: jsonTargetProfile.baselineProfileVersionId,
      workflowStructure: demoWorkflowStructure,
      isLatest: true,
      publishedAt: new Date(),
      defaultMappings: {
        mappings: coupaInvoiceMappings,
        validationBaseline: sharedValidationBaseline,
        responseHandlingBaseline: sharedResponseHandlingBaseline,
        operationsBaseline: sharedOperationsBaseline,
        sourceStateBaseline: coupaSourceStateBaseline,
        targetStateBaseline: jsonTargetStateBaseline,
      },
    },
  });

  if (coupaInvoiceSourceSchemaPack) {
    await prismaClient.schemaPackBinding.upsert({
      where: {
        templateVersionId_schemaPackId_role: {
          templateVersionId: coupaJsonVersion.id,
          schemaPackId: coupaInvoiceSourceSchemaPack.id,
          role: 'SOURCE',
        },
      },
      update: {},
      create: {
        templateVersionId: coupaJsonVersion.id,
        schemaPackId: coupaInvoiceSourceSchemaPack.id,
        role: 'SOURCE',
      },
    });
  }

  await prismaClient.schemaPackBinding.upsert({
    where: {
      templateVersionId_schemaPackId_role: {
        templateVersionId: coupaJsonVersion.id,
        schemaPackId: jsonTargetSchemaPack.id,
        role: 'TARGET',
      },
    },
    update: {},
    create: {
      templateVersionId: coupaJsonVersion.id,
      schemaPackId: jsonTargetSchemaPack.id,
      role: 'TARGET',
    },
  });
  console.log(`  ✓ Template: ${coupaJsonTemplate.name} v${coupaJsonVersion.version}`);

  // ── Template 2: Coupa Invoice → XML Demo Target ──────────────────────────
  const xmlTargetStateBaseline = {
    targets: [
      {
        id: 't1',
        name: 'Downloadable XML Target',
        priority: 1,
        connectionId: 'INTERNAL_DEMO',
        connectionName: 'Internal XML Demo Receiver',
        connectionFamily: 'DEMO_XML',
        healthStatus: 'OK',
        businessObject: 'Invoice',
        operation: 'POST',
        endpointPath: '/demo-targets/xml/coupa-xml-demo',
        writeMode: 'Create',
        upsertKeyField: '',
        batchSize: 1,
        params: [
          { key: 'demoTargetType', value: 'XML' },
          { key: 'demoTargetName', value: 'coupa-xml-demo' },
        ],
        conflictHandling: 'Overwrite',
      },
    ],
    deliveryPattern: 'Single Target',
    targetProfileState: xmlTargetProfile.targetProfileState,
  };

  const coupaXmlTemplate = await prismaClient.templateDefinition.upsert({
    where: { id: 'tpl_coupa_invoice_xml_demo' },
    update: {
      name: 'Coupa Invoice → XML',
      description: 'Prebuilt E2E flow: fetch approved Coupa invoices and generate a downloadable XML payload using the platform-owned target profile.',
    },
    create: {
      id: 'tpl_coupa_invoice_xml_demo',
      name: 'Coupa Invoice → XML',
      description: 'Prebuilt E2E flow: fetch approved Coupa invoices and generate a downloadable XML payload using the platform-owned target profile.',
      class: 'STARTER',
      sourceSystem: 'Coupa',
      targetSystem: 'Demo XML',
      businessObject: 'INVOICE',
    },
  });

  const coupaXmlVersion = await prismaClient.templateVersion.upsert({
    where: { templateDefId_version: { templateDefId: coupaXmlTemplate.id, version: '1.0.0' } },
    update: {
      isLatest: true,
      sourceProfileFamilyId: coupaSourceProfile?.familyId ?? null,
      sourceProfileVersionId: coupaSourceProfile?.baselineProfileVersionId ?? null,
      targetProfileFamilyId: xmlTargetProfile.profileFamilyId,
      targetProfileVersionId: xmlTargetProfile.baselineProfileVersionId,
      workflowStructure: demoWorkflowStructure,
      defaultMappings: {
        mappings: coupaInvoiceMappings,
        validationBaseline: sharedValidationBaseline,
        responseHandlingBaseline: sharedResponseHandlingBaseline,
        operationsBaseline: sharedOperationsBaseline,
        sourceStateBaseline: coupaSourceStateBaseline,
        targetStateBaseline: xmlTargetStateBaseline,
      },
    },
    create: {
      templateDefId: coupaXmlTemplate.id,
      version: '1.0.0',
      sourceProfileFamilyId: coupaSourceProfile?.familyId ?? null,
      sourceProfileVersionId: coupaSourceProfile?.baselineProfileVersionId ?? null,
      targetProfileFamilyId: xmlTargetProfile.profileFamilyId,
      targetProfileVersionId: xmlTargetProfile.baselineProfileVersionId,
      workflowStructure: demoWorkflowStructure,
      isLatest: true,
      publishedAt: new Date(),
      defaultMappings: {
        mappings: coupaInvoiceMappings,
        validationBaseline: sharedValidationBaseline,
        responseHandlingBaseline: sharedResponseHandlingBaseline,
        operationsBaseline: sharedOperationsBaseline,
        sourceStateBaseline: coupaSourceStateBaseline,
        targetStateBaseline: xmlTargetStateBaseline,
      },
    },
  });

  if (coupaInvoiceSourceSchemaPack) {
    await prismaClient.schemaPackBinding.upsert({
      where: {
        templateVersionId_schemaPackId_role: {
          templateVersionId: coupaXmlVersion.id,
          schemaPackId: coupaInvoiceSourceSchemaPack.id,
          role: 'SOURCE',
        },
      },
      update: {},
      create: {
        templateVersionId: coupaXmlVersion.id,
        schemaPackId: coupaInvoiceSourceSchemaPack.id,
        role: 'SOURCE',
      },
    });
  }

  await prismaClient.schemaPackBinding.upsert({
    where: {
      templateVersionId_schemaPackId_role: {
        templateVersionId: coupaXmlVersion.id,
        schemaPackId: xmlTargetSchemaPack.id,
        role: 'TARGET',
      },
    },
    update: {},
    create: {
      templateVersionId: coupaXmlVersion.id,
      schemaPackId: xmlTargetSchemaPack.id,
      role: 'TARGET',
    },
  });
  console.log(`  ✓ Template: ${coupaXmlTemplate.name} v${coupaXmlVersion.version}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // COUPA SIM → COUPA SUPPLIER  (Prebuilt template)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Source profile: Coupa SupplierInformation ──────────────────────────────
  const simSourceSchemaPack = await prismaClient.schemaPack.findUnique({
    where: { id: 'sp_coupa_supplier_info_v1' },
    include: { fields: { orderBy: { path: 'asc' } } },
  });

  const simSourceProfile = simSourceSchemaPack
    ? await upsertPublishedProfileBaseline({
        key: 'source_coupa_supplier_info_v1',
        direction: 'SOURCE',
        system: 'Coupa',
        interfaceName: 'SupplierInformation',
        object: 'SupplierInformation',
        profileName: 'Coupa Supplier Information Source Profile',
        description: 'Platform-owned baseline profile for the Coupa Supplier Information Management (SIM) interface.',
        version: simSourceSchemaPack.version || '1.0.0',
        fields: simSourceSchemaPack.fields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: field.required,
          description: field.description ?? undefined,
          example: field.example ?? undefined,
        })),
      })
    : null;

  // ── Target profile: Coupa Supplier ─────────────────────────────────────────
  // IMPORTANT: Target requiredness is NOT auto-set from the OpenAPI schema.
  // All fields default to required=false. Requiredness will be provided separately.
  const supplierTargetSchemaPack = await prismaClient.schemaPack.findUnique({
    where: { id: 'sp_coupa_supplier_v1' },
    include: { fields: { orderBy: { path: 'asc' } } },
  });

  const supplierTargetProfile = supplierTargetSchemaPack
    ? await upsertPublishedDemoTargetProfile({
        id: 'target_coupa_supplier_v1',
        schemaPackId: supplierTargetSchemaPack.id,
        system: 'Coupa',
        object: 'Supplier',
        name: 'Coupa Supplier Target Profile',
        description: 'Platform-owned baseline profile for the Coupa Supplier interface. Target requiredness is NOT auto-set from schema.',
        version: supplierTargetSchemaPack.version || '1.0.0',
        // Override ALL required flags to false — requiredness will be provided separately
        fields: supplierTargetSchemaPack.fields.map((field) => ({
          path: field.path,
          dataType: field.dataType,
          required: false, // NEVER auto-set from schema
          businessName: field.path,
          description: field.description ?? undefined,
          example: field.example ?? undefined,
        })),
      })
    : null;

  // ── Source state baseline: Coupa /supplier_information GET ──────────────────
  const simSourceStateBaseline = {
    primary: {
      connectionId: '',
      connectionName: '(Select Coupa connection)',
      connectionFamily: 'REST_OPENAPI',
      healthStatus: 'UNCONFIGURED',
      businessObject: 'SupplierInformation',
      operation: 'GET',
      endpointPath: '/api/supplier_information',
      queryParams: [
        { key: 'order_by', value: 'updated_at' },
        { key: 'dir', value: 'desc' },
        { key: 'return_object', value: 'limited' },
      ],
      headers: [],
      customParams: [],
      paginationEnabled: true,
      paginationStrategy: 'Page',
      pageSize: 50,
      incrementalReadMode: 'Off',
    },
    enrichmentSources: [],
    processingPattern: 'Single Source',
  };

  // ── Target state baseline: Coupa /suppliers PUT ────────────────────────────
  const supplierTargetStateBaseline = {
    targets: [
      {
        id: 't1',
        name: 'Coupa Supplier',
        priority: 1,
        connectionId: '',
        connectionName: '(Select Coupa connection)',
        connectionFamily: 'REST_OPENAPI',
        healthStatus: 'UNCONFIGURED',
        businessObject: 'Supplier',
        operation: 'PUT',
        endpointPath: '/api/suppliers',
        writeMode: 'Upsert',
        upsertKeyField: 'number',
        batchSize: 1,
        params: [],
        conflictHandling: 'Overwrite',
      },
    ],
    deliveryPattern: 'Single Target',
    targetProfileState: supplierTargetProfile
      ? {
          profileFamilyId: supplierTargetProfile.profileFamilyId,
          baselineProfileVersionId: supplierTargetProfile.baselineProfileVersionId,
          status: 'UP_TO_DATE',
        }
      : null,
  };

  // ── Mapping baseline (from Coupa SIM→Supplier mapping workbook) ────────────
  const simToSupplierMappings = [
    { sourceField: 'name', targetField: 'name', mappingType: 'DIRECT' as const },
    { sourceField: 'display-name', targetField: 'display-name', mappingType: 'DIRECT' as const },
    { sourceField: 'supplier-number', targetField: 'number', mappingType: 'DIRECT' as const },
    {
      sourceField: 'fed-reportable',
      targetField: 'status',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'CONDITIONAL',
        description: "If fed-reportable=true → status='inactive'; if false → status='active'",
        rule: "fed-reportable == true ? 'inactive' : 'active'",
      },
    },
    { sourceField: 'content-groups::name', targetField: 'content-groups', mappingType: 'DIRECT' as const },
    { sourceField: 'payment-term::code', targetField: 'payment-terms', mappingType: 'DIRECT' as const },
    { sourceField: 'po-method', targetField: 'po-method', mappingType: 'DIRECT' as const },
    { sourceField: 'po-change-method', targetField: 'po-change-method', mappingType: 'DIRECT' as const },
    { sourceField: 'po-email', targetField: 'po-email', mappingType: 'DIRECT' as const },
    {
      sourceField: 'supplier-information-contacts::email',
      targetField: 'primary-contact::email',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map contact email where supplier-information-contacts.kind = Primary',
        filter: "supplier-information-contacts.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-contacts::name-given',
      targetField: 'primary-contact::name-given',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map contact first name where supplier-information-contacts.kind = Primary',
        filter: "supplier-information-contacts.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-contacts::name-family',
      targetField: 'primary-contact::name-family',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map contact last name where supplier-information-contacts.kind = Primary',
        filter: "supplier-information-contacts.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::street-address',
      targetField: 'primary-address::street1',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address street1 where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::street-address2',
      targetField: 'primary-address::street2',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address street2 where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::city',
      targetField: 'primary-address::city',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address city where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::state-region',
      targetField: 'primary-address::state',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address state where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::postal-code',
      targetField: 'primary-address::postal-code',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address postal code where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::country::code',
      targetField: 'primary-address::country::code',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map address country code where supplier-information-addresses.kind = Primary',
        filter: "supplier-information-addresses.kind == 'Primary'",
      },
    },
    {
      sourceField: 'supplier-information-addresses::supplier-information-tax-registrations::number',
      targetField: 'primary-address::vat-number',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map VAT number where addresses.kind = Primary AND tax-registrations.local = false',
        filter: "supplier-information-addresses.kind == 'Primary' && supplier-information-tax-registrations.local == false",
      },
    },
    {
      sourceField: 'supplier-information-addresses::supplier-information-tax-registrations::country::code',
      targetField: 'primary-address::vat-country::code',
      mappingType: 'DIRECT' as const,
    },
    {
      sourceField: 'supplier-information-addresses::supplier-information-tax-registrations::number',
      targetField: 'primary-address::local-tax-number',
      mappingType: 'CONDITIONAL' as const,
      transformConfig: {
        type: 'FILTER',
        description: 'Map local tax number where addresses.kind = Primary AND tax-registrations.local = true',
        filter: "supplier-information-addresses.kind == 'Primary' && supplier-information-tax-registrations.local == true",
      },
    },
    { sourceField: 'allow-inv-from-connect', targetField: 'allow-inv-from-connect', mappingType: 'DIRECT' as const },
    { sourceField: 'buyer-hold', targetField: 'buyer-hold', mappingType: 'DIRECT' as const },
    { sourceField: 'allow-inv-no-backing-doc-from-connect', targetField: 'allow-inv-no-backing-doc-from-connect', mappingType: 'DIRECT' as const },
    { sourceField: 'allow-inv-unbacked-lines-from-connect', targetField: 'allow-inv-unbacked-lines-from-connect', mappingType: 'DIRECT' as const },
  ];

  // ── Validation baseline (SIM-specific) ─────────────────────────────────────
  const simValidationBaseline = {
    policyMode: 'Balanced',
    errorConfig: {
      logEnabled: true,
      dlqEnabled: false,
      dlqTopic: '',
      notifyChannel: 'None',
      notifyRecipients: '',
      includeRecordData: false,
    },
    rules: [
      {
        id: 'v1',
        name: 'SIM record name must be present',
        field: 'name',
        operator: 'IS_NOT_EMPTY',
        value: '',
        severity: 'Error',
        enabled: true,
        source: 'auto',
      },
      {
        id: 'v2',
        name: 'Supplier number must be present',
        field: 'supplier-number',
        operator: 'IS_NOT_EMPTY',
        value: '',
        severity: 'Error',
        enabled: true,
        source: 'auto',
      },
      {
        id: 'v3',
        name: 'Target payload must not be empty',
        field: '__payload',
        operator: 'IS_NOT_EMPTY',
        value: '',
        severity: 'Error',
        enabled: true,
        source: 'auto',
      },
    ],
  };

  // ── Template definition ────────────────────────────────────────────────────
  await upsertCertifiedPrebuiltTemplate({
    id: 'tpl_coupa_sim_to_supplier',
    name: 'Coupa SIM → Coupa Supplier',
    description: 'Fetch recently added or updated supplier information records from Coupa SIM, map them to Coupa Supplier fields, apply basic transformations, and send them to Coupa Supplier.',
    sourceSystem: 'Coupa',
    targetSystem: 'Coupa',
    businessObject: 'SUPPLIER_INFORMATION',
    version: '1.0.0',
    sourceSchemaPackId: simSourceSchemaPack?.id ?? 'sp_coupa_supplier_info_v1',
    targetSchemaPackId: supplierTargetSchemaPack?.id ?? 'sp_coupa_supplier_v1',
    sourceProfileFamilyId: simSourceProfile?.familyId ?? null,
    sourceProfileVersionId: simSourceProfile?.baselineProfileVersionId ?? null,
    targetProfileFamilyId: supplierTargetProfile?.profileFamilyId ?? null,
    targetProfileVersionId: supplierTargetProfile?.baselineProfileVersionId ?? null,
    workflowStructure: demoWorkflowStructure,
    defaultMappings: {
      mappings: simToSupplierMappings,
      validationBaseline: simValidationBaseline,
      responseHandlingBaseline: sharedResponseHandlingBaseline,
      operationsBaseline: sharedOperationsBaseline,
      sourceStateBaseline: simSourceStateBaseline,
      targetStateBaseline: supplierTargetStateBaseline,
    },
  });
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
