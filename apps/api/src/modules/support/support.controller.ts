import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { SupportService } from './support.service';

class CreateTicketDto {
  @IsString()
  @MinLength(1)
  subject!: string;

  @IsString()
  @MinLength(1)
  message!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Public()
  @Post()
  create(@Req() req: Request, @Body() dto: CreateTicketDto) {
    const user = (req as any).user as { userId?: string } | undefined;
    return this.support.create({
      userId: user?.userId,
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });
  }
}
