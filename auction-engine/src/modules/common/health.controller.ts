import { Controller, Get, Res } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Response } from "express";

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
  async check(@Res({ passthrough: true }) res: Response) {
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

    if (checks.status === "degraded") {
      res.status(503);
    }
    return checks;
  }

  @Get("ready")
  async readiness(@Res({ passthrough: true }) res: Response) {
    try {
      await this.dataSource.query("SELECT 1");
      return { status: "ready" };
    } catch {
      res.status(503);
      return { status: "not ready" };
    }
  }
}
