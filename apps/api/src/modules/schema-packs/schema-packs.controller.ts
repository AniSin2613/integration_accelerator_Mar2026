import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('schema-packs')
@UseGuards(AuthGuard)
export class SchemaPacksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.schemaPack.findMany({
      select: { id: true, name: true, system: true, object: true, version: true },
      orderBy: [{ system: 'asc' }, { object: 'asc' }, { version: 'desc' }],
    });
  }
}
