import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";
import { Bid } from "../bidding/entities/bid.entity";
import { Auction } from "./entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "./entities/winner.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";

@Injectable()
export class WinnerService {
  private readonly logger = new Logger(WinnerService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Bid) private bidRepository: Repository<Bid>,
    @InjectRepository(Auction) private auctionRepository: Repository<Auction>,
    @InjectRepository(Winner) private winnerRepository: Repository<Winner>,
    private readonly bidEncryptionService: BidEncryptionService,
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

    try {
      const result = await this.calculateWinnersFromRedis(auctionId, 1);
      if (result.found) {
        return result;
      }
    } catch (e) {
      this.logger.warn(`Redis winner calc failed for ${auctionId}: ${e.message}`);
    }

    return this.calculateWinnersFromDb(auctionId, 1);
  }

  async hasUniqueBids(auctionId: string): Promise<boolean> {
    try {
      const result = await this.hasUniqueBidsFromRedis(auctionId);
      if (result !== null) return result;
    } catch (e) {
      this.logger.warn(`Redis unique check failed for ${auctionId}: ${e.message}`);
    }

    return this.hasUniqueBidsFromDb(auctionId);
  }

  private async hasUniqueBidsFromRedis(auctionId: string): Promise<boolean | null> {
    const totalBidsStr = await this.redis.get(
      `takelow:auction:${auctionId}:total_bids`,
    );
    if (totalBidsStr === null) return null;

    const totalBids = parseInt(totalBidsStr, 10);
    if (totalBids === 0) return false;

    const uniqueKey = `takelow:auction:${auctionId}:unique_bids`;
    const count = await this.redis.zcard(uniqueKey);
    if (count === 0) return false;

    const amounts = await this.redis.zrange(uniqueKey, 0, -1);
    const freqKey = `takelow:auction:${auctionId}:frequencies`;

    for (const amount of amounts) {
      const freq = await this.redis.zscore(freqKey, amount);
      if (freq && Number(freq) === 1) return true;
    }

    return false;
  }

  private async hasUniqueBidsFromDb(auctionId: string): Promise<boolean> {
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      select: ["amount", "encrypted_amount"],
    });

    if (bids.length === 0) return false;

    const frequency = new Map<number, number>();
for (const bid of bids) {
  const bidAmount = Number(bid.amount);
  if (bidAmount === 0 && bid.encrypted_amount) continue;
  let realAmount = bidAmount;
  if (bid.encrypted_amount) {
    try {
      realAmount = Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      continue;
    }
  }
  frequency.set(realAmount, (frequency.get(realAmount) || 0) + 1);
}

    for (const count of frequency.values()) {
      if (count === 1) return true;
    }

    return false;
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
    manager?: EntityManager,
  ): Promise<Winner[]> {
    const repo = manager ? manager.getRepository(Winner) : this.winnerRepository;
    const existing = await repo.find({
      where: { auction_id: auctionId },
    });
    if (existing.length > 0) {
      this.logger.warn(
        `Winners already exist for auction ${auctionId}, skipping persist`,
      );
      return existing;
    }

    const entities = winners.map((w, i) =>
      repo.create({
        auction_id: auctionId,
        user_id: w.userId,
        amount: w.amount,
        rank: i + 1,
        payment_status: WinnerPaymentStatus.PENDING,
        payment_deadline: paymentDeadline,
      }),
    );

    return repo.save(entities);
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
    const freqKey = `takelow:auction:${auctionId}:frequencies`;

    const freqResults = await Promise.all(
      winningAmounts.map((a) => this.redis.zscore(freqKey, String(a))),
    );

    const uniqueAmounts = winningAmounts.filter(
      (_, i) => freqResults[i] && Number(freqResults[i]) === 1,
    );

    const earliestMap = await this.findEarliestBidders(auctionId, uniqueAmounts);
    const winners: { amount: number; userId: string }[] = [];
    for (const amount of uniqueAmounts) {
      const userId = earliestMap.get(amount);
      if (userId) {
        winners.push({ amount, userId });
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
  const bidAmount = Number(bid.amount);
  if (bidAmount === 0 && bid.encrypted_amount) continue;
  let realAmount = bidAmount;
  if (bid.encrypted_amount) {
    try {
      realAmount = Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      continue;
    }
  }
  frequency.set(realAmount, (frequency.get(realAmount) || 0) + 1);
  if (!earliestPerAmount.has(realAmount)) {
    earliestPerAmount.set(realAmount, bid.user_id);
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
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "ASC" },
      select: ["user_id", "amount", "encrypted_amount"],
    });
    const match = bids.find((b) => {
      if (b.amount !== 0 || !b.encrypted_amount) return Number(b.amount) === amount;
      try {
        return Number(this.bidEncryptionService.decrypt(b.encrypted_amount)) === amount;
      } catch {
        return false;
      }
    });
    return match?.user_id || null;
  }

  private async findEarliestBidders(
    auctionId: string,
    amounts: number[],
  ): Promise<Map<number, string>> {
    if (amounts.length === 0) return new Map();
    const amountSet = new Set(amounts);
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "ASC" },
    });
    const result = new Map<number, string>();
    const seen = new Set<number>();
for (const bid of bids) {
  const bidAmount = Number(bid.amount);
  if (bidAmount === 0 && bid.encrypted_amount) continue;
  let realAmount = bidAmount;
  if (bid.encrypted_amount) {
    try {
      realAmount = Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      continue;
    }
  }
  if (amountSet.has(realAmount) && !seen.has(realAmount)) {
    seen.add(realAmount);
    result.set(realAmount, bid.user_id);
  }
}
    return result;
  }

  async getUniqueBiddersCount(auctionId: string): Promise<number> {
    try {
      const key = `takelow:auction:${auctionId}:bidders`;
      const count = await this.redis.scard(key);
      if (count > 0) return count;
    } catch (e) {
      this.logger.warn(`Redis scard failed for ${auctionId}: ${e.message}`);
    }

    try {
      const dbCount = await this.bidRepository
        .createQueryBuilder("bid")
        .where("bid.auction_id = :auctionId", { auctionId })
        .select("COUNT(DISTINCT bid.user_id)", "count")
        .getRawOne();
      return parseInt(dbCount?.count || "0", 10);
    } catch (e) {
      this.logger.error(`DB count query failed for ${auctionId}: ${e.message}`);
      return 0;
    }
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
