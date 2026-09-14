import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WalletController } from './wallet.controller';
import { WalletPinService } from './wallet-pin.service';
import { WalletService } from './wallet.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [WalletController],
  providers: [WalletService, WalletPinService],
  exports: [WalletService, WalletPinService],
})
export class WalletModule {}