import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Auction, AuctionStatus } from './entities/auction.entity';
import { WinnerService } from './winner.service';
import { Bid } from '../bidding/entities/bid.entity';

@Injectable()
export class AuctionClosureService {
  private readonly logger = new Logger(AuctionClosureService.name);

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private winnerService: WinnerService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async closeExpiredAuctions(): Promise<void> {
    const now = new Date();

    const expiredAuctions = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.ACTIVE,
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
        );
      }
    }
  }

  private async closeAuction(auction: Auction): Promise<void> {
    const { winningAmount, totalBids } = await this.winnerService.calculateWinner(
      auction.id,
    );

    const queryRunner =
      this.auctionRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (winningAmount !== null) {
        const lowestBid = await queryRunner.manager.findOne(Bid, {
          where: { auction_id: auction.id, amount: winningAmount },
          order: { bid_time: 'ASC' },
        });

        auction.winner_user_id = lowestBid?.user_id || null as any;
        auction.winning_bid_amount = winningAmount;
        auction.status = AuctionStatus.CLOSED;

        this.logger.log(
          `Auction ${auction.id}: Winner user=${auction.winner_user_id} amount=${winningAmount}`,
        );
      } else {
        auction.status = totalBids === 0 ? AuctionStatus.EXPIRED : AuctionStatus.EXPIRED;
        this.logger.log(
          `Auction ${auction.id}: No winner (total_bids=${totalBids})`,
        );
      }

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.winnerService.cleanupAuctionKeys(auction.id);
  }

  async closeSingleAuction(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) {
      throw new Error(`Auction ${auctionId} not found`);
    }
    await this.closeAuction(auction);
  }
}
