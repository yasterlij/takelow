import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionManageController } from './auction-manage.controller';
import { AuctionManageService } from './auction-manage.service';
import { Auction } from '../winner/entities/auction.entity';
import { Product } from './entities/product.entity';
import { Bid } from '../bidding/entities/bid.entity';
import { WinnerModule } from '../winner/winner.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Product, Bid]),
    WinnerModule,
  ],
  controllers: [AuctionManageController],
  providers: [AuctionManageService],
})
export class AdminModule {}