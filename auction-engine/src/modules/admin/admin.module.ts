import { Module } from "@nestjs/common";
import { AuctionAdminService } from "./auction-admin.service";
import { AuctionManageController } from "./auction-manage.controller";
import { AuctionReviewService } from "./auction-review.service";
import { ImageService } from "./image.service";
import { ProductAdminService } from "./product-admin.service";
import { ProductApprovalController } from "./product-approval.controller";
import { WinnerModule } from "../winner/winner.module";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Module({
  imports: [
    WinnerModule,
  ],
  controllers: [AuctionManageController, ProductApprovalController],
  providers: [
    AuctionAdminService,
    AuctionReviewService,
    ProductAdminService,
    ImageService,
    BidEncryptionService,
  ],
})
export class AdminModule {}
