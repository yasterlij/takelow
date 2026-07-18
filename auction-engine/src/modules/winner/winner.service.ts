import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '../common/redis.decorator';

@Injectable()
export class WinnerService {
  private readonly logger = new Logger(WinnerService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async calculateWinner(auctionId: string): Promise<{
    winningAmount: number | null;
    totalBids: number;
  }> {
    const freqKey = `takelow:auction:${auctionId}:frequencies`;
    const uniqueKey = `takelow:auction:${auctionId}:unique_bids`;

    const totalBidsStr = await this.redis.get(`takelow:auction:${auctionId}:total_bids`);
    const totalBids = totalBidsStr ? parseInt(totalBidsStr, 10) : 0;

    if (totalBids === 0) {
      this.logger.log(`Auction ${auctionId}: No bids placed, no winner`);
      return { winningAmount: null, totalBids: 0 };
    }

    const result = await this.redis.zrangebyscore(uniqueKey, 0, 0, 'WITHSCORES', 'LIMIT', 0, 1);

    if (result.length === 0) {
      this.logger.log(`Auction ${auctionId}: No unique bids found, expired`);
      return { winningAmount: null, totalBids };
    }

    const winningAmount = parseInt(result[0], 10);

    this.logger.log(`Auction ${auctionId}: Winner found with amount ${winningAmount}`);

    return { winningAmount, totalBids };
  }

  async cleanupAuctionKeys(auctionId: string): Promise<void> {
    const keys = [
      `takelow:auction:${auctionId}:frequencies`,
      `takelow:auction:${auctionId}:unique_bids`,
      `takelow:auction:${auctionId}:total_bids`,
      `takelow:auction:${auctionId}:lock`,
    ];

    await this.redis.del(...keys);
    this.logger.debug(`Cleaned up Redis keys for auction ${auctionId}`);
  }
}
