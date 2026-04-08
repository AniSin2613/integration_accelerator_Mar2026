import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { OverlayType } from '@cogniviti/domain';

export class CreateOverlayDto {
  @IsEnum(OverlayType)
  @IsNotEmpty()
  overlayType!: OverlayType;

  @IsObject()
  @IsNotEmpty()
  config!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateOverlayDto {
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
