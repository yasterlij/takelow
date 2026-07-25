import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { EpsteinWalletService } from './epstein.service';
import { User } from '../auth/entities/user.entity';
import { Transaction } from './entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction]), HttpModule, ConfigModule],
  controllers: [WalletController],
  providers: [WalletService, EpsteinWalletService],
  exports: [WalletService],
})
export class WalletModule {}