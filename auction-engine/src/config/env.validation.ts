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

  @IsString()
  @IsOptional()
  SIKINA_SECRET_KEY: string = '';

  @IsString()
  @IsOptional()
  SIKINA_WEBHOOK_SECRET: string = '';

  @IsString()
  @IsOptional()
  SIKINA_BASE_URL: string = 'https://sandbox.sikinapay.com';

  @IsString()
  @IsOptional()
  SIKINA_SUCCESS_REDIRECT_URL: string = '';

  @IsString()
  @IsOptional()
  SIKINA_FAILED_REDIRECT_URL: string = '';

  @IsString()
  @IsOptional()
  SIKINA_WEBHOOK_URL: string = '';

  @IsString()
  @IsOptional()
  APP_BASE_URL: string = 'http://localhost:5173';
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
