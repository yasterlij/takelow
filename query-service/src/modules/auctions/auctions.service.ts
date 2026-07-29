import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, In } from 'typeorm';
import { Auction, AuctionStatus } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { BidEncryptionService } from '../common/bid-encryption.service';

interface WinnerRow {
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: Date;
  user_name: string | null;
}

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private bidEncryptionService: BidEncryptionService,
  ) {}

  async getActiveAuctions(): Promise<any[]> {
    const auctions = await this.auctionRepository.find({
      where: { status: AuctionStatus.ACTIVE, end_time: MoreThan(new Date()) },
      relations: ['product'],
      order: { created_at: 'DESC' },
      take: 50,
    });

    if (auctions.length === 0) return [];

    const auctionIds = auctions.map((a) => a.id);

    const [bidCounts, uniqueBidderRows] = await Promise.all([
      this.bidRepository
        .createQueryBuilder('bid')
        .select('bid.auction_id', 'auction_id')
        .addSelect('COUNT(*)', 'count')
        .where('bid.auction_id IN (:...ids)', { ids: auctionIds })
        .groupBy('bid.auction_id')
        .getRawMany(),
      this.bidRepository
        .createQueryBuilder('bid')
        .select('bid.auction_id', 'auction_id')
        .addSelect('COUNT(DISTINCT bid.user_id)', 'count')
        .where('bid.auction_id IN (:...ids)', { ids: auctionIds })
        .groupBy('bid.auction_id')
        .getRawMany(),
    ]);

    const bidCountMap = new Map(bidCounts.map((r: any) => [r.auction_id, parseInt(r.count, 10)]));
    const uniqueBidderMap = new Map(uniqueBidderRows.map((r: any) => [r.auction_id, parseInt(r.count, 10)]));

    return auctions.map((auction) => ({
      id: auction.id,
      product_id: auction.product_id,
      product: auction.product || null,
      start_time: auction.start_time,
      end_time: auction.end_time,
      time_remaining: this.computeTimeRemaining(auction.end_time),
      stats: {
        total_bids: bidCountMap.get(auction.id) || 0,
        unique_bidders: uniqueBidderMap.get(auction.id) || 0,
      },
      status: auction.status,
    }));
  }

  async getActiveAuction(auctionId: string): Promise<any> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['product'],
    });

    if (!auction || auction.status !== AuctionStatus.ACTIVE || auction.end_time.getTime() <= Date.now()) {
      throw new NotFoundException('Auction not found or has ended');
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
      },
      status: auction.status,
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

    const auctionIds = auctions.map((a) => a.id);

    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    if (auctionIds.length > 0) {
      try {
        const winnerRows: any[] = await this.auctionRepository.query(
          `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name
           FROM winners w
           LEFT JOIN users u ON u.id = w.user_id
           WHERE w.auction_id = ANY($1)
           ORDER BY w.rank ASC`,
          [auctionIds],
        );
        for (const row of winnerRows) {
          if (!winnersByAuction.has(row.auction_id)) {
            winnersByAuction.set(row.auction_id, []);
          }
          winnersByAuction.get(row.auction_id)!.push({
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            rank: row.rank,
            payment_status: row.payment_status,
            payment_deadline: row.payment_deadline,
            user_name: row.user_name || null,
          });
        }
      } catch {
        // winners table may not exist in query service's read replica; ignore
      }
    }

    if (auctions.length === 0) return [];

    const bidCountRows = await this.bidRepository
      .createQueryBuilder('bid')
      .select('bid.auction_id', 'auction_id')
      .addSelect('COUNT(*)', 'count')
      .where('bid.auction_id IN (:...ids)', { ids: auctionIds })
      .groupBy('bid.auction_id')
      .getRawMany();
    const bidCountMap = new Map(bidCountRows.map((r: any) => [r.auction_id, parseInt(r.count, 10)]));

    return auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id) || [];
      return {
        id: auction.id,
        product_id: auction.product_id,
        product: auction.product || null,
        start_time: auction.start_time,
        end_time: auction.end_time,
        status: auction.status,
        winner_user_id: auction.winner_user_id,
        winning_bid_amount: auction.winning_bid_amount,
        winners: auctionWinners.map((w) => ({
          user_id: w.user_id,
          user_name: w.user_name,
          amount: w.amount,
          rank: w.rank,
          payment_status: w.payment_status,
          payment_deadline: w.payment_deadline,
        })),
        winners_count: auctionWinners.length,
        stats: { total_bids: bidCountMap.get(auction.id) || 0 },
        created_at: auction.created_at,
      };
    });
  }

  async getBidHistory(auctionId: string): Promise<any[]> {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      select: ['id', 'status'],
    });
    const isActive = auction?.status === AuctionStatus.ACTIVE;
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: 'DESC' },
      take: 200,
    });
    return Promise.all(bids.map(async (b) => {
      let realAmount = b.amount;
      if (!isActive && b.encrypted_amount) {
        try {
          realAmount = this.bidEncryptionService.decrypt(b.encrypted_amount);
        } catch {
          realAmount = 0;
        }
      }
      return {
        id: b.id,
        user_id: b.user_id,
        auction_id: b.auction_id,
        amount: isActive ? 0 : realAmount,
        encrypted_amount: isActive ? b.encrypted_amount : null,
        amount_encrypted: isActive,
        bid_time: b.bid_time,
        service_fee_paid: b.service_fee_paid,
        ticket_number: b.ticket_number,
      };
    }));
  }

  async getUserBidHistory(userId: string): Promise<any[]> {
    const bids = await this.bidRepository.find({
      where: { user_id: userId },
      order: { bid_time: 'DESC' },
      take: 100,
    });

    if (bids.length === 0) return [];

    const auctionIds = [...new Set(bids.map((b) => b.auction_id))];
    const auctions = await this.auctionRepository.find({
      where: { id: In(auctionIds) },
      select: ['id', 'status'],
    });
    const auctionStatusMap = new Map(auctions.map((a) => [a.id, a.status]));

    return Promise.all(bids.map(async (b) => {
      const isActive = auctionStatusMap.get(b.auction_id) === AuctionStatus.ACTIVE;
      let realAmount = b.amount;
      if (!isActive && b.encrypted_amount) {
        try {
          realAmount = this.bidEncryptionService.decrypt(b.encrypted_amount);
        } catch {
          realAmount = 0;
        }
      }
      return {
        id: b.id,
        user_id: b.user_id,
        auction_id: b.auction_id,
        amount: isActive ? 0 : realAmount,
        encrypted_amount: isActive ? b.encrypted_amount : null,
        amount_encrypted: isActive,
        bid_time: b.bid_time,
        service_fee_paid: b.service_fee_paid,
        ticket_number: b.ticket_number,
      };
    }));
  }

  async getUserWonAuctions(userId: string): Promise<any[]> {
    const auctions = await this.auctionRepository.find({
      where: {
        winner_user_id: userId,
        status: AuctionStatus.CLOSED,
      },
      relations: ['product'],
      order: { created_at: 'DESC' },
      take: 50,
    });

    const auctionIds = auctions.map((a) => a.id);
    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    if (auctionIds.length > 0) {
      try {
        const winnerRows: any[] = await this.auctionRepository.query(
          `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name
           FROM winners w
           LEFT JOIN users u ON u.id = w.user_id
           WHERE w.auction_id = ANY($1) AND w.user_id = $2
           ORDER BY w.rank ASC`,
          [auctionIds, userId],
        );
        for (const row of winnerRows) {
          if (!winnersByAuction.has(row.auction_id)) {
            winnersByAuction.set(row.auction_id, []);
          }
          winnersByAuction.get(row.auction_id)!.push({
            user_id: row.user_id,
            amount: parseFloat(row.amount),
            rank: row.rank,
            payment_status: row.payment_status,
            payment_deadline: row.payment_deadline,
            user_name: row.user_name || null,
          });
        }
      } catch { /* ignore */ }
    }

    return auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id) || [];
      return {
        id: auction.id,
        product: auction.product,
        start_time: auction.start_time,
        end_time: auction.end_time,
        status: auction.status,
        winner_user_id: auction.winner_user_id,
        winning_bid_amount: auction.winning_bid_amount,
        winners: auctionWinners,
        created_at: auction.created_at,
      };
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
