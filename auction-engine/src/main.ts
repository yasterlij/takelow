import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./modules/common/exception.filter";
import { RequestIdMiddleware } from "./modules/common/request-id.middleware";
import { StructuredLogger } from "./modules/common/logger.service";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new StructuredLogger(),
    rawBody: true,
  });

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost",
    ],
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get("app.port", 3000);

  app.use(new RequestIdMiddleware().use);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.setGlobalPrefix("api/v1");

  app.useStaticAssets(path.join(process.cwd(), "uploads"), {
    prefix: "/uploads",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  await app.listen(port);
}

bootstrap();
