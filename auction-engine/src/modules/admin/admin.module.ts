import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuctionManageController } from "./auction-manage.controller";
import { AuctionManageService } from "./auction-manage.service";
import { ImageService } from "./image.service";
import { Auction } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { Product } from "./entities/product.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { WinnerModule } from "../winner/winner.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Auction, Winner, Product, Bid]),
    WinnerModule,
  ],
  controllers: [AuctionManageController],
  providers: [AuctionManageService, ImageService],
})
export class AdminModule {}
