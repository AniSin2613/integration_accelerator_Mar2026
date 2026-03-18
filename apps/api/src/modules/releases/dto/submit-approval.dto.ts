import { IsString, IsOptional } from 'class-validator';

export class SubmitApprovalDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
