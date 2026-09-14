import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BiddingController } from "./bidding.controller";
import { BiddingService } from "./bidding.service";
import { AuctionGateway } from "./gateway/auction.gateway";
import { BiddingWindowInterceptor } from "../common/bidding-window.interceptor";
import { ThrottleGuard } from "../common/throttle.guard";
import { NonceGuard } from "../common/nonce.guard";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { WinnerModule } from "../winner/winner.module";
import { WorkerModule } from "../worker/worker.module";
import { AuctionReviewService } from "../admin/auction-review.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "incoming-bids" }),
    WinnerModule,
    WorkerModule,
  ],
  controllers: [BiddingController],
  providers: [
    BiddingService,
    AuctionGateway,
    AuctionReviewService,
    BiddingWindowInterceptor,
    ThrottleGuard,
    NonceGuard,
    BidEncryptionService,
  ],
  exports: [BiddingService, AuctionGateway, BidEncryptionService],
})
export class BiddingModule {}
