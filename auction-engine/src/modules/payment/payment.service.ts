import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Repository, LessThan, IsNull, Not } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRedis } from "../common/redis.decorator";
import { Redis } from "ioredis";
import * as crypto from "node:crypto";
import {
  Auction,
  AuctionStatus as AS,
  PaymentStatus,
} from "../winner/entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "../winner/entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";
import { WinnerService } from "../winner/winner.service";
import { SikinaService } from "./sikina.service";
import { AwashService } from "./awash.service";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
  PaymentGateway,
} from "./entities/payment-transaction.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";

const PAYMENT_DEADLINE_HOURS = 24;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly bidFee: number;
  private readonly successRedirectUrl: string;
  private readonly failedRedirectUrl: string;
  private readonly proxySecret: string;

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    private winnerService: WinnerService,
    private sikinaService: SikinaService,
    private awashService: AwashService,
    private configService: ConfigService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.bidFee = this.configService.get<number>("app.bidFee")!;
    this.successRedirectUrl =
      this.configService.get<string>("app.sikinaSuccessRedirectUrl")! ||
      `${this.configService.get<string>("app.appBaseUrl")!}/payment/success`;
    this.failedRedirectUrl =
      this.configService.get<string>("app.sikinaFailedRedirectUrl")! ||
      `${this.configService.get<string>("app.appBaseUrl")!}/payment/failed`;
    this.proxySecret =
      this.configService.get<string>("app.jwtSecret")! ||
      "default-proxy-secret";
  }

  generateProxyUrl(transactionId: string): string {
    const expiresAt = Math.floor(Date.now() / 1000) + 600;
    const payload = `${transactionId}:${expiresAt}`;
    const hmac = crypto
      .createHmac("sha256", this.proxySecret)
      .update(payload)
      .digest("hex");
    const token = Buffer.from(`${hmac}.${expiresAt}`).toString("base64url");
    return `/api/v1/payments/proxy/${transactionId}?token=${token}`;
  }

  validateProxyToken(transactionId: string, token: string): boolean {
    try {
      const decoded = Buffer.from(token, "base64url").toString();
      const [hmac, expiresAtStr] = decoded.split(".");
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Math.floor(Date.now() / 1000) > expiresAt) return false;
      const payload = `${transactionId}:${expiresAtStr}`;
      const expected = crypto
        .createHmac("sha256", this.proxySecret)
        .update(payload)
        .digest("hex");
      return crypto.timingSafeEqual(
        Buffer.from(hmac, "hex"),
        Buffer.from(expected, "hex"),
      );
    } catch {
      return false;
    }
  }

  async fetchAndProxyPaymentPage(
    paymentUrl: string,
  ): Promise<{ body: string; contentType: string }> {
    const res = await fetch(paymentUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    let body = await res.text();
    const contentType =
      res.headers.get("content-type") || "text/html;charset=UTF-8";

    if (contentType.includes("text/html")) {
      const origin = new URL(paymentUrl).origin;
      const baseTag = `<base href="${origin}">`;
      if (/<head[^>]*>/i.test(body)) {
        body = body.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
      } else {
        body = `<head>${baseTag}</head>${body}`;
      }
    }

    return { body, contentType };
  }

  async createPaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    description: string,
    paymentMethod: "SIKINAPAY" | "AWASH" = "SIKINAPAY",
    customerPhone?: string,
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `pay-${shortAuctionId}-${Date.now()}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (existing?.sikina_payment_url || existing?.awash_payment_url) {
      const paymentUrl =
        existing.sikina_payment_url || existing.awash_payment_url!;
      const proxyUrl = this.generateProxyUrl(existing.id);
      return { paymentUrl: paymentUrl!, proxyUrl, transactionId: existing.id };
    }

    let paymentUrl: string;
    let gateway: PaymentGateway;

    if (paymentMethod === "AWASH") {
      try {
        const awashResponse = await this.awashService.generatePaymentLink({
          amount,
          clientReferenceId,
          description,
          customerPhone,
          redirectSuccessUrl: this.successRedirectUrl,
          redirectFailUrl: this.failedRedirectUrl,
        });
        paymentUrl = awashResponse.paymentUrl;
        gateway = PaymentGateway.AWASH;
      } catch (e) {
        this.logger.error(
          `Awash payment link creation failed: ${e.message}`,
        );
        throw e;
      }
    } else {
      try {
        const sikinaParams: any = {
          amount,
          clientReferenceId,
          description,
          language: "en",
        };
        if (this.successRedirectUrl?.startsWith("https://")) {
          sikinaParams.paymentSuccessfulRedirectUrl = `${this.successRedirectUrl}?client_reference_id=${clientReferenceId}&type=winning`;
        }
        if (this.failedRedirectUrl?.startsWith("https://")) {
          sikinaParams.paymentFailedRedirectUrl = `${this.failedRedirectUrl}?client_reference_id=${clientReferenceId}&type=winning`;
        }
        const sikinaResponse =
          await this.sikinaService.generatePaymentLink(sikinaParams);
        paymentUrl = sikinaResponse.paymentUrl;
        gateway = PaymentGateway.SIKINAPAY;
      } catch (e) {
        this.logger.error(
          `SikinaPay payment link creation failed: ${e.message}`,
        );
        throw e;
      }
    }

    const encryptedAmount = this.bidEncryptionService.encrypt(amount);

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      encrypted_amount: encryptedAmount,
      client_reference_id: clientReferenceId,
      payment_type: PaymentType.WINNING_BID,
      status: PaymentTransactionStatus.PENDING,
      currency: "ETB",
      gateway,
      customer_phone: customerPhone,
      sikina_payment_url:
        paymentMethod === "SIKINAPAY" ? paymentUrl : undefined,
      awash_payment_url:
        paymentMethod === "AWASH" ? paymentUrl : undefined,
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(
      `Payment link created for auction ${auctionId}, user ${userId} via ${gateway}: ${paymentUrl}`,
    );

    const proxyUrl = this.generateProxyUrl(saved.id);
    return { paymentUrl, proxyUrl, transactionId: saved.id };
  }

  async findTransaction(
    auctionId: string,
    userId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { auction_id: auctionId, user_id: userId },
      order: { created_at: "DESC" },
    });
  }

  async findTransactionById(
    transactionId: string,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { id: transactionId },
    });
  }

  async createBidFeePaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    paymentMethod: "SIKINAPAY" | "AWASH" = "SIKINAPAY",
  ): Promise<{ paymentUrl: string; proxyUrl: string; transactionId: string }> {
    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `fee-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;
    const description = `Bid fee for auction ${auctionId}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (existing?.sikina_payment_url || existing?.awash_payment_url) {
      const paymentUrl =
        existing.sikina_payment_url || existing.awash_payment_url!;
      const proxyUrl = this.generateProxyUrl(existing.id);
      return { paymentUrl: paymentUrl!, proxyUrl, transactionId: existing.id };
    }

    let paymentUrl: string;
    let gateway: PaymentGateway;

    if (paymentMethod === "AWASH") {
      const awashResponse = await this.awashService.generatePaymentLink({
        amount,
        clientReferenceId,
        description,
        redirectSuccessUrl: this.successRedirectUrl,
        redirectFailUrl: this.failedRedirectUrl,
      });
      paymentUrl = awashResponse.paymentUrl;
      gateway = PaymentGateway.AWASH;
    } else {
      const sikinaParams: any = {
        amount,
        clientReferenceId,
        description,
        language: "en",
      };

      if (this.successRedirectUrl?.startsWith("https://")) {
        sikinaParams.paymentSuccessfulRedirectUrl = `${this.successRedirectUrl}?client_reference_id=${clientReferenceId}&type=bid_fee`;
      }
      if (this.failedRedirectUrl?.startsWith("https://")) {
        sikinaParams.paymentFailedRedirectUrl = `${this.failedRedirectUrl}?client_reference_id=${clientReferenceId}&type=bid_fee`;
      }

      const sikinaResponse =
        await this.sikinaService.generatePaymentLink(sikinaParams);
      paymentUrl = sikinaResponse.paymentUrl;
      gateway = PaymentGateway.SIKINAPAY;
    }

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      sikina_payment_url: paymentMethod === "SIKINAPAY" ? paymentUrl : undefined,
      awash_payment_url: paymentMethod === "AWASH" ? paymentUrl : undefined,
      status: PaymentTransactionStatus.PENDING,
      currency: "ETB",
      payment_type: PaymentType.BID_FEE,
      gateway,
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(
      `Bid fee payment link created for auction ${auctionId}, user ${userId} via ${gateway}: ${paymentUrl}`,
    );

    const proxyUrl = this.generateProxyUrl(saved.id);
    return { paymentUrl, proxyUrl, transactionId: saved.id };
  }

  private async deductFromWallet(
    userId: string,
    amount: number,
    description: string,
  ): Promise<void> {
    const identityBase =
      process.env.IDENTITY_SERVICE_URL || "http://localhost:3001";

    const res = await fetch(
      `${identityBase}/api/v1/wallet/deduct-fee`,
      {
        method: "POST",
        headers: this.getInternalHeaders(),
        body: JSON.stringify({ user_id: userId, amount }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      let message: string;
      try {
        const parsed = JSON.parse(text);
        message = parsed.message || text;
      } catch {
        message = text;
      }
      throw new Error(message);
    }
  }

  async createBidFeeWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.SUCCESSFUL,
      },
    });
    if (existing) return;

    await this.deductFromWallet(userId, amount, `Bid fee for auction ${auctionId}`);

    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `fee-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      status: PaymentTransactionStatus.SUCCESSFUL,
      currency: "ETB",
      payment_type: PaymentType.BID_FEE,
      gateway: PaymentGateway.AWASH,
    });
    await this.paymentTransactionRepository.save(transaction);
    this.logger.log(
      `Bid fee paid via wallet for auction ${auctionId}, user ${userId}`,
    );
  }

  async createWinningWalletPayment(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.WALLET,
        status: PaymentTransactionStatus.SUCCESSFUL,
      },
    });
    if (existing) return;

    await this.deductFromWallet(userId, amount, `Winning payment for auction ${auctionId}`);

    const shortAuctionId = auctionId.split("-")[0];
    const clientReferenceId = `win-${shortAuctionId}-${userId.split("-")[0]}-${Date.now()}`;

    const encryptedAmount = this.bidEncryptionService.encrypt(amount);

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      encrypted_amount: encryptedAmount,
      client_reference_id: clientReferenceId,
      status: PaymentTransactionStatus.SUCCESSFUL,
      currency: "ETB",
      payment_type: PaymentType.WALLET,
      gateway: PaymentGateway.AWASH,
    });
    await this.paymentTransactionRepository.save(transaction);

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
      payment_type: PaymentType.BID_FEE,
    };
    if (userId) where.user_id = userId;

    const transaction = await this.paymentTransactionRepository.findOne({
      where,
      order: { created_at: "DESC" },
    });

    let status = transaction?.status || "NONE";

    if (status === "PENDING" && transaction?.client_reference_id) {
      try {
        const transactionDate =
          transaction.created_at.toISOString().split("T")[0];
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
          await this.paymentTransactionRepository.update(
            { id: transaction.id },
            { status: remoteStatus as PaymentTransactionStatus },
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

  async markAsPaid(auctionId: string, userId?: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error("Auction not found");
    if (
      auction.status !== AS.CLOSED ||
      auction.payment_status !== PaymentStatus.PENDING
    ) {
      throw new Error("Auction is not eligible for payment");
    }

    if (userId) {
      await this.winnerService.updateWinnerPaymentStatus(
        auctionId,
        userId,
        WinnerPaymentStatus.PAID,
      );

      const remainingUnpaid = await this.winnerRepository.count({
        where: {
          auction_id: auctionId,
          payment_status: WinnerPaymentStatus.PENDING,
        },
      });

      if (remainingUnpaid === 0) {
        auction.payment_status = PaymentStatus.PAID;
        auction.last_payment_update = new Date();
        await this.auctionRepository.save(auction);
        await this.redis.set(
          `takelow:auction:${auctionId}:payment_status`,
          "PAID",
        );
        this.logger.log(`Auction ${auctionId}: All winners paid`);
      } else {
        this.logger.log(
          `Auction ${auctionId}: Winner ${userId} paid, ${remainingUnpaid} remaining`,
        );
      }
    } else {
      auction.payment_status = PaymentStatus.PAID;
      auction.last_payment_update = new Date();
      await this.auctionRepository.save(auction);
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
    const result = await this.paymentTransactionRepository.update(
      {
        client_reference_id: clientReferenceId,
        status: Not(PaymentTransactionStatus.SUCCESSFUL),
      },
      {
        status: PaymentTransactionStatus.SUCCESSFUL,
        webhook_payload: webhookPayload,
      },
    );

    if (!result.affected) {
      this.logger.debug(
        `Transaction ${clientReferenceId} already successful, skipping`,
      );
      return;
    }

    const transaction = await this.paymentTransactionRepository.findOne({
      where: { client_reference_id: clientReferenceId },
    });
    if (!transaction) {
      this.logger.warn(
        `Transaction not found for clientReferenceId: ${clientReferenceId}`,
      );
      return;
    }
    if (transaction.gateway === PaymentGateway.AWASH) {
      transaction.awash_transaction_id = paymentReferenceId;
    } else {
      transaction.sikina_payment_reference_id = paymentReferenceId;
    }
    await this.paymentTransactionRepository.save(transaction);

    if (
      transaction.payment_type === PaymentType.WALLET ||
      transaction.payment_type === PaymentType.WINNING_BID
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
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.FAILED,
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleExpiredPaymentLink(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.EXPIRED,
        webhook_payload: webhookPayload,
      },
    );
  }

  async handleCancelledPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      {
        status: PaymentTransactionStatus.CANCELLED,
        webhook_payload: webhookPayload,
      },
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOverduePayments(): Promise<void> {
    const now = new Date();
    const overdue = await this.auctionRepository.find({
      where: {
        status: AS.CLOSED,
        payment_status: PaymentStatus.PENDING,
        payment_deadline: LessThan(now),
        winner_user_id: Not(IsNull()),
      },
      relations: ["product"],
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
    const pendingTransactions = await this.paymentTransactionRepository.find({
      where: { status: PaymentTransactionStatus.PENDING },
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
          txn.gateway === PaymentGateway.AWASH
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
          await this.paymentTransactionRepository.update(
            { id: txn.id },
            { status: status as PaymentTransactionStatus },
          );
        }
      } catch (error) {
        this.logger.warn(
          `Reconciliation failed for transaction ${txn.id}: ${error.message}`,
        );
        await this.paymentTransactionRepository.increment(
          { id: txn.id },
          "retry_count",
          1,
        );
      }
    }
  }

  private async handleExpiredPayment(auction: Auction): Promise<void> {
    this.logger.log(
      `Auction ${auction.id}: Payment deadline passed for winner ${auction.winner_user_id}`,
    );

    const currentWinner = await this.winnerRepository.findOne({
      where: {
        auction_id: auction.id,
        user_id: auction.winner_user_id,
      },
    });

    if (currentWinner) {
      currentWinner.payment_status = WinnerPaymentStatus.EXPIRED;
      await this.winnerRepository.save(currentWinner);
      this.logger.log(
        `Auction ${auction.id}: Winner ${auction.winner_user_id} payment expired`,
      );
    }

    const nextWinner = await this.winnerService.getNextUnpaidWinner(auction.id);

    if (nextWinner) {
      auction.winner_user_id = nextWinner.user_id;
      auction.winning_bid_amount = nextWinner.amount;
      auction.payment_status = PaymentStatus.PENDING;
      auction.payment_deadline = new Date(
        Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
      );
      nextWinner.payment_deadline = auction.payment_deadline;
      await this.winnerRepository.save(nextWinner);
      await this.auctionRepository.save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, new winner ${nextWinner.user_id} with bid ${nextWinner.amount}`,
      );
      this.notifyNewWinner(
        auction.id,
        nextWinner.user_id,
        nextWinner.amount,
      ).catch((e) => this.logger.warn(`Failed to notify new winner: ${e.message}`));
    } else {
      auction.payment_status = PaymentStatus.EXPIRED;
      auction.status = AS.EXPIRED;

      await this.winnerRepository.update(
        { auction_id: auction.id, payment_status: WinnerPaymentStatus.PENDING },
        { payment_status: WinnerPaymentStatus.EXPIRED },
      );

      await this.auctionRepository.save(auction);
      this.logger.log(
        `Auction ${auction.id}: Payment expired, no more winners, auction expired`,
      );
    }

    this.logPaymentExpiryEvent(
      auction.id,
      currentWinner?.user_id,
      nextWinner?.user_id,
    ).catch((e) => this.logger.warn(`Failed to log payment expiry: ${e.message}`));
  }

  private getInternalHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
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
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const productName = auction?.product?.name || auctionId;
      const deadline = auction?.payment_deadline?.toISOString();

      await fetch("http://identity-service:3000/api/v1/notify/winner", {
        method: "POST",
        headers: this.getInternalHeaders(),
        body: JSON.stringify({
          user_id: userId,
          auction_id: auctionId,
          product_name: productName,
          winning_amount: amount,
          payment_deadline: deadline,
        }),
      });
    } catch (e) {
      this.logger.warn(`Failed to notify new winner: ${e.message}`);
    }
  }
}
