import { IsOptional, IsString, IsObject } from 'class-validator';

export class BindConnectionDto {
  @IsOptional()
  @IsString()
  secretRef?: string;

  @IsOptional()
  @IsObject()
  overrideConfig?: Record<string, unknown>;
}
