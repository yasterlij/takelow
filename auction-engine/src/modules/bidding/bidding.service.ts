import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '../common/redis.decorator';
import { AuctionGateway } from './gateway/auction.gateway';

const BID_FEE = 50;
const LOCK_TTL = 3000;

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly auctionGateway: AuctionGateway,
  ) {}

  async placeBid(
    auctionId: string,
    userId: string,
    amount: number,
    userWalletBalance: number,
    endTime: Date,
  ): Promise<{ newTotalBids: number }> {
    const lockKey = `takelow:auction:${auctionId}:lock`;
    const lockAcquired = await this.redis.set(lockKey, userId, 'PX', LOCK_TTL, 'NX');

    if (!lockAcquired) {
      throw new ForbiddenException('Auction is locked, try again');
    }

    try {
      const now = Date.now();
      if (now > endTime.getTime()) {
        throw new ForbiddenException('Auction Closed');
      }

      if (userWalletBalance < BID_FEE) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      const streamKey = 'incoming_bids';
      await this.redis.xadd(
        streamKey,
        '*',
        'auction_id',
        auctionId,
        'amount',
        String(amount),
        'user_id',
        userId,
        'bid_time',
        new Date().toISOString(),
      );

      const freqKey = `takelow:auction:${auctionId}:frequencies`;
      const uniqueKey = `takelow:auction:${auctionId}:unique_bids`;

      const count = await this.redis.zincrby(freqKey, 1, String(amount));

      if (count === '1') {
        await this.redis.zadd(uniqueKey, 0, String(amount));
      } else if (parseInt(count, 10) > 1) {
        await this.redis.zrem(uniqueKey, String(amount));
      }

      const totalBidsStr = await this.redis.get(`takelow:auction:${auctionId}:total_bids`);
      const totalBids = totalBidsStr ? parseInt(totalBidsStr, 10) + 1 : 1;
      await this.redis.set(`takelow:auction:${auctionId}:total_bids`, totalBids);

      this.auctionGateway.broadcastAuctionUpdate({
        auction_id: auctionId,
        new_bid_amount: amount,
        total_bids: totalBids,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Bid placed: auction=${auctionId} user=${userId} amount=${amount}`);

      return { newTotalBids: totalBids };
    } finally {
      await this.redis.del(lockKey);
    }
  }
}
