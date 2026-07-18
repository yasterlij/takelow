import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './modules/common/exception.filter';
import { RequestIdMiddleware } from './modules/common/request-id.middleware';
import { StructuredLogger } from './modules/common/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger(),
  });

  const configService = app.get(ConfigService);
  const port = configService.get('app.port', 3000);

  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.listen(port);
}

bootstrap();
