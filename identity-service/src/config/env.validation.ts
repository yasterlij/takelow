import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3000;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  INTERNAL_API_KEY: string;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  return validated;
}
