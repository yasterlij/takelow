import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WinnerService } from './winner.service';
import { AuctionClosureService } from './auction-closure.service';
import { Auction } from './entities/auction.entity';
import { Bid } from '../bidding/entities/bid.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid]),
  ],
  providers: [WinnerService, AuctionClosureService],
  exports: [WinnerService, AuctionClosureService],
})
export class WinnerModule {}
