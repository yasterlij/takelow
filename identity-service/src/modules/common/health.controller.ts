import { Controller, Get, Inject, Res, HttpCode } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
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

    if (checks['status'] === 'degraded') {
      res.status(503);
    }
    return checks;
  }
}
