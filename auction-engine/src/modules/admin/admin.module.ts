import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionManageController } from './auction-manage.controller';
import { AuctionManageService } from './auction-manage.service';
import { Auction } from '../winner/entities/auction.entity';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Product])],
  controllers: [AuctionManageController],
  providers: [AuctionManageService],
})
export class AdminModule {}