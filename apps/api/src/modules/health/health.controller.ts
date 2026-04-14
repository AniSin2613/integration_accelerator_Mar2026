import { Controller, Get } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';

// Controller is registered in HealthModule
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: 'UP', service: 'cogniviti-bridge-api', timestamp: new Date().toISOString() };
  }
}
