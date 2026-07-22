import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction, AuctionStatus } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
  ) {}

  async getActiveAuctions(): Promise<any[]> {
    const auctions = await this.auctionRepository.find({
      where: { status: AuctionStatus.ACTIVE },
      relations: ['product'],
      order: { created_at: 'DESC' },
      take: 50,
    });

    return Promise.all(
      auctions.map(async (auction) => {
        const totalBids = await this.bidRepository.count({
          where: { auction_id: auction.id },
        });
        const uniqueBidders = await this.bidRepository
          .createQueryBuilder('bid')
          .where('bid.auction_id = :auctionId', { auctionId: auction.id })
          .select('COUNT(DISTINCT bid.user_id)', 'count')
          .getRawOne();
        return {
          id: auction.id,
          product_id: auction.product_id,
          product: auction.product || null,
          start_time: auction.start_time,
          end_time: auction.end_time,
          time_remaining: this.computeTimeRemaining(auction.end_time),
          stats: {
            total_bids: totalBids,
            unique_bidders: parseInt(uniqueBidders?.count || '0', 10),
          },
          status: auction.status,
        };
      }),
    );
  }

  async getActiveAuction(auctionId: string): Promise<any> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['product'],
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const now = Date.now();
    const timeRemaining = Math.max(0, auction.end_time.getTime() - now);

    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    const uniqueBidders = await this.bidRepository
      .createQueryBuilder('bid')
      .where('bid.auction_id = :auctionId', { auctionId })
      .select('COUNT(DISTINCT bid.user_id)', 'count')
      .getRawOne();

    return {
      id: auction.id,
      product: (auction as any).product || null,
      time_remaining: {
        days: Math.floor(timeRemaining / 86400000),
        hours: Math.floor((timeRemaining % 86400000) / 3600000),
        minutes: Math.floor((timeRemaining % 3600000) / 60000),
        seconds: Math.floor((timeRemaining % 60000) / 1000),
      },
      stats: {
        total_bids: totalBids,
        unique_bidders: parseInt(uniqueBidders?.count || '0', 10),
        viewers: 0,
      },
      min_bid_increment: 1,
      service_fee: 50,
      status: auction.status,
      user_is_favorite: false,
    };
  }

  async getClosedAuctions(): Promise<any[]> {
    const auctions = await this.auctionRepository.find({
      where: [
        { status: AuctionStatus.CLOSED },
        { status: AuctionStatus.EXPIRED },
      ],
      relations: ['product'],
      order: { created_at: 'DESC' },
      take: 50,
    });

    return Promise.all(
      auctions.map(async (auction) => {
        const totalBids = await this.bidRepository.count({
          where: { auction_id: auction.id },
        });
        return {
          id: auction.id,
          product_id: auction.product_id,
          product: auction.product || null,
          start_time: auction.start_time,
          end_time: auction.end_time,
          status: auction.status,
          winner_user_id: auction.winner_user_id,
          winning_bid_amount: auction.winning_bid_amount,
          stats: { total_bids: totalBids },
          created_at: auction.created_at,
        };
      }),
    );
  }

  async getBidHistory(auctionId: string): Promise<Bid[]> {
    return this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: 'DESC' },
      take: 200,
    });
  }

  async getUserBidHistory(userId: string): Promise<Bid[]> {
    return this.bidRepository.find({
      where: { user_id: userId },
      order: { bid_time: 'DESC' },
      take: 100,
    });
  }

  async getUserWonAuctions(userId: string): Promise<any[]> {
    return this.auctionRepository.find({
      where: {
        winner_user_id: userId,
        status: AuctionStatus.CLOSED,
      },
      relations: ['product'],
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  private computeTimeRemaining(endTime: Date) {
    const diff = Math.max(0, endTime.getTime() - Date.now());
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  }
}
