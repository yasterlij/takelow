import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';
import { Auction } from '../auctions/entities/auction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auction])],
  controllers: [AdminController],
  providers: [AdminStatsService],
})
export class AdminModule {}
