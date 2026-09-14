import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RevenueAnalyticsFilters {
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AdminStatsService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const q = (sql: string) => this.prisma.$queryRawUnsafe(sql);

    const [
      userCount,
      auctionCounts,
      bidCount,
      productCount,
      todayBids,
      walletTotal,
      revenue,
      todayRevenue,
      depositTotal,
      activeUsers,
      topBidders,
      dailyBidTrend,
    ] = await Promise.all([
      q(`SELECT COUNT(*)::int AS total FROM users`).then((r: any) => r[0]),
      q(`SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE status = 'CLOSED')::int AS closed,
        COUNT(*) FILTER (WHERE status = 'EXPIRED')::int AS expired
       FROM auctions`).then((r: any) => r[0]),
      q(`SELECT COUNT(*)::int AS total FROM bids`).then((r: any) => r[0]),
      q(`SELECT COUNT(*)::int AS total FROM products`).then((r: any) => r[0]),
      q(`SELECT COUNT(*)::int AS total FROM bids WHERE bid_time >= NOW() - INTERVAL '24 hours'`).then((r: any) => r[0]),
      q(`SELECT COALESCE(SUM(wallet_balance), 0)::float AS total FROM users`).then((r: any) => r[0]),
      q(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'BID_FEE'`).then((r: any) => r[0]),
      q(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'BID_FEE' AND created_at >= NOW() - INTERVAL '24 hours'`).then((r: any) => r[0]),
      q(`SELECT COALESCE(SUM(amount), 0)::float AS total FROM transactions WHERE type = 'DEPOSIT'`).then((r: any) => r[0]),
      q(`SELECT COUNT(DISTINCT user_id)::int AS total FROM bids WHERE bid_time >= NOW() - INTERVAL '24 hours'`).then((r: any) => r[0]),
      q(`SELECT u.phone_number, u.full_name, COUNT(b.id)::int AS bid_count
        FROM bids b
        JOIN users u ON u.id = b.user_id
        GROUP BY u.id, u.phone_number, u.full_name
        ORDER BY bid_count DESC
        LIMIT 10`),
      q(`SELECT
        json_agg(row ORDER BY day) AS trend
       FROM (
         SELECT DATE(bid_time) AS day, COUNT(*)::int AS count
         FROM bids
         WHERE bid_time >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(bid_time)
         ORDER BY day
       ) row`).then((r: any) => r[0]),
    ]);

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

  async getRevenueAnalytics(filters: RevenueAnalyticsFilters = {}) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const [
      bidFeeRevenue,
      winningPaymentRevenue,
      revenueTrend,
      topAuctionsByRevenue,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          type: 'BID_FEE',
          created_at: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          status: 'SUCCESSFUL',
          payment_type: 'WINNING_BID',
          created_at: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT DATE(created_at) AS day,
                COALESCE(SUM(amount) FILTER (WHERE type = 'BID_FEE'), 0)::float AS bid_fee_revenue,
                COALESCE(SUM(amount) FILTER (WHERE type = 'REFUND'), 0)::float AS refund_total
         FROM transactions
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY DATE(created_at)
         ORDER BY day`,
        startDate,
        endDate,
      ),
      this.prisma.$queryRawUnsafe(
        `SELECT a.id AS auction_id,
                p.name AS product_name,
                COALESCE(a.winning_bid_amount, 0)::float AS winning_amount,
                COALESCE(
                  (SELECT SUM(t.amount) FROM transactions t
                   WHERE t.type = 'BID_FEE' AND t.reference_id = a.id::text
                     AND t.created_at >= $1 AND t.created_at <= $2),
                  0
                )::float AS bid_fee_revenue,
                (COALESCE(a.winning_bid_amount, 0) +
                 COALESCE(
                   (SELECT SUM(t.amount) FROM transactions t
                    WHERE t.type = 'BID_FEE' AND t.reference_id = a.id::text
                      AND t.created_at >= $1 AND t.created_at <= $2),
                   0
                 ))::float AS total_revenue
         FROM auctions a
         JOIN products p ON p.id = a.product_id
         WHERE a.winning_bid_amount IS NOT NULL
         ORDER BY total_revenue DESC
         LIMIT 10`,
        startDate,
        endDate,
      ),
    ]);

    const totalBidFeeRevenue = Number(bidFeeRevenue._sum.amount || 0);
    const totalWinningPaymentRevenue = Number(
      winningPaymentRevenue._sum.amount || 0,
    );

    return {
      total_bid_fee_revenue: totalBidFeeRevenue,
      total_winning_payment_revenue: totalWinningPaymentRevenue,
      total_revenue: totalBidFeeRevenue + totalWinningPaymentRevenue,
      revenue_trend: revenueTrend,
      top_auctions_by_revenue: topAuctionsByRevenue,
    };
  }

  async getUserAnalytics(filters: RevenueAnalyticsFilters = {}) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const activeSince = new Date(
      endDate.getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    const retentionCutoff = new Date(
      startDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    );

    const [
      newUsersPerDay,
      activeUsers7d,
      totalUsers,
      users30DaysAgo,
      topBidders,
    ] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `SELECT DATE(created_at) AS day, COUNT(*)::int AS count
         FROM users
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY DATE(created_at)
         ORDER BY day`,
        startDate,
        endDate,
      ),
      this.prisma.bid.groupBy({
        by: ['user_id'],
        where: {
          bid_time: { gte: activeSince, lte: endDate },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1000,
      }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          created_at: { lte: retentionCutoff },
        },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT u.id AS user_id,
                u.phone_number,
                u.full_name,
                COUNT(b.id)::int AS bid_count
         FROM bids b
         JOIN users u ON u.id = b.user_id
         WHERE b.bid_time >= $1 AND b.bid_time <= $2
         GROUP BY u.id, u.phone_number, u.full_name
         ORDER BY bid_count DESC
         LIMIT 10`,
        startDate,
        endDate,
      ),
    ]);

    const activeUserCount = activeUsers7d.length;
    const retentionRate =
      users30DaysAgo > 0
        ? (activeUserCount / users30DaysAgo) * 100
        : 0;

    return {
      new_users_per_day: newUsersPerDay,
      active_users_7d: activeUserCount,
      total_users: totalUsers,
      user_retention_rate: Number(retentionRate.toFixed(2)),
      top_bidders: topBidders,
    };
  }

  async getAuctionAnalytics(filters: RevenueAnalyticsFilters = {}) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const [
      totalAuctions,
      closedAuctions,
      expiredAuctions,
      bidCount,
      winningBidStats,
      durationAnalytics,
      categoryDistribution,
    ] = await Promise.all([
      this.prisma.auction.count({
        where: { created_at: { gte: startDate, lte: endDate } },
      }),
      this.prisma.auction.count({
        where: { status: 'CLOSED', created_at: { gte: startDate, lte: endDate } },
      }),
      this.prisma.auction.count({
        where: { status: 'EXPIRED', created_at: { gte: startDate, lte: endDate } },
      }),
      this.prisma.bid.count({
        where: { bid_time: { gte: startDate, lte: endDate } },
      }),
      this.prisma.auction.aggregate({
        where: {
          winning_bid_amount: { not: null },
          created_at: { gte: startDate, lte: endDate },
        },
        _avg: { winning_bid_amount: true },
        _count: { winning_bid_amount: true },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT
           AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::float AS avg_duration_hours,
           MIN(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::float AS min_duration_hours,
           MAX(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)::float AS max_duration_hours
         FROM auctions
         WHERE created_at >= $1 AND created_at <= $2`,
        startDate,
        endDate,
      ),
      this.prisma.$queryRawUnsafe(
        `SELECT p.category, COUNT(a.id)::int AS auction_count
         FROM auctions a
         JOIN products p ON p.id = a.product_id
         WHERE a.created_at >= $1 AND a.created_at <= $2
         GROUP BY p.category
         ORDER BY auction_count DESC`,
        startDate,
        endDate,
      ),
    ]);

    const completedAuctions = closedAuctions + expiredAuctions;
    const completionRate =
      totalAuctions > 0
        ? (completedAuctions / totalAuctions) * 100
        : 0;
    const avgBidsPerAuction =
      totalAuctions > 0 ? bidCount / totalAuctions : 0;

    return {
      total_auctions: totalAuctions,
      completion_rate: Number(completionRate.toFixed(2)),
      average_bids_per_auction: Number(avgBidsPerAuction.toFixed(2)),
      average_winning_bid_amount: Number(
        winningBidStats._avg.winning_bid_amount || 0,
      ),
      total_winning_bids: winningBidStats._count.winning_bid_amount || 0,
      duration_analytics: durationAnalytics,
      category_distribution: categoryDistribution,
    };
  }

  async getBidAnalytics(filters: RevenueAnalyticsFilters = {}) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const [
      bidsPerDay,
      peakBiddingHours,
      bidAmountDistribution,
      totalBids,
      uniqueBidders,
    ] = await Promise.all([
      this.prisma.$queryRawUnsafe(
        `SELECT DATE(bid_time) AS day, COUNT(*)::int AS count
         FROM bids
         WHERE bid_time >= $1 AND bid_time <= $2
         GROUP BY DATE(bid_time)
         ORDER BY day`,
        startDate,
        endDate,
      ),
      this.prisma.$queryRawUnsafe(
        `SELECT EXTRACT(HOUR FROM bid_time)::int AS hour, COUNT(*)::int AS count
         FROM bids
         WHERE bid_time >= $1 AND bid_time <= $2
         GROUP BY hour
         ORDER BY count DESC
         LIMIT 5`,
        startDate,
        endDate,
      ),
      this.prisma.$queryRawUnsafe(
        `SELECT
           MIN(amount)::float AS min_amount,
           MAX(amount)::float AS max_amount,
           AVG(amount)::float AS avg_amount,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount)::float AS median_amount
         FROM bids
         WHERE bid_time >= $1 AND bid_time <= $2`,
        startDate,
        endDate,
      ),
      this.prisma.bid.count({
        where: { bid_time: { gte: startDate, lte: endDate } },
      }),
      this.prisma.bid.groupBy({
        by: ['user_id'],
        where: { bid_time: { gte: startDate, lte: endDate } },
        _count: { _all: true },
      }),
    ]);

    const uniqueBidderRate =
      totalBids > 0 ? (uniqueBidders.length / totalBids) * 100 : 0;

    return {
      total_bids: totalBids,
      bids_per_day: bidsPerDay,
      peak_bidding_hours: peakBiddingHours,
      bid_amount_distribution: bidAmountDistribution,
      unique_bidder_count: uniqueBidders.length,
      unique_bidder_rate: Number(uniqueBidderRate.toFixed(2)),
    };
  }

  async getPaymentAnalytics(filters: RevenueAnalyticsFilters = {}) {
    const startDate = filters.startDate
      ? new Date(filters.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const range = { created_at: { gte: startDate, lte: endDate } };

    const [
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      avgPaymentTime,
      failedPaymentsByGateway,
    ] = await Promise.all([
      this.prisma.paymentTransaction.count({ where: range }),
      this.prisma.paymentTransaction.count({
        where: { status: 'SUCCESSFUL', ...range },
      }),
      this.prisma.paymentTransaction.count({
        where: { status: 'PENDING', ...range },
      }),
      this.prisma.paymentTransaction.count({
        where: { status: 'FAILED', ...range },
      }),
      this.prisma.$queryRawUnsafe(
        `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))::float AS avg_seconds
         FROM payment_transactions
         WHERE status = 'SUCCESSFUL'
           AND created_at >= $1 AND created_at <= $2`,
        startDate,
        endDate,
      ),
      this.prisma.paymentTransaction.groupBy({
        by: ['gateway'],
        where: { status: 'FAILED', ...range },
        _count: { id: true },
      }),
    ]);

    const successRate =
      totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    return {
      total_payments: totalPayments,
      successful_payments: successfulPayments,
      pending_payments: pendingPayments,
      failed_payments: failedPayments,
      payment_success_rate: Number(successRate.toFixed(2)),
      average_payment_time_seconds: Number(
        (avgPaymentTime as any[])[0]?.avg_seconds || 0,
      ),
      failed_payments_by_gateway: failedPaymentsByGateway,
    };
  }

  async getRevenueForecast(days = 30) {
    const historyDays = 30;
    const startDate = new Date(
      Date.now() - historyDays * 24 * 60 * 60 * 1000,
    );
    const endDate = new Date();

    const dailyRevenue: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT DATE(created_at) AS day,
              COALESCE(SUM(amount), 0)::float AS revenue
       FROM transactions
       WHERE type = 'BID_FEE'
         AND created_at >= $1
         AND created_at <= $2
       GROUP BY DATE(created_at)
       ORDER BY day`,
      startDate,
      endDate,
    );

    const revenueValues = dailyRevenue.map((r) => Number(r.revenue || 0));
    const n = revenueValues.length;

    let projectedDailyRevenue = 0;
    let trendSlope = 0;
    let totalHistoricalRevenue = 0;
    let avgDailyRevenue = 0;

    if (n > 0) {
      totalHistoricalRevenue = revenueValues.reduce((sum, v) => sum + v, 0);
      avgDailyRevenue = totalHistoricalRevenue / n;

      if (n >= 2) {
        const xs = Array.from({ length: n }, (_, i) => i);
        const xMean = xs.reduce((a, b) => a + b, 0) / n;
        const yMean = avgDailyRevenue;
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
          numerator += (xs[i] - xMean) * (revenueValues[i] - yMean);
          denominator += (xs[i] - xMean) ** 2;
        }
        trendSlope = denominator !== 0 ? numerator / denominator : 0;
        projectedDailyRevenue = Math.max(
          0,
          revenueValues[n - 1] + trendSlope,
        );
      } else {
        projectedDailyRevenue = avgDailyRevenue;
      }
    }

    const projectedTotal = projectedDailyRevenue * days;

    return {
      history_days: historyDays,
      forecast_days: days,
      total_historical_revenue: Number(totalHistoricalRevenue.toFixed(2)),
      average_daily_revenue: Number(avgDailyRevenue.toFixed(2)),
      trend_slope: Number(trendSlope.toFixed(2)),
      projected_daily_revenue: Number(projectedDailyRevenue.toFixed(2)),
      projected_total_revenue: Number(projectedTotal.toFixed(2)),
      daily_history: dailyRevenue,
    };
  }
}
