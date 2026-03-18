import { Controller, Get } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

// Controller is registered in HealthModule
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'UP', service: 'cogniviti-bridge-api', timestamp: new Date().toISOString() };
  }
}
