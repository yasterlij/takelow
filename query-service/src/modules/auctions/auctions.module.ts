import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { BidEncryptionService } from '../common/bid-encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([Auction, Bid])],
  controllers: [AuctionsController],
  providers: [AuctionsService, BidEncryptionService],
})
export class AuctionsModule {}
