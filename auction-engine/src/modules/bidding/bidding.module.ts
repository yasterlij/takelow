import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiddingController } from './bidding.controller';
import { BiddingService } from './bidding.service';
import { Bid } from './entities/bid.entity';
import { Auction } from '../winner/entities/auction.entity';
import { AuctionGateway } from './gateway/auction.gateway';
import { BiddingWindowInterceptor } from '../common/bidding-window.interceptor';
import { ThrottleGuard } from '../common/throttle.guard';
import { NonceGuard } from '../common/nonce.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Bid, Auction])],
  controllers: [BiddingController],
  providers: [
    BiddingService,
    AuctionGateway,
    BiddingWindowInterceptor,
    ThrottleGuard,
    NonceGuard,
  ],
  exports: [BiddingService, AuctionGateway],
})
export class BiddingModule {}
