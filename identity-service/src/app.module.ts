import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { typeOrmConfig } from './config/typeorm.config';
import { appConfig } from './config/env.config';
import { validate } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { OtpModule } from './modules/otp/otp.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/common/health.controller';
import { redis } from './config/redis.config';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    WalletModule,
    OtpModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: 'REDIS_CLIENT', useValue: redis },
  ],
  exports: ['REDIS_CLIENT'],
})
export class AppModule {}
