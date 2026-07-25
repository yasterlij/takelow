import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";
import { Bid } from "../bidding/entities/bid.entity";
import { Auction } from "./entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "./entities/winner.entity";

@Injectable()
export class WinnerService {
  private readonly logger = new Logger(WinnerService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Bid) private bidRepository: Repository<Bid>,
    @InjectRepository(Auction) private auctionRepository: Repository<Auction>,
    @InjectRepository(Winner) private winnerRepository: Repository<Winner>,
  ) {}

  async calculateWinners(auctionId: string): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      select: ["status"],
    });

    if (auction?.status === "CLOSED" || auction?.status === "EXPIRED") {
      return this.getPersistedWinners(auctionId);
    }

    const result = await this.calculateWinnersFromRedis(auctionId, 1);
    if (result.found) {
      return result;
    }

    return this.calculateWinnersFromDb(auctionId, 1);
  }

  async getPersistedWinners(auctionId: string): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    const persistedWinners = await this.winnerRepository.find({
      where: { auction_id: auctionId },
      order: { rank: "ASC" },
    });

    return {
      winningAmounts: persistedWinners.map((w) => w.amount),
      totalBids,
      winners: persistedWinners.map((w) => ({
        amount: w.amount,
        userId: w.user_id,
      })),
    };
  }

  async persistWinners(
    auctionId: string,
    winners: { amount: number; userId: string }[],
    paymentDeadline: Date,
  ): Promise<Winner[]> {
    const existing = await this.winnerRepository.find({
      where: { auction_id: auctionId },
    });
    if (existing.length > 0) {
      this.logger.warn(
        `Winners already exist for auction ${auctionId}, skipping persist`,
      );
      return existing;
    }

    const entities = winners.map((w, i) =>
      this.winnerRepository.create({
        auction_id: auctionId,
        user_id: w.userId,
        amount: w.amount,
        rank: i + 1,
        payment_status: WinnerPaymentStatus.PENDING,
        payment_deadline: paymentDeadline,
      }),
    );

    return this.winnerRepository.save(entities);
  }

  private async calculateWinnersFromRedis(
    auctionId: string,
    numWinners: number,
  ): Promise<{
    found: boolean;
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const totalBidsStr = await this.redis.get(
      `takelow:auction:${auctionId}:total_bids`,
    );
    if (totalBidsStr === null) {
      return { found: false, winningAmounts: [], totalBids: 0, winners: [] };
    }

    const totalBids = parseInt(totalBidsStr, 10);
    if (totalBids === 0) {
      return { found: true, winningAmounts: [], totalBids: 0, winners: [] };
    }

    const uniqueKey = `takelow:auction:${auctionId}:unique_bids`;
    const amounts = await this.redis.zrange(uniqueKey, 0, numWinners - 1);
    if (amounts.length === 0) {
      return { found: true, winningAmounts: [], totalBids, winners: [] };
    }

    const winningAmounts = amounts.map((a) => parseFloat(a));
    const winners: { amount: number; userId: string }[] = [];

    for (const amount of winningAmounts) {
      const freqKey = `takelow:auction:${auctionId}:frequencies`;
      const freq = await this.redis.zscore(freqKey, String(amount));
      if (freq && Number(freq) === 1) {
        const userId = await this.findEarliestBidder(auctionId, amount);
        if (userId) {
          winners.push({ amount, userId });
        }
      }
    }

    return { found: true, winningAmounts, totalBids, winners };
  }

  private async calculateWinnersFromDb(
    auctionId: string,
    numWinners: number,
  ): Promise<{
    winningAmounts: number[];
    totalBids: number;
    winners: { amount: number; userId: string }[];
  }> {
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "ASC" },
    });

    const totalBids = bids.length;
    if (totalBids === 0) {
      return { winningAmounts: [], totalBids: 0, winners: [] };
    }

    const frequency = new Map<number, number>();
    const earliestPerAmount = new Map<number, string>();
    for (const bid of bids) {
      frequency.set(bid.amount, (frequency.get(bid.amount) || 0) + 1);
      if (!earliestPerAmount.has(bid.amount)) {
        earliestPerAmount.set(bid.amount, bid.user_id);
      }
    }

    const uniqueAmounts = Array.from(frequency.entries())
      .filter(([, count]) => count === 1)
      .map(([amount]) => amount)
      .sort((a, b) => a - b);

    const selected = uniqueAmounts.slice(0, numWinners);
    const winners = selected.map((amount) => ({
      amount,
      userId: earliestPerAmount.get(amount) || "",
    }));

    return { winningAmounts: selected, totalBids, winners };
  }

  private async findEarliestBidder(
    auctionId: string,
    amount: number,
  ): Promise<string | null> {
    const bid = await this.bidRepository.findOne({
      where: { auction_id: auctionId, amount },
      order: { bid_time: "ASC" },
    });
    return bid?.user_id || null;
  }

  async getUniqueBiddersCount(auctionId: string): Promise<number> {
    const key = `takelow:auction:${auctionId}:bidders`;
    const count = await this.redis.scard(key);
    if (count > 0) return count;

    const dbCount = await this.bidRepository
      .createQueryBuilder("bid")
      .where("bid.auction_id = :auctionId", { auctionId })
      .select("COUNT(DISTINCT bid.user_id)", "count")
      .getRawOne();
    return parseInt(dbCount?.count || "0", 10);
  }

  async getAuctionStats(auctionId: string): Promise<{
    totalBids: number;
    uniqueBidders: number;
    lowestUniqueBid: number | null;
  }> {
    const { winningAmounts, totalBids } =
      await this.calculateWinners(auctionId);
    const uniqueBidders = await this.getUniqueBiddersCount(auctionId);
    return {
      totalBids,
      uniqueBidders,
      lowestUniqueBid: winningAmounts.length > 0 ? winningAmounts[0] : null,
    };
  }

  async cleanupAuctionKeys(auctionId: string): Promise<void> {
    const keys = [
      `takelow:auction:${auctionId}:frequencies`,
      `takelow:auction:${auctionId}:unique_bids`,
      `takelow:auction:${auctionId}:total_bids`,
      `takelow:auction:${auctionId}:bidders`,
      `takelow:auction:${auctionId}:lock`,
    ];

    await this.redis.del(...keys);
    this.logger.debug(`Cleaned up Redis keys for auction ${auctionId}`);
  }

  async updateWinnerPaymentStatus(
    auctionId: string,
    userId: string,
    status: WinnerPaymentStatus,
  ): Promise<void> {
    await this.winnerRepository.update(
      { auction_id: auctionId, user_id: userId },
      { payment_status: status },
    );
  }

  async getAuctionWinners(auctionId: string): Promise<Winner[]> {
    return this.winnerRepository.find({
      where: { auction_id: auctionId },
      order: { rank: "ASC" },
    });
  }

  async getNextUnpaidWinner(auctionId: string): Promise<Winner | null> {
    return this.winnerRepository.findOne({
      where: {
        auction_id: auctionId,
        payment_status: WinnerPaymentStatus.PENDING,
      },
      order: { rank: "ASC" },
    });
  }
}
