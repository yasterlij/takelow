import {
  Injectable,
  Logger,
  HttpException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRedis } from "../common/redis.decorator";
import { Redis } from "ioredis";
import { WinnerService } from "../winner/winner.service";
import { SikinaService } from "./sikina.service";
import { AwashService } from "./awash.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { PaymentLinkService } from "./payment-link.service";
import { PrismaService } from "../../prisma/prisma.service";

const PAYMENT_DEADLINE_HOURS = 24;
const WINNING_PAYMENT_TYPES = ["WINNING_BID", "WALLET"];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private winnerService: WinnerService,
    private sikinaService: SikinaService,
    private awashService: AwashService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
    private notificationDispatchService: NotificationDispatchService,
    private paymentLinkService: PaymentLinkService,
  ) {}

  generateProxyUrl(transactionId: string): string {
    return this.paymentLinkService.generateProxyUrl(transactionId);
  }

  validateProxyToken(transactionId: string, token: string): boolean {
    return this.paymentLinkService.validateProxyToken(transactionId, token);
  }

  async fetchAndProxyPaymentPage(
    paymentUrl: string,
  ): Promise<{ body: string; contentType: string }> {
    return this.paymentLinkService.fetchAndProxyPaymentPage(paymentUrl);
  }

  async createPaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    description: string,
    paymentMethod: "SIKINAPAY" | "AWASH" = "SIKINAPAY",
    customerPhone?: string,
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    return this.paymentLinkService.createPaymentLink(
      auctionId,
      userId,
      amount,
      description,
      paymentMethod,
      customerPhone,
    );
  }

  async findTransaction(
    auctionId: string,
    userId: string,
  ): Promise<any> {
    return this.paymentLinkService.findTransaction(auctionId, userId);
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<any> {
    return this.paymentLinkService.findTransactionById(transactionId);
  }

  async createBidFeePaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    paymentMethod: "SIKINAPAY" | "AWASH" = "SIKINAPAY",
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    return this.paymentLinkService.createBidFeePaymentLink(
      auctionId,
      userId,
      amount,
      paymentMethod,
    );
  }

  private async deductFromWallet(
    userId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const identityBase =
      process.env.IDENTITY_SERVICE_URL || "http://localhost:3001";

    const res = await fetch(`${identityBase}/api/v1/wallet/deduct-fee`, {
      method: "POST",
      headers: this.getInternalHeaders(),
      body: JSON.stringify({ user_id: userId, amount }),
    });

    if (!res.ok) {
      const text = await res.text();
      let message: string;
      try {
        const parsed = JSON.parse(text);
        message = parsed.message || text;
      } catch {
        message = text;
      }
      if (res.status >= 400 && res.status < 500) {
        throw new HttpException(message, res.status);
      }
      throw new ServiceUnavailableException("Wallet service unavailable");
    }
  }

  async createBidFeeWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const existing = await this.prisma.repository("paymentTransaction").findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: "BID_FEE",
        status: "SUCCESSFUL",
      },
    });
    if (existing) return;

    await this.deductFromWallet(
      userId,
      amount,
      `Bid fee for auction ${auctionId}`,
    );

    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `fee-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

    const transaction = {
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      status: "SUCCESSFUL",
      currency: "ETB",
      payment_type: "BID_FEE",
      gateway: "AWASH",
    };
    await this.prisma.repository("paymentTransaction").save(transaction);
    this.logger.log(
      `Bid fee paid via wallet for auction ${auctionId}, user ${userId}`,
    );
  }

  async createWinningWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const existing = await this.prisma.repository("paymentTransaction").findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: "WALLET",
        status: "SUCCESSFUL",
      },
    });
    if (existing) return;

    await this.deductFromWallet(
      userId,
      amount,
      `Winning payment for auction ${auctionId}`,
    );

    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `win-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

    const encryptedAmount = this.bidEncryptionService.encrypt(amount);

    const transaction = {
      auction_id: auctionId,
      user_id: userId,
      amount,
      encrypted_amount: encryptedAmount,
      client_reference_id: clientReferenceId,
      status: "SUCCESSFUL",
      currency: "ETB",
      payment_type: "WALLET",
      gateway: "AWASH",
    };
    await this.prisma.repository("paymentTransaction").save(transaction);

    await this.markAsPaid(auctionId, userId);

    this.logger.log(
      `Winning amount paid via wallet for auction ${auctionId}, user ${userId}`,
    );
  }

  async getBidFeePaymentStatus(
    auctionId: string,
    userId?: string,
  ): Promise<{ status: string; payment_url: string | null }> {
    const where: any = {
      auction_id: auctionId,
      payment_type: "BID_FEE",
    };
    if (userId) where.user_id = userId;

    const transaction = await this.prisma.repository("paymentTransaction").findOne({
      where,
      order: { created_at: "DESC" },
    });

    let status = transaction?.status || "NONE";

    if (status === "PENDING" && transaction?.client_reference_id) {
      try {
        const transactionDate = transaction.created_at
          .toISOString()
          .split("T")[0];
        this.logger.log(
          `Querying SikinaPay for ${transaction.client_reference_id} on ${transactionDate}`,
        );
        const remoteStatus = await this.sikinaService.getPaymentStatus(
          transaction.client_reference_id,
          transactionDate,
        );
        this.logger.log(
          `SikinaPay returned ${remoteStatus} for ${transaction.client_reference_id}`,
        );
        if (remoteStatus === "SUCCESSFUL") {
          await this.handleSuccessfulPayment(
            transaction.client_reference_id,
            "",
            {},
          );
          status = "SUCCESSFUL";
        } else if (
          ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(remoteStatus)
        ) {
          await this.prisma.repository("paymentTransaction").update(
            { id: transaction.id },
            { status: remoteStatus },
          );
          status = remoteStatus;
        }
      } catch (e) {
        this.logger.warn(
          `SikinaPay status check failed for ${transaction?.client_reference_id}: ${e.message}`,
        );
      }
    }

    return {
      status,
      payment_url:
        transaction?.sikina_payment_url ||
        transaction?.awash_payment_url ||
        null,
    };
  }

  async getWinningPaymentStatus(
    auctionId: string,
    userId?: string,
  ): Promise<{ status: string; payment_url: string | null; gateway?: string }> {
    const where: any = {
      auction_id: auctionId,
      payment_type: { in: WINNING_PAYMENT_TYPES },
    };
    if (userId) where.user_id = userId;

    const transaction = await this.prisma.repository("paymentTransaction").findOne({
      where,
      order: { created_at: "DESC" },
    });

    let status = transaction?.status || "NONE";
    const gateway = transaction?.gateway || "SIKINAPAY";

    if (status === "PENDING" && transaction?.client_reference_id) {
      try {
        const transactionDate = transaction.created_at
          .toISOString()
          .split("T")[0];
        const remoteStatus =
          transaction.gateway === "AWASH"
            ? await this.awashService.getPaymentStatus(
                transaction.client_reference_id,
              )
            : await this.sikinaService.getPaymentStatus(
                transaction.client_reference_id,
                transactionDate,
              );
        if (remoteStatus === "SUCCESSFUL") {
          await this.handleSuccessfulPayment(
            transaction.client_reference_id,
            "",
            {},
          );
          status = "SUCCESSFUL";
        } else if (
          ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(remoteStatus)
        ) {
          await this.prisma.repository("paymentTransaction").update(
            { id: transaction.id },
            { status: remoteStatus },
          );
          status = remoteStatus;
        }
      } catch (e) {
        this.logger.warn(
          `Winning payment status check failed for ${transaction.client_reference_id}: ${e.message}`,
        );
      }
    }

    return {
      status,
      payment_url:
        transaction?.sikina_payment_url ||
        transaction?.awash_payment_url ||
        null,
      gateway,
    };
  }

  async confirmWinningPayment(
    auctionId: string,
    userId: string,
  ): Promise<void> {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error("Auction not found");
    if (auction.winner_user_id !== userId) {
      throw new Error("Only the winner can confirm payment");
    }

    const transaction = await this.prisma.repository("paymentTransaction").findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: { in: WINNING_PAYMENT_TYPES },
        status: "SUCCESSFUL",
      },
      order: { created_at: "DESC" },
    });
    if (!transaction) {
      throw new Error("Winning payment not yet confirmed");
    }

    if (auction.payment_status === "PAID") {
      return;
    }

    const winner = await this.prisma.repository("winner").findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
      },
    });
    if (winner?.payment_status === "PAID") {
      return;
    }

    await this.markAsPaid(auctionId, userId);
  }

  async markAsPaid(auctionId: string, userId?: string): Promise<void> {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error("Auction not found");
    if (
      auction.status !== "CLOSED" ||
      auction.payment_status !== "PENDING"
    ) {
      throw new Error("Auction is not eligible for payment");
    }

    if (userId) {
      await this.winnerService.updateWinnerPaymentStatus(
        auctionId,
        userId,
        "PAID",
      );

      const remainingUnpaid = await this.prisma.repository("winner").count({
        where: {
          auction_id: auctionId,
          payment_status: "PENDING",
        },
      });

      if (remainingUnpaid === 0) {
        auction.payment_status = "PAID";
        auction.last_payment_update = new Date();
        await this.prisma.repository("auction").save(auction);
        await this.redis.set(
          `takelow:auction:${auctionId}:payment_status`,
          "PAID",
        );
        this.logger.log(`Auction ${auctionId}: All winners paid`);
      } else {
        const nextWinner =
          await this.winnerService.getNextUnpaidWinner(auctionId);
        if (nextWinner) {
          const nextDeadline = new Date(
            Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
          );

          auction.winner_user_id = nextWinner.user_id;
          auction.winning_bid_amount = nextWinner.amount;
          auction.payment_deadline = nextDeadline;
          auction.last_payment_update = new Date();
          nextWinner.payment_deadline = nextDeadline;

          await this.prisma.repository("winner").save(nextWinner);
          await this.prisma.repository("auction").save(auction);
        }

        this.logger.log(
          `Auction ${auctionId}: Winner ${userId} paid, ${remainingUnpaid} remaining`,
        );
      }
    } else {
      auction.payment_status = "PAID";
      auction.last_payment_update = new Date();
      await this.prisma.repository("auction").save(auction);
      await this.redis.set(
        `takelow:auction:${auctionId}:payment_status`,
        "PAID",
      );
      this.logger.log(`Auction ${auctionId}: Payment completed`);
    }

    await this.winnerService.calculateWinners(auctionId);
  }

  async handleSuccessfulPayment(
    clientReferenceId: string,
    paymentReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    const result = await this.prisma.repository("paymentTransaction").update(
      {
        client_reference_id: clientReferenceId,
        status: { not: "SUCCESSFUL" },
      },
      {
        status: "SUCCESSFUL",
        webhook_payload: webhookPayload,
      },
    );

    if (!result.count) {
      this.logger.debug(
        `Transaction ${clientReferenceId} already successful, skipping`,
      );
      return;
    }

    const transaction = await this.prisma.repository("paymentTransaction").findOne({
      where: { client_reference_id: clientReferenceId },
    });
    if (!transaction) {
      this.logger.warn(
        `Transaction not found for clientReferenceId: ${clientReferenceId}`,
      );
      return;
    }
    if (transaction.gateway === "AWASH") {
      transaction.awash_transaction_id = paymentReferenceId;
    } else {
      transaction.sikina_payment_reference_id = paymentReferenceId;
    }
    await this.prisma.repository("paymentTransaction").save(transaction);

    if (
      transaction.payment_type === "WALLET" ||
      transaction.payment_type === "WINNING_BID"
    ) {
      await this.markAsPaid(transaction.auction_id, transaction.user_id);
    } else {
      this.logger.log(
        `Bid fee payment completed for auction ${transaction.auction_id}, user ${transaction.user_id}`,
      );
    }
  }

  async handleFailedPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.prisma.repository("paymentTransaction").update(
      { client_reference_id: clientReferenceId },
      {
        status: "FAILED",
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleExpiredPaymentLink(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.prisma.repository("paymentTransaction").update(
      { client_reference_id: clientReferenceId },
      {
        status: "EXPIRED",
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleCancelledPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.prisma.repository("paymentTransaction").update(
      { client_reference_id: clientReferenceId },
      {
        status: "CANCELLED",
        webhook_payload: webhookPayload,
      },
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOverduePayments(): Promise<void> {
    const now = new Date();
    const overdue = await this.prisma.repository("auction").find({
      where: {
        status: "CLOSED",
        payment_status: "PENDING",
        payment_deadline: { lt: now },
        winner_user_id: { not: null },
      },
      include: { product: true },
      take: 50,
    });

    for (const auction of overdue) {
      try {
        await this.handleExpiredPayment(auction);
      } catch (e) {
        this.logger.error(
          `Failed to handle expired payment for auction ${auction.id}: ${e.message}`,
        );
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePendingPayments(): Promise<void> {
    const pendingTransactions = await this.prisma.repository("paymentTransaction").find({
      where: { status: "PENDING" },
      take: 100,
    });

    if (pendingTransactions.length === 0) return;

    this.logger.log(
      `Reconciling ${pendingTransactions.length} pending payments`,
    );

    for (const txn of pendingTransactions) {
      try {
        const transactionDate = txn.created_at.toISOString().split("T")[0];

        const status =
          txn.gateway === "AWASH"
            ? await this.awashService.getPaymentStatus(txn.client_reference_id)
            : await this.sikinaService.getPaymentStatus(
                txn.client_reference_id,
                transactionDate,
              );

        if (status === "SUCCESSFUL") {
          this.logger.log(
            `Reconciliation: payment ${txn.client_reference_id} is SUCCESSFUL`,
          );
          await this.handleSuccessfulPayment(txn.client_reference_id, "", {});
        } else if (
          ["FAILED", "EXPIRED", "CANCELLED", "REVOKED"].includes(status)
        ) {
          this.logger.log(
            `Reconciliation: payment ${txn.client_reference_id} is ${status}`,
          );
          await this.prisma.repository("paymentTransaction").update(
            { id: txn.id },
            { status: status },
          );
        }
      } catch (error) {
        this.logger.warn(
          `Reconciliation failed for transaction ${txn.id}: ${error.message}`,
        );
        await this.prisma.repository("paymentTransaction").increment(
          { id: txn.id },
          "retry_count",
          1,
        );
      }
    }
  }

  private async handleExpiredPayment(auction: any): Promise<void> {
    this.logger.log(
      `Auction ${auction.id}: Payment deadline passed for winner ${auction.winner_user_id}`,
    );

    const currentWinner = await this.prisma.repository("winner").findOne({
      where: {
        auction_id: auction.id,
        user_id: auction.winner_user_id,
      },
    });

    if (currentWinner) {
      currentWinner.payment_status = "EXPIRED";
      await this.prisma.repository("winner").save(currentWinner);
      this.logger.log(
        `Auction ${auction.id}: Winner ${auction.winner_user_id} payment expired`,
      );
    }

    const nextWinner = await this.winnerService.getNextUnpaidWinner(auction.id);

    if (nextWinner) {
      auction.winner_user_id = nextWinner.user_id;
      auction.winning_bid_amount = nextWinner.amount;
      auction.payment_status = "PENDING";
      auction.payment_deadline = new Date(
        Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
      );
      nextWinner.payment_deadline = auction.payment_deadline;
      await this.prisma.repository("winner").save(nextWinner);
      await this.prisma.repository("auction").save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, new winner ${nextWinner.user_id} with bid ${nextWinner.amount}`,
      );
      this.notifyNewWinner(
        auction.id,
        nextWinner.user_id,
        nextWinner.amount,
      ).catch((e) =>
        this.logger.warn(`Failed to notify new winner: ${e.message}`),
      );
    } else {
      auction.payment_status = "EXPIRED";
      auction.status = "EXPIRED";

      await this.prisma.repository("winner").update(
        { auction_id: auction.id, payment_status: "PENDING" },
        { payment_status: "EXPIRED" },
      );

      await this.prisma.repository("auction").save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, no more winners, auction expired`,
      );
    }

    this.logPaymentExpiryEvent(
      auction.id,
      currentWinner?.user_id,
      nextWinner?.user_id,
    ).catch((e) =>
      this.logger.warn(`Failed to log payment expiry: ${e.message}`),
    );
  }

  private getInternalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const internalApiKey = process.env.INTERNAL_API_KEY || "";
    if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
    return headers;
  }

  private async logPaymentExpiryEvent(
    auctionId: string,
    expiredUserId: string | undefined,
    nextUserId: string | undefined,
  ): Promise<void> {
    try {
      await fetch("http://identity-service:3000/api/v1/admin/audit/log", {
        method: "POST",
        headers: this.getInternalHeaders(),
        body: JSON.stringify({
          actor_id: "system",
          actor_phone: "system",
          action: "PAYMENT_EXPIRED",
          entity_type: "auction",
          entity_id: auctionId,
          details: {
            expired_winner: expiredUserId,
            next_winner: nextUserId || null,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (e) {
      this.logger.warn(
        `Failed to log payment expiry for auction ${auctionId}: ${e.message}`,
      );
    }
  }

  private async notifyNewWinner(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    try {
      const auction = await this.prisma.repository("auction").findOne({
        where: { id: auctionId },
        include: { product: true },
      });
      const productName = auction?.product?.name || auctionId;
      const deadline = auction?.payment_deadline?.toISOString();

      await this.notificationDispatchService.dispatch("/api/v1/notify/winner", {
        user_id: userId,
        auction_id: auctionId,
        product_name: productName,
        winning_amount: amount,
        payment_deadline: deadline,
      });
    } catch (e) {
      this.logger.warn(`Failed to notify new winner: ${e.message}`);
    }
  }
}
