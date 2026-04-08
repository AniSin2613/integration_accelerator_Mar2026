import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { ReleasesModule } from './modules/releases/releases.module';
import { RunsModule } from './modules/runs/runs.module';
import { AuditModule } from './modules/audit/audit.module';
import { CamelModule } from './modules/camel/camel.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { TargetProfilesModule } from './modules/target-profiles/target-profiles.module';
import { SchemaPacksModule } from './modules/schema-packs/schema-packs.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { DemoTargetsModule } from './modules/demo-targets/demo-targets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CopilotModule } from './modules/copilot/copilot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    WorkspacesModule,
    MembershipsModule,
    ConnectionsModule,
    TemplatesModule,
    MappingsModule,
    ReleasesModule,
    RunsModule,
    AuditModule,
    CamelModule,
    IntegrationsModule,
    TargetProfilesModule,
    SchemaPacksModule,
    ProfilesModule,
    DemoTargetsModule,
    DashboardModule,
    CopilotModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
