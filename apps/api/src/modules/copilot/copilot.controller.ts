import { Body, Controller, Param, Post } from '@nestjs/common';
import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CopilotService } from './copilot.service';

class AskFieldDto {
  @IsString()
  targetField!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceFields?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(10)
  maxCandidates?: number;

  @IsOptional()
  @IsString()
  context?: string;
}

@Controller('integrations/:integrationId/copilot')
export class CopilotController {
  constructor(private readonly service: CopilotService) {}

  @Post('ask-field')
  askField(
    @Param('integrationId') integrationId: string,
    @Body() dto: AskFieldDto,
  ) {
    return this.service.askField(integrationId, dto);
  }
}
