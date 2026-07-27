import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'takelow-jwt-secret') {
    throw new Error('JWT_SECRET environment variable is required and must not be the default value');
  }
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl:
      process.env.DATABASE_URL ||
      'postgresql://admin:secret@localhost:5432/takelow_db',
    readReplicaUrl: process.env.READ_REPLICA_URL || undefined,
  };
});
