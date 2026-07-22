import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { WinnerService } from './winner.service';
import { AuctionClosureService } from './auction-closure.service';
import { AuctionNotificationService } from './auction-notification.service';
import { Auction } from './entities/auction.entity';
import { Bid } from '../bidding/entities/bid.entity';
import { WorkerModule } from '../worker/worker.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Auction, Bid]),
    WorkerModule,
  ],
  providers: [WinnerService, AuctionClosureService, AuctionNotificationService],
  exports: [WinnerService, AuctionClosureService],
})
export class WinnerModule {}
