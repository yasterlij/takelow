import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Redis } from "ioredis";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  Auction,
  AuctionStatus as AS,
  PaymentStatus,
} from "./entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "./entities/winner.entity";
import { WinnerService } from "./winner.service";
import { Bid } from "../bidding/entities/bid.entity";
import { BullMqWorker } from "../worker/bullmq.worker";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { InjectRedis } from "../common/redis.decorator";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;
const PAYMENT_DEADLINE_HOURS = 24;
const AUCTION_STATE_TTL_BUFFER_SECONDS = 3600;

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);

  private normalizeAmount(amount: string | number): string {
    return Number(amount).toFixed(2);
  }

  private getAuctionStateTtl(endTime: Date): number {
    const secondsUntilEnd = Math.ceil((endTime.getTime() - Date.now()) / 1000);
    return Math.max(60, secondsUntilEnd + AUCTION_STATE_TTL_BUFFER_SECONDS);
  }

  private async refreshAuctionRedisTtl(
    auctionId: string,
    endTime: Date,
  ): Promise<void> {
    const ttl = this.getAuctionStateTtl(endTime);
    await this.redis
      .multi()
      .expire(`takelow:auction:${auctionId}:frequencies`, ttl)
      .expire(`takelow:auction:${auctionId}:unique_bids`, ttl)
      .expire(`takelow:auction:${auctionId}:bidders`, ttl)
      .expire(`takelow:auction:${auctionId}:total_bids`, ttl)
      .exec();
  }

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
    private winnerService: WinnerService,
    private bullMqWorker: BullMqWorker,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async closeExpiredAuctions(): Promise<void> {
    const now = new Date();

    const expiredAuctions = await this.auctionRepository.find({
      where: {
        status: AS.ACTIVE,
        end_time: LessThan(now),
      },
      take: 100,
    });

    for (const auction of expiredAuctions) {
      try {
        await this.closeAuction(auction);
      } catch (error) {
        this.logger.error(
          `Failed to close auction ${auction.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async closeAuction(auction: Auction): Promise<void> {
    await this.bullMqWorker.flushAuction(auction.id);
    const { winningAmounts, totalBids, winners } =
      await this.winnerService.calculateWinners(auction.id);

    if (
      auction.min_bid != null &&
      totalBids > 0 &&
      totalBids < auction.min_bid
    ) {
      const extendMs = 24 * 60 * 60 * 1000;
      auction.end_time = new Date(Date.now() + extendMs);
      await this.auctionRepository.save(auction);
      await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
      this.logger.log(
        `Auction ${auction.id}: Only ${totalBids}/${auction.min_bid} bids, extended 24h`,
      );
      this.sendExtensionNotification(
        auction.id,
        totalBids,
        auction.min_bid,
      ).catch((e) =>
        this.logger.warn(`Failed to send extension notification: ${e.message}`),
      );
      return;
    }

    if (totalBids > 0 && winners.length === 0) {
      auction.extensions = (auction.extensions || 0) + 1;
      auction.end_time = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.auctionRepository.save(auction);
      await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
      this.logger.log(
        `Auction ${auction.id}: No unique bids among ${totalBids} bids (extension #${auction.extensions}), extended 24h for fair play`,
      );
      this.sendFairPlayNotification(auction.id).catch((e) =>
        this.logger.warn(`Failed to send fair play notification: ${e.message}`),
      );
      return;
    }

    const queryRunner =
      this.auctionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (totalBids === 0) {
        auction.status = AS.EXPIRED;
        this.logger.log(`Auction ${auction.id}: No bids, expired`);
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
      } else if (winners.length > 0) {
        const winningBids: Bid[] = [];
        for (const w of winners) {
          const bid = await this.findWinBidWithRetry(
            queryRunner,
            auction.id,
            w.amount,
            w.userId,
          );
          if (bid) winningBids.push(bid);
        }

        if (winningBids.length === 0) {
          auction.status = AS.EXPIRED;
          this.logger.warn(
            `Auction ${auction.id}: No winning bids found in DB, expired`,
          );
          await queryRunner.manager.save(auction);
          await queryRunner.commitTransaction();
        } else {
          const paymentDeadline = new Date(
            Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
          );

          auction.winner_user_id = winningBids[0].user_id;
          const winAmount =
            Number(winningBids[0].amount) === 0 &&
            winningBids[0].encrypted_amount
              ? this.normalizeAmount(
                  this.bidEncryptionService.decrypt(
                    winningBids[0].encrypted_amount,
                  ),
                )
              : this.normalizeAmount(winningBids[0].amount);
          auction.winning_bid_amount = Number(winAmount);
          auction.status = AS.CLOSED;
          auction.payment_status = PaymentStatus.PENDING;
          auction.payment_deadline = paymentDeadline;

          await queryRunner.manager.save(auction);

          const winnerEntities = await this.winnerService.persistWinners(
            auction.id,
            winners,
            paymentDeadline,
            queryRunner.manager,
          );

          await queryRunner.commitTransaction();

          this.logger.log(
            `Auction ${auction.id}: CLOSED with ${winnerEntities.length} winner(s). ` +
              `Amounts: [${winners.map((w) => w.amount).join(", ")}]`,
          );

          this.logClosureEvent(auction.id, "AUTO_CLOSE", winners).catch((e) =>
            this.logger.warn(`Failed to log closure event: ${e.message}`),
          );
          this.sendWinnerNotifications(auction, winners).catch((e) =>
            this.logger.warn(
              `Failed to send winner notifications: ${e.message}`,
            ),
          );
        }
      } else {
        auction.status = AS.EXPIRED;
        this.logger.log(
          `Auction ${auction.id}: All bid amounts duplicated, expired`,
        );
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Transaction failed for auction ${auction.id}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.winnerService.cleanupAuctionKeys(auction.id);
  }

  async closeSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== AS.ACTIVE)
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });
    const hasUnique = await this.winnerService.hasUniqueBids(auctionId);
    if (!hasUnique) {
      throw new BadRequestException(
        `No unique bids among ${totalBids} bids. Auction cannot close without a unique winner unless forced.`,
      );
    }

    auction.end_time = new Date();
    await this.auctionRepository.save(auction);

    await this.closeAuction(auction);

    if (actorId) {
      const closedAuction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
      const winners = await this.winnerRepository.find({
        where: { auction_id: auctionId },
        order: { rank: "ASC" },
      });
      await this.logClosureEvent(
        auctionId,
        "ADMIN_CLOSE",
        winners.map((w) => ({ amount: w.amount, userId: w.user_id })),
      );
      return closedAuction as Auction;
    }

    return this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    }) as Promise<Auction>;
  }

  async forceCloseSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== AS.ACTIVE)
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    auction.end_time = new Date();
    auction.status = AS.CLOSED;
    auction.winner_user_id = null as any;
    auction.winning_bid_amount = null as any;
    await this.auctionRepository.save(auction);

    await this.winnerService.cleanupAuctionKeys(auction.id);

    this.logger.log(
      `Auction ${auctionId}: Force closed by admin with no unique bids`,
    );

    this.sendForcedClosureNotification(auction.id).catch((e) =>
      this.logger.warn(
        `Failed to send forced closure notification: ${e.message}`,
      ),
    );

    if (actorId) {
      await this.logClosureEvent(auctionId, "ADMIN_FORCE_CLOSE", []);
    }

    return this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    }) as Promise<Auction>;
  }

  private async sendFairPlayNotification(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) return;

    const productName = auction.product?.name || auctionId;
    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch(
        "http://identity-service:3000/api/v1/notify/auction-fair-play-extended",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            auction_id: auctionId,
            product_name: productName,
            total_bids: totalBids,
            extensions: auction.extensions,
          }),
        },
      );
    } catch (e) {
      this.logger.warn(
        `Failed to send fair play extension notification: ${e.message}`,
      );
    }
  }

  private async sendForcedClosureNotification(
    auctionId: string,
  ): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) return;

    const productName = auction.product?.name || auctionId;
    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch(
        "http://identity-service:3000/api/v1/notify/auction-forced-closure",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            auction_id: auctionId,
            product_name: productName,
            total_bids: totalBids,
          }),
        },
      );
    } catch (e) {
      this.logger.warn(
        `Failed to send forced closure notification: ${e.message}`,
      );
    }
  }

  private async findWinBidWithRetry(
    queryRunner: any,
    auctionId: string,
    amount: number,
    userId: string,
  ): Promise<Bid | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bids = await queryRunner.manager.find(Bid, {
        where: { auction_id: auctionId, user_id: userId },
        order: { bid_time: "ASC" },
      });
      const match = bids.find((b: Bid) => {
        if (Number(b.amount) !== 0 || !b.encrypted_amount)
          return (
            this.normalizeAmount(b.amount) === this.normalizeAmount(amount)
          );
        try {
          return (
            this.normalizeAmount(
              this.bidEncryptionService.decrypt(b.encrypted_amount),
            ) === this.normalizeAmount(amount)
          );
        } catch {
          return false;
        }
      });
      if (match) return match;

      if (attempt < MAX_RETRIES - 1) {
        this.logger.debug(
          `Win bid not found (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`,
        );
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    this.logger.warn(
      `Win bid amount=${amount} user=${userId} not found in DB after ${MAX_RETRIES} attempts for auction ${auctionId}`,
    );
    return null;
  }

  private async sendWinnerNotifications(
    auction: Auction,
    winners: { amount: number; userId: string }[],
  ): Promise<void> {
    const auctionWithProduct = await this.auctionRepository.findOne({
      where: { id: auction.id },
      relations: ["product"],
    });
    const productName = auctionWithProduct?.product?.name || auction.id;
    const productDescription =
      auctionWithProduct?.product?.description || undefined;
    const deadline =
      auction.payment_deadline?.toISOString() ||
      new Date(
        Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000,
      ).toISOString();

    const winnerPayloads = winners.map((w) => ({
      user_id: w.userId,
      auction_id: auction.id,
      product_name: productName,
      product_description: productDescription,
      winning_amount: w.amount,
      payment_deadline: deadline,
    }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch("http://identity-service:3000/api/v1/notify/winner-bulk", {
        method: "POST",
        headers,
        body: JSON.stringify({ winners: winnerPayloads }),
      });
    } catch (e) {
      this.logger.warn(
        `Failed to send bulk winner notifications: ${e.message}`,
      );
    }
  }

  private async sendExtensionNotification(
    auctionId: string,
    current: number,
    min: number,
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch(
        "http://identity-service:3000/api/v1/notify/auction-extended",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            auction_id: auctionId,
            current_bids: current,
            min_bids: min,
          }),
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to send extension notification: ${e.message}`);
    }
  }

  private async logClosureEvent(
    auctionId: string,
    action: string,
    winners: { amount: number; userId: string }[],
  ): Promise<void> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch("http://identity-service:3000/api/v1/admin/audit/log", {
        method: "POST",
        headers,
        body: JSON.stringify({
          actor_id: "system",
          actor_phone: "system",
          action,
          entity_type: "auction",
          entity_id: auctionId,
          details: {
            winners: winners.map((w) => ({
              user_id: w.userId,
              amount: w.amount,
            })),
            winner_count: winners.length,
            timestamp: new Date().toISOString(),
          },
        }),
      });
    } catch (e) {
      this.logger.warn(
        `Failed to log closure event for auction ${auctionId}: ${e.message}`,
      );
    }
  }
}
