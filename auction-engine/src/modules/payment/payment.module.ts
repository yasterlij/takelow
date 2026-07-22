import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { SikinaService } from './sikina.service';
import { SikinaWebhookController } from './sikina-webhook.controller';
import { Auction } from '../winner/entities/auction.entity';
import { Bid } from '../bidding/entities/bid.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { WinnerModule } from '../winner/winner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Bid, PaymentTransaction]),
    WinnerModule,
    ConfigModule,
  ],
  controllers: [PaymentController, SikinaWebhookController],
  providers: [PaymentService, SikinaService],
  exports: [PaymentService, SikinaService],
})
export class PaymentModule {}
