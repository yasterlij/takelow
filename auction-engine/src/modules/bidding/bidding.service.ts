import * as crypto from "crypto";
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction } from "../winner/entities/auction.entity";
import { Bid } from "./entities/bid.entity";
import { AuctionClosureService } from "../winner/auction-closure.service";
import { AuctionGateway } from "./gateway/auction.gateway";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import {
  PaymentTransaction,
  PaymentTransactionStatus,
  PaymentType,
} from "../payment/entities/payment-transaction.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";

const LOCK_TTL = 5000;
const AUCTION_STATE_TTL_BUFFER_SECONDS = 3600;

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);

  private normalizeAmount(amount: number): string {
    return amount.toFixed(2);
  }

  private getAuctionStateTtl(endTime: Date): number {
    const secondsUntilEnd = Math.ceil((endTime.getTime() - Date.now()) / 1000);
    return Math.max(60, secondsUntilEnd + AUCTION_STATE_TTL_BUFFER_SECONDS);
  }

  private async getPersistedBidCount(auctionId: string): Promise<number> {
    try {
      return await this.bidRepository.count({
        where: { auction_id: auctionId },
      });
    } catch (e) {
      this.logger.error(
        `DB bid count fallback failed for ${auctionId}: ${e.message}`,
      );
      return 1;
    }
  }

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly auctionGateway: AuctionGateway,
    @InjectQueue("incoming-bids") private readonly bidQueue: Queue,
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepository: Repository<Bid>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly closureService: AuctionClosureService,
    private readonly bidEncryptionService: BidEncryptionService,
    private readonly notificationDispatchService: NotificationDispatchService,
  ) {}

  async placeBid(
    auctionId: string,
    userId: string,
    amount: number,
    endTime: Date,
    ticketNumber: string,
  ): Promise<{
    newTotalBids: number;

    productName: string;
  }> {
    const lockKey = `takelow:auction:${auctionId}:lock`;
    const lockAcquired = await this.redis.set(
      lockKey,
      userId,
      "PX",
      LOCK_TTL,
      "NX",
    );

    if (!lockAcquired) {
      throw new ForbiddenException(
        "Auction is temporarily locked. Please retry.",
      );
    }

    try {
      const now = Date.now();
      if (now > endTime.getTime()) {
        throw new ForbiddenException("Auction has closed");
      }

      // Check if user has paid bid fee via SikinaPay
      const feePaid = await this.checkBidFeePaid(userId, auctionId);
      if (!feePaid) {
        throw new BadRequestException(
          "Bid fee not paid. Please pay the bid fee via SikinaPay before placing a bid.",
        );
      }

      const existingBid = await this.bidRepository.findOne({
        where: { auction_id: auctionId, user_id: userId, amount },
      });
      if (existingBid) {
        throw new ConflictException(
          "Duplicate bid detected. Please enter a new amount.",
        );
      }

      const encryptedAmount = this.bidEncryptionService.encrypt(amount);

      await this.bidRepository.save(
        this.bidRepository.create({
          auction_id: auctionId,
          user_id: userId,
          amount,
          bid_time: new Date(),
          encrypted_amount: encryptedAmount,
          ticket_number: ticketNumber,
        }),
      );

      let totalBids = 1;
      try {
        await this.trackBidInRedis(auctionId, userId, amount, endTime);

        const totalBidsStr = await this.redis.get(
          `takelow:auction:${auctionId}:total_bids`,
        );
        totalBids = totalBidsStr ? parseInt(totalBidsStr, 10) : 1;
      } catch (e) {
        this.logger.warn(
          `Redis bid state update failed for ${auctionId}; continuing with persisted bid only: ${e.message}`,
        );
        totalBids = await this.getPersistedBidCount(auctionId);
      }

      this.notifyOutbidBidders(auctionId, userId, amount).catch((e) =>
        this.logger.warn(`Failed to notify outbid bidders: ${e.message}`),
      );

      try {
        this.auctionGateway.broadcastAuctionUpdate({
          auction_id: auctionId,
          total_bids: totalBids,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        this.logger.warn(
          `Auction update broadcast failed for ${auctionId}: ${e.message}`,
        );
      }

      this.logger.debug(
        `Bid placed: auction=${auctionId} user=${userId} amount=${amount} total_bids=${totalBids}`,
      );

      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        select: ["max_bid"],
      });
      if (auction?.max_bid != null && totalBids >= auction.max_bid) {
        this.logger.log(
          `Max bids (${auction.max_bid}) reached for auction ${auctionId}, closing early`,
        );
        this.notifyMaxBidReached(auctionId, totalBids, auction.max_bid).catch(
          (e) =>
            this.logger.warn(
              `Failed to send max-bid notification: ${e.message}`,
            ),
        );
        await this.closureService.closeSingleAuction(auctionId);
      }

      const auctionFull = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const productName = auctionFull?.product?.name || "Unknown Product";

      this.logger.log(
        `Bid placed: user=${userId} auction=${auctionId} amount=${amount} total_bids=${totalBids}`,
      );

      return { newTotalBids: totalBids, productName };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async notifyOutbidBidders(
    auctionId: string,
    newBidderId: string,
    amount: number,
  ): Promise<void> {
    const amountKey = this.normalizeAmount(amount);
    const freq = await this.redis.zscore(
      `takelow:auction:${auctionId}:frequencies`,
      amountKey,
    );
    if (freq && Number(freq) > 1) {
      const prevBids = await this.bidRepository.find({
        where: { auction_id: auctionId },
        select: ["user_id", "encrypted_amount", "amount"],
        order: { bid_time: "DESC" },
        take: 20,
      });
      const prevBidders = prevBids.filter((b) => {
        if (Number(b.amount) !== 0 || !b.encrypted_amount)
          return this.normalizeAmount(Number(b.amount)) === amountKey;
        try {
          return (
            this.normalizeAmount(
              this.bidEncryptionService.decrypt(b.encrypted_amount),
            ) === amountKey
          );
        } catch {
          return false;
        }
      });
      const notified = new Set<string>();
      for (const bid of prevBidders) {
        if (bid.user_id === newBidderId || notified.has(bid.user_id)) continue;
        notified.add(bid.user_id);
        try {
          await this.notificationDispatchService.dispatch(
            "/api/v1/notify/outbid",
            {
              user_id: bid.user_id,
              auction_id: auctionId,
              bid_amount: amount,
            },
          );
        } catch {
          // individual notification failure is non-critical
        }
      }
    }
  }

  private async notifyMaxBidReached(
    auctionId: string,
    total: number,
    max: number,
  ): Promise<void> {
    try {
      await this.notificationDispatchService.dispatch(
        "/api/v1/notify/max-bid-reached",
        {
          auction_id: auctionId,
          total_bids: total,
          max_bids: max,
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to send max-bid notification: ${e.message}`);
    }
  }

  private async checkBidFeePaid(
    userId: string,
    auctionId: string,
  ): Promise<boolean> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.SUCCESSFUL,
      },
    });
    return !!transaction;
  }

  private async trackBidInRedis(
    auctionId: string,
    userId: string,
    amount: number,
    endTime: Date,
  ): Promise<void> {
    const multi = this.redis.multi();
    const amountKey = this.normalizeAmount(amount);

    multi.sadd(`takelow:auction:${auctionId}:bidders`, userId);

    multi.zincrby(`takelow:auction:${auctionId}:frequencies`, 1, amountKey);

    const freqKey = `takelow:auction:${auctionId}:frequencies`;
    const uniqueKey = `takelow:auction:${auctionId}:unique_bids`;

    const results = await multi.exec();
    if (!results) return;

    const saddResult = results[0][1];
    const zincyResult = results[1][1];

    const isNewBidder = saddResult === 1;
    const count = Number(zincyResult);

    const uniqueMulti = this.redis.multi();
    if (count === 1) {
      uniqueMulti.zadd(uniqueKey, amount, amountKey);
    } else if (count > 1) {
      uniqueMulti.zrem(uniqueKey, amountKey);
    }

    uniqueMulti.incr(`takelow:auction:${auctionId}:total_bids`);

    const ttl = this.getAuctionStateTtl(endTime);
    uniqueMulti.expire(`takelow:auction:${auctionId}:frequencies`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:unique_bids`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:bidders`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:total_bids`, ttl);

    await uniqueMulti.exec();
  }
}
