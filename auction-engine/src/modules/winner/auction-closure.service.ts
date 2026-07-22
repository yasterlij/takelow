import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Auction, AuctionStatus as AS, PaymentStatus } from './entities/auction.entity';
import { WinnerService } from './winner.service';
import { Bid } from '../bidding/entities/bid.entity';
import { BullMqWorker } from '../worker/bullmq.worker';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 300;

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private winnerService: WinnerService,
    private bullMqWorker: BullMqWorker,
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
        this.logger.error(`Failed to close auction ${auction.id}: ${error.message}`, error.stack);
      }
    }
  }

  private async closeAuction(auction: Auction): Promise<void> {
    await this.bullMqWorker.flushAuction(auction.id);
    const { winningAmounts, totalBids, winners } = await this.winnerService.calculateWinners(auction.id);

    if (auction.min_bid != null && totalBids > 0 && totalBids < auction.min_bid) {
      const extendMs = 24 * 60 * 60 * 1000;
      auction.end_time = new Date(Date.now() + extendMs);
      await this.auctionRepository.save(auction);
      this.logger.log(`Auction ${auction.id}: Only ${totalBids}/${auction.min_bid} bids, extended 24h`);
      this.sendExtensionNotification(auction.id, totalBids, auction.min_bid).catch(() => {});
      return;
    }

    const queryRunner = this.auctionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (totalBids === 0) {
        auction.status = AS.EXPIRED;
        this.logger.log(`Auction ${auction.id}: No bids, expired`);
      } else if (winners.length > 0) {
        const winningBids: Bid[] = [];
        for (const w of winners) {
          const bid = await this.findWinBidWithRetry(queryRunner, auction.id, w.amount, w.userId);
          if (bid) winningBids.push(bid);
        }

        if (winningBids.length === 0) {
          auction.status = AS.EXPIRED;
          this.logger.warn(`Auction ${auction.id}: No winning bids found in DB, expired`);
        } else {
          auction.winner_user_id = winningBids[0].user_id;
          auction.winning_bid_amount = winningBids[0].amount;
          auction.status = AS.CLOSED;
          auction.payment_status = PaymentStatus.PENDING;
          auction.payment_deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
          this.logger.log(`Auction ${auction.id}: ${winningBids.length} winner(s). Primary: user=${winningBids[0].user_id} amount=${winningBids[0].amount}`);
        }
      } else {
        auction.status = AS.EXPIRED;
        this.logger.log(`Auction ${auction.id}: All bid amounts duplicated, expired`);
      }

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();

      if (auction.status === AS.CLOSED && auction.winner_user_id) {
        this.sendWinnerNotifications(auction, winners).catch(() => {});
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async findWinBidWithRetry(
    queryRunner: any,
    auctionId: string,
    amount: number,
    userId: string,
  ): Promise<Bid | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bid = await queryRunner.manager.findOne(Bid, {
        where: { auction_id: auctionId, amount, user_id: userId },
        order: { bid_time: 'ASC' },
      });
      if (bid) return bid;

      if (attempt < MAX_RETRIES - 1) {
        this.logger.debug(`Win bid not found (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
    this.logger.warn(`Win bid amount=${amount} user=${userId} not found in DB after ${MAX_RETRIES} attempts for auction ${auctionId}`);
    return null;
  }

  private async sendWinnerNotifications(
    auction: Auction,
    winners: { amount: number; userId: string }[],
  ): Promise<void> {
    const auctionWithProduct = await this.auctionRepository.findOne({
      where: { id: auction.id },
      relations: ['product'],
    });
    const productName = auctionWithProduct?.product?.name || auction.id;

    for (const w of winners) {
      try {
        await fetch('http://identity-service:3000/api/v1/notify/winner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: w.userId,
            auction_id: auction.id,
            product_name: productName,
            winning_amount: w.amount,
            payment_deadline: auction.payment_deadline?.toISOString(),
          }),
        });
      } catch (e) {
        this.logger.warn(`Failed to send winner notification to user ${w.userId}: ${e.message}`);
      }
    }
  }

  private async sendExtensionNotification(auctionId: string, current: number, min: number): Promise<void> {
    try {
      await fetch('http://identity-service:3000/api/v1/notify/auction-extended', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auction_id: auctionId, current_bids: current, min_bids: min }),
      });
    } catch (e) {
      this.logger.warn(`Failed to send extension notification: ${e.message}`);
    }
  }

  async closeSingleAuction(auctionId: string): Promise<Auction> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new Error(`Auction ${auctionId} not found`);
    if (auction.status !== AS.ACTIVE) throw new Error(`Auction ${auctionId} is not active (status: ${auction.status})`);
    await this.closeAuction(auction);
    return this.auctionRepository.findOne({ where: { id: auctionId }, relations: ['product'] }) as Promise<Auction>;
  }
}
