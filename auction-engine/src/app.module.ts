import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bullmq";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { typeOrmConfig } from "./config/typeorm.config";
import { appConfig } from "./config/env.config";
import { validate } from "./config/env.validation";
import { BiddingModule } from "./modules/bidding/bidding.module";
import { WinnerModule } from "./modules/winner/winner.module";
import { WorkerModule } from "./modules/worker/worker.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { JwtStrategy } from "./modules/common/jwt.strategy";
import { redisProvider } from "./modules/common/redis.provider";
import { HealthController } from "./modules/common/health.controller";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(config.get<string>("app.redisUrl")!).hostname,
          port: parseInt(
            new URL(config.get<string>("app.redisUrl")!).port || "6379",
            10,
          ),
        },
      }),
    }),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get("app.jwtSecret"),
        signOptions: { expiresIn: "15m" },
      }),
    }),
    BiddingModule,
    WinnerModule,
    WorkerModule,
    AdminModule,
    PaymentModule,
  ],
  controllers: [HealthController],
  providers: [JwtStrategy, redisProvider],
  exports: [redisProvider],
})
export class AppModule {}
