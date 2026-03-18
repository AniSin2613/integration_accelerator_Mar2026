import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { MappingType, MappingEvidenceSource } from '@cogniviti/domain';

export class CreateMappingRuleDto {
  @IsString()
  @IsNotEmpty()
  sourceField!: string;

  @IsString()
  @IsNotEmpty()
  targetField!: string;

  @IsEnum(MappingType)
  @IsOptional()
  mappingType?: MappingType;

  @IsOptional()
  @IsObject()
  transformConfig?: Record<string, unknown>;

  // AI suggestion fields — only accepted when coming from the AI suggestion pipeline;
  // human must approve before status changes to APPROVED.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  aiConfidence?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(MappingEvidenceSource, { each: true })
  aiEvidenceSources?: MappingEvidenceSource[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aiEvidenceReferences?: string[];

  // Deprecated: kept for backward compatibility with existing seeds/clients.
  @IsOptional()
  @IsString()
  aiEvidenceSource?: string;

  @IsOptional()
  @IsString()
  aiExplanation?: string;
}
