import * as crypto from 'crypto';
import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '../common/redis.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction } from '../winner/entities/auction.entity';
import { AuctionClosureService } from '../winner/auction-closure.service';
import { AuctionGateway } from './gateway/auction.gateway';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaymentTransaction, PaymentTransactionStatus, PaymentType } from '../payment/entities/payment-transaction.entity';

const LOCK_TTL = 5000;

@Injectable()
export class BiddingService {
  private readonly logger = new Logger(BiddingService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly auctionGateway: AuctionGateway,
    @InjectQueue('incoming-bids') private readonly bidQueue: Queue,
    @InjectRepository(Auction)
    private readonly auctionRepository: Repository<Auction>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly closureService: AuctionClosureService,
  ) {}

  async placeBid(
    auctionId: string,
    userId: string,
    amount: number,
    endTime: Date,
  ): Promise<{ newTotalBids: number; ticketNumber: string; productName: string }> {
    const lockKey = `takelow:auction:${auctionId}:lock`;
    const lockAcquired = await this.redis.set(lockKey, userId, 'PX', LOCK_TTL, 'NX');

    if (!lockAcquired) {
      throw new ForbiddenException('Auction is temporarily locked. Please retry.');
    }

    try {
      const now = Date.now();
      if (now > endTime.getTime()) {
        throw new ForbiddenException('Auction has closed');
      }

      // Check if user has paid bid fee via SikinaPay
      const feePaid = await this.checkBidFeePaid(userId, auctionId);
      if (!feePaid) {
        throw new BadRequestException('Bid fee not paid. Please pay the bid fee via SikinaPay before placing a bid.');
      }

      await this.bidQueue.add('bid', {
        auction_id: auctionId,
        amount: String(amount),
        user_id: userId,
        bid_time: new Date().toISOString(),
      });

      await this.trackBidInRedis(auctionId, userId, amount);

      const totalBidsStr = await this.redis.get(`takelow:auction:${auctionId}:total_bids`);
      const totalBids = totalBidsStr ? parseInt(totalBidsStr, 10) : 1;

      this.auctionGateway.broadcastAuctionUpdate({
        auction_id: auctionId,
        new_bid_amount: amount,
        total_bids: totalBids,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`Bid placed: auction=${auctionId} user=${userId} amount=${amount} total_bids=${totalBids}`);

      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        select: ['max_bid'],
      });
      if (auction?.max_bid != null && totalBids >= auction.max_bid) {
        this.logger.log(`Max bids (${auction.max_bid}) reached for auction ${auctionId}, closing early`);
        this.notifyMaxBidReached(auctionId, totalBids, auction.max_bid).catch(() => {});
        await this.closureService.closeSingleAuction(auctionId);
      }

      const auctionFull = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ['product'],
      });
      const productName = auctionFull?.product?.name || 'Unknown Product';
      const ticketNumber = `BID_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
      this.logger.log(
        `📱 [MOCK SMS] To user ${userId}: "Your bid of ${amount.toFixed(2)} ETB on '${productName}' has been placed successfully. Your BID ticket number is: ${ticketNumber}"`,
      );

      return { newTotalBids: totalBids, ticketNumber, productName };
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async notifyMaxBidReached(auctionId: string, total: number, max: number): Promise<void> {
    try {
      await fetch('http://identity-service:3000/api/v1/notify/max-bid-reached', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auctionId, total_bids: total, max_bids: max }),
      });
    } catch (e) {
      this.logger.warn(`Failed to send max-bid notification: ${e.message}`);
    }
  }

  private async checkBidFeePaid(userId: string, auctionId: string): Promise<boolean> {
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
  ): Promise<void> {
    const multi = this.redis.multi();

    multi.sadd(`takelow:auction:${auctionId}:bidders`, userId);

    multi.zincrby(`takelow:auction:${auctionId}:frequencies`, 1, String(amount));

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
      uniqueMulti.zadd(uniqueKey, amount, String(amount));
    } else if (count > 1) {
      uniqueMulti.zrem(uniqueKey, String(amount));
    }

    uniqueMulti.incr(`takelow:auction:${auctionId}:total_bids`);

    const ttl = 86400;
    uniqueMulti.expire(`takelow:auction:${auctionId}:frequencies`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:unique_bids`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:bidders`, ttl);
    uniqueMulti.expire(`takelow:auction:${auctionId}:total_bids`, ttl);

    await uniqueMulti.exec();
  }
}
