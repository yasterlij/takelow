import { Controller, Get, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = { status: 'ok' };

    try {
      await this.dataSource.query('SELECT 1');
      checks['database'] = 'connected';
    } catch {
      checks['database'] = 'disconnected';
      checks['status'] = 'degraded';
    }

    try {
      await this.redis.ping();
      checks['redis'] = 'connected';
    } catch {
      checks['redis'] = 'disconnected';
      checks['status'] = 'degraded';
    }

    return checks;
  }
}
