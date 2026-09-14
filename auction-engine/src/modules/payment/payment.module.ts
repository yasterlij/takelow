import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentController } from "./payment.controller";
import { PaymentLinkService } from "./payment-link.service";
import { PaymentService } from "./payment.service";
import { PaymentReminderService } from "./payment-reminder.service";
import { SikinaService } from "./sikina.service";
import { AwashService } from "./awash.service";
import { SikinaWebhookController } from "./sikina-webhook.controller";
import { AwashWebhookController } from "./awash-webhook.controller";
import { WinnerModule } from "../winner/winner.module";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { WorkerModule } from "../worker/worker.module";

@Module({
  imports: [
    WinnerModule,
    WorkerModule,
    ConfigModule,
  ],
  controllers: [
    PaymentController,
    SikinaWebhookController,
    AwashWebhookController,
  ],
  providers: [
    PaymentLinkService,
    PaymentService,
    PaymentReminderService,
    SikinaService,
    AwashService,
    BidEncryptionService,
  ],
  exports: [PaymentService, SikinaService, AwashService],
})
export class PaymentModule {}
