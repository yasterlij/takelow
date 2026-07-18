import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'takelow-jwt-secret',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://admin:secret@localhost:5432/takelow_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  bidFee: parseInt(process.env.BID_FEE || '50', 10),
}));
