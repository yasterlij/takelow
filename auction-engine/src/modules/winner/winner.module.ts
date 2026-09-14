import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { WinnerService } from "./winner.service";
import { AuctionClosureService } from "./auction-closure.service";
import { AuctionClosureEventsService } from "./auction-closure-events.service";
import { AuctionNotificationService } from "./auction-notification.service";
import { WorkerModule } from "../worker/worker.module";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    WorkerModule,
  ],
  providers: [
    WinnerService,
    AuctionClosureService,
    AuctionClosureEventsService,
    AuctionNotificationService,
    BidEncryptionService,
  ],
  exports: [WinnerService, AuctionClosureService],
})
export class WinnerModule {}
