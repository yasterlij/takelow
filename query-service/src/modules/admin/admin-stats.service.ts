import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction } from '../auctions/entities/auction.entity';

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
  ) {}

  async getStats() {
    const [userCount] = await this.auctionRepository.query(
      `SELECT COUNT(*)::int AS total FROM users`,
    );
    const [auctionCounts] = await this.auctionRepository.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed,
        COUNT(*) FILTER (WHERE status = 'EXPIRED')::int AS expired
       FROM auctions`,
    );
    const [bidCount] = await this.auctionRepository.query(
      `SELECT COUNT(*)::int AS total FROM bids`,
    );
    const [productCount] = await this.auctionRepository.query(
      `SELECT COUNT(*)::int AS total FROM products`,
    );
    const [todayBids] = await this.auctionRepository.query(
      `SELECT COUNT(*)::int AS total FROM bids WHERE bid_time >= NOW() - INTERVAL '24 hours'`,
    );
    const [walletTotal] = await this.auctionRepository.query(
      `SELECT COALESCE(SUM(wallet_balance), 0)::float AS total FROM users`,
    );
    const [revenue] = await this.auctionRepository.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'BID_FEE'`,
    );
    const [todayRevenue] = await this.auctionRepository.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'BID_FEE' AND created_at >= NOW() - INTERVAL '24 hours'`,
    );
    const [depositTotal] = await this.auctionRepository.query(
      `SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'DEPOSIT'`,
    );
    const [activeUsers] = await this.auctionRepository.query(
      `SELECT COUNT(DISTINCT user_id)::int AS total FROM bids WHERE bid_time >= NOW() - INTERVAL '24 hours'`,
    );
    const topBidders = await this.auctionRepository.query(
      `SELECT u.phone_number, u.full_name, COUNT(b.id)::int AS bid_count
       FROM bids b
       JOIN users u ON u.id = b.user_id
       GROUP BY u.id, u.phone_number, u.full_name
       ORDER BY bid_count DESC
       LIMIT 10`,
    );
    const [dailyBidTrend] = await this.auctionRepository.query(
      `SELECT
        json_agg(row ORDER BY day) AS trend
       FROM (
         SELECT DATE(bid_time) AS day, COUNT(*)::int AS count
         FROM bids
         WHERE bid_time >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(bid_time)
         ORDER BY day
       ) row`,
    );

    return {
      users: { total: userCount.total, active_today: activeUsers.total },
      auctions: {
        total: auctionCounts.total,
        active: auctionCounts.active,
        closed: auctionCounts.closed,
        expired: auctionCounts.expired,
      },
      bids: { total: bidCount.total, last_24h: todayBids.total },
      products: { total: productCount.total },
      finances: {
        wallet_total: walletTotal.total,
        revenue_total: revenue.total,
        revenue_today: todayRevenue.total,
        deposits_total: depositTotal.total,
      },
      top_bidders: topBidders,
      daily_bid_trend: dailyBidTrend?.trend || [],
    };
  }
}