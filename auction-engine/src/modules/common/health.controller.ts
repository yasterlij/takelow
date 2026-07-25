import { Controller, Get } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

interface HealthCheckResult {
  status: string;
  timestamp: string;
  uptime: number;
  redis?: string;
  database?: string;
}

@Controller("health")
export class HealthController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    const checks: HealthCheckResult = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    try {
      await this.redis.ping();
      checks.redis = "connected";
    } catch {
      checks.redis = "disconnected";
      checks.status = "degraded";
    }

    try {
      await this.dataSource.query("SELECT 1");
      checks.database = "connected";
    } catch {
      checks.database = "disconnected";
      checks.status = "degraded";
    }

    return checks;
  }

  @Get("ready")
  async readiness() {
    try {
      await this.dataSource.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return { status: "not ready" };
    }
  }
}
