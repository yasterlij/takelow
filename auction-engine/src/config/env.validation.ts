import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, IsNumber, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'takelow-jwt-secret';

  @IsString()
  DATABASE_URL: string;

  @IsString()
  REDIS_URL: string;

  @IsNumber()
  @IsOptional()
  BID_FEE: number = 50;
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
