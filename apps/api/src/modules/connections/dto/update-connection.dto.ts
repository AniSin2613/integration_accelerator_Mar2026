import { IsEnum, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConnectionFamily } from '@cogniviti/domain';
import { V1_CONNECTION_FAMILIES } from './create-connection.dto';

export class UpdateConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(ConnectionFamily)
  @IsIn(V1_CONNECTION_FAMILIES)
  family?: ConnectionFamily;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  platformLabel?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
