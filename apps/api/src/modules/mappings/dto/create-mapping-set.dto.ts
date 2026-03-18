import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateMappingRuleDto } from './create-mapping-rule.dto';

export class CreateMappingSetDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMappingRuleDto)
  rules!: CreateMappingRuleDto[];
}
