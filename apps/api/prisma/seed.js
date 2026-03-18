"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
            description: 'Certified business accelerator. Syncs approved invoices from Coupa to SAP FI via BAPI_ACC_DOCUMENT_POST. Includes supplier normalization, tax code mapping, and cost center derivation.',
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
            description: 'Technical starter template. Pre-scaffolded REST-to-REST passthrough pattern with configurable source endpoint, target endpoint, mapping, and validation slots. Not a blank canvas.',
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
            secretRef: 'secrets/dev/rest-source-token', // reference, not raw value
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
    console.log('\n✅ Seed complete.');
}
main()
    .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map