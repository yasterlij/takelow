import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Redis } from "ioredis";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../prisma/prisma.service";
import { PrismaRepository } from "../../prisma/prisma-repository";
import { WinnerService } from "./winner.service";
import { BullMqWorker } from "../worker/bullmq.worker";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { InjectRedis } from "../common/redis.decorator";
import { AuctionClosureEventsService } from "./auction-closure-events.service";

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
    private readonly prisma: PrismaService,
    private winnerService: WinnerService,
    private bullMqWorker: BullMqWorker,
    private bidEncryptionService: BidEncryptionService,
    @InjectRedis() private readonly redis: Redis,
    private closureEventsService: AuctionClosureEventsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async closeExpiredAuctions(): Promise<void> {
    const now = new Date();

    const expiredAuctions = await this.prisma.repository("auction").find({
      where: {
        status: "ACTIVE",
        end_time: { lt: now },
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

  private async closeAuction(auction: any): Promise<void> {
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
      await this.prisma.repository("auction").save(auction);
      await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
      this.logger.log(
        `Auction ${auction.id}: Only ${totalBids}/${auction.min_bid} bids, extended 24h`,
      );
      this.closureEventsService
        .notifyExtension(auction.id, totalBids, auction.min_bid)
        .catch((e) =>
          this.logger.warn(
            `Failed to send extension notification: ${e.message}`,
          ),
        );
      return;
    }

    if (totalBids > 0 && winners.length === 0) {
      auction.extensions = (auction.extensions || 0) + 1;
      auction.end_time = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await this.prisma.repository("auction").save(auction);
      await this.refreshAuctionRedisTtl(auction.id, auction.end_time);
      this.logger.log(
        `Auction ${auction.id}: No unique bids among ${totalBids} bids (extension #${auction.extensions}), extended 24h for fair play`,
      );
      this.closureEventsService
        .notifyFairPlayExtension(auction.id)
        .catch((e) =>
          this.logger.warn(
            `Failed to send fair play notification: ${e.message}`,
          ),
        );
      return;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const auctionRepo = new PrismaRepository(tx as any, "auction");
        const bidRepo = new PrismaRepository(tx as any, "bid");
        if (totalBids === 0) {
          auction.status = "EXPIRED";
          this.logger.log(`Auction ${auction.id}: No bids, expired`);
          await auctionRepo.save(auction);
        } else if (winners.length > 0) {
          const winningBids: any[] = [];
          for (const w of winners) {
            const bid = await this.findWinBidWithRetry(
              bidRepo,
              auction.id,
              w.amount,
              w.userId,
            );
            if (bid) winningBids.push(bid);
          }

          if (winningBids.length === 0) {
            auction.status = "EXPIRED";
            this.logger.warn(
              `Auction ${auction.id}: No winning bids found in DB, expired`,
            );
            await auctionRepo.save(auction);
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
            auction.status = "CLOSED";
            auction.payment_status = "PENDING";
            auction.payment_deadline = paymentDeadline;

            await auctionRepo.save(auction);

            const winnerRepo = new PrismaRepository(tx as any, "winner");
            const winnerEntities = await this.winnerService.persistWinners(
              auction.id,
              winners,
              paymentDeadline,
              { repository: (model: any) => new PrismaRepository(tx as any, model) },
            );

            this.logger.log(
              `Auction ${auction.id}: CLOSED with ${winnerEntities.length} winner(s). ` +
                `Amounts: [${winners.map((w) => w.amount).join(", ")}]`,
            );

            this.closureEventsService
              .logClosureEvent(auction.id, "AUTO_CLOSE", winners)
              .catch((e) =>
                this.logger.warn(`Failed to log closure event: ${e.message}`),
              );
            this.closureEventsService
              .notifyWinners(auction, winners)
              .catch((e) =>
                this.logger.warn(
                  `Failed to send winner notifications: ${e.message}`,
                ),
              );
          }
        } else {
          auction.status = "EXPIRED";
          this.logger.log(
            `Auction ${auction.id}: All bid amounts duplicated, expired`,
          );
          await auctionRepo.save(auction);
        }
      });
    } catch (error) {
      this.logger.error(
        `Transaction failed for auction ${auction.id}: ${error.message}`,
      );
      throw error;
    }

    await this.winnerService.cleanupAuctionKeys(auction.id);
  }

  async closeSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<any> {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== "ACTIVE")
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    const totalBids = await this.prisma.repository("bid").count({
      where: { auction_id: auctionId },
    });
    const hasUnique = await this.winnerService.hasUniqueBids(auctionId);
    if (!hasUnique) {
      throw new BadRequestException(
        `No unique bids among ${totalBids} bids. Auction cannot close without a unique winner unless forced.`,
      );
    }

    auction.end_time = new Date();
    await this.prisma.repository("auction").save(auction);

    await this.closeAuction(auction);

    if (actorId) {
      const closedAuction = await this.prisma.repository("auction").findOne({
        where: { id: auctionId },
        include: { product: true },
      });
      const winners = await this.prisma.repository("winner").find({
        where: { auction_id: auctionId },
        order: { rank: "asc" },
      });
      await this.closureEventsService.logClosureEvent(
        auctionId,
        "ADMIN_CLOSE",
        winners.map((w) => ({ amount: w.amount, userId: w.user_id })),
      );
      return closedAuction as any;
    }

    return this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      include: { product: true },
    }) as Promise<any>;
  }

  async forceCloseSingleAuction(
    auctionId: string,
    actorId?: string,
  ): Promise<any> {
    const auction = await this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      include: { product: true },
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== "ACTIVE")
      throw new Error(
        `Auction ${auctionId} is not active (status: ${auction.status})`,
      );

    await this.bullMqWorker.flushAuction(auction.id);

    auction.end_time = new Date();
    auction.status = "CLOSED";
    auction.winner_user_id = null as any;
    auction.winning_bid_amount = null as any;
    await this.prisma.repository("auction").save(auction);

    await this.winnerService.cleanupAuctionKeys(auction.id);

    this.logger.log(
      `Auction ${auctionId}: Force closed by admin with no unique bids`,
    );

    this.closureEventsService
      .notifyForcedClosure(auction.id)
      .catch((e) =>
        this.logger.warn(
          `Failed to send forced closure notification: ${e.message}`,
        ),
      );

    if (actorId) {
      await this.closureEventsService.logClosureEvent(
        auctionId,
        "ADMIN_FORCE_CLOSE",
        [],
      );
    }

    return this.prisma.repository("auction").findOne({
      where: { id: auctionId },
      include: { product: true },
    }) as Promise<any>;
  }

  private async findWinBidWithRetry(
    bidRepo: PrismaRepository<any>,
    auctionId: string,
    amount: number,
    userId: string,
  ): Promise<any | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bids = await bidRepo.find({
        where: { auction_id: auctionId, user_id: userId },
        order: { bid_time: "asc" },
      });
      const match = bids.find((b: any) => {
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
}
