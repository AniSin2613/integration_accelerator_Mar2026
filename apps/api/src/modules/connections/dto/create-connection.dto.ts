import { IsString, IsNotEmpty, IsEnum, IsObject, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ConnectionFamily } from '@cogniviti/domain';

export const V1_CONNECTION_FAMILIES = [
  ConnectionFamily.REST_OPENAPI,
  ConnectionFamily.WEBHOOK,
  ConnectionFamily.SFTP_FILE,
  ConnectionFamily.JDBC_SQL,
  ConnectionFamily.S3,
] as const;

export class CreateConnectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsEnum(ConnectionFamily)
  @IsIn(V1_CONNECTION_FAMILIES)
  family!: ConnectionFamily;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  platformLabel?: string;

  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  workspaceSlug?: string;

  @IsObject()
  config!: Record<string, unknown>;
}
