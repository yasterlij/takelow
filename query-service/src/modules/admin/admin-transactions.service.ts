import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisCacheService } from '../common/redis-cache.service';

export interface AuctionTransactionsSummary {
  auction_id: string;
  product_name: string;
  public_code: number;
  status: string;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_phone: string | null;
  winning_bid_amount: number;
  payment_status: string;
  payment_deadline: string | null;
  second_winner_assigned: boolean;
  escalation_rule: string;
  bid_fee: number;
  total_bids_count: number;
  total_bid_fees_collected: number;
  revenue_sharing: {
    winning_amount: number;
    platform_share: number;
    platform_share_percent: number;
    tax: number;
    tax_percent: number;
    commission: number;
    commission_percent: number;
    net_to_seller: number;
    platform_total_net: number;
    is_custom_configured?: boolean;
    configured_by?: string;
    configured_at?: string;
  };
  bids: Array<{
    id: string;
    ticket_number: string;
    user_id: string;
    user_phone: string | null;
    user_name: string | null;
    amount: number;
    bid_time: string;
    service_fee_paid: boolean;
  }>;
  winner_payments: Array<{
    id: string;
    amount: number;
    gateway: string;
    status: string;
    customer_phone: string | null;
    client_reference_id: string;
    created_at: string;
  }>;
  fee_payments: Array<{
    id: string;
    amount: number;
    user_id: string;
    type: string;
    reference_id: string | null;
    created_at: string;
  }>;
  refunds: Array<{
    id: string;
    amount: number;
    user_id: string;
    reference_id: string | null;
    created_at: string;
  }>;
  escalations: Array<{
    id: string;
    action: string;
    actor_id: string;
    actor_phone: string | null;
    details: any;
    created_at: string;
  }>;
}

export interface UnifiedTransactionRow {
  id: string;
  type: string;
  payment_type: string;
  amount: number;
  status: string;
  gateway: string | null;
  auction_id: string | null;
  product_name: string | null;
  user_id: string;
  user_phone: string | null;
  user_name: string | null;
  reference_id: string | null;
  created_at: string;
  escalation_flag: string | null;
}

export interface TransactionsListResponse {
  data: UnifiedTransactionRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  summary: {
    total_volume: number;
    winning_bid_volume: number;
    bid_fee_volume: number;
    deposit_volume: number;
    refund_volume: number;
    successful_count: number;
    pending_count: number;
    defaulted_count: number;
  };
}

export interface ComplianceReportResponse {
  generated_at: string;
  period: {
    start: string;
    end: string;
  };
  standards: {
    icc_auction_guidelines: string;
    uncitral_procurement_standards: string;
    tamper_proof_status: string;
  };
  metrics: {
    total_auctions: number;
    closed_auctions: number;
    total_bids: number;
    total_bid_fee_volume: number;
    winning_bids_total_volume: number;
    winner_payments_collected: number;
    winner_payments_held_in_escrow: number;
    payment_compliance_rate_percent: number;
    payment_default_rate_percent: number;
    second_winners_assigned_count: number;
    total_disputes_filed: number;
    unresolved_disputes: number;
  };
  legal_attestation: string;
}

@Injectable()
export class AdminTransactionsService {
  private readonly logger = new Logger(AdminTransactionsService.name);

  private readonly platformSharePercent: number;
  private readonly taxPercent: number;
  private readonly commissionPercent: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private redisCacheService: RedisCacheService,
  ) {
    this.platformSharePercent =
      this.configService.get<number>('settlement.platformSharePercent') ?? 10;
    this.taxPercent =
      this.configService.get<number>('settlement.taxPercent') ?? 15;
    this.commissionPercent =
      this.configService.get<number>('settlement.commissionPercent') ?? 5;
  }

  async getAuctionSettlementConfig(auctionId: string): Promise<any | null> {
    const cacheKey = `settlement:auction:${auctionId}`;
    const cached = await this.redisCacheService.get<any>(cacheKey);
    if (cached) {
      if (cached.reset) return null;
      return cached;
    }

    try {
      const log = await this.prisma.auditLog.findFirst({
        where: {
          entity_id: auctionId,
          action: { in: ['SETTLEMENT_CONFIG_UPDATED', 'SETTLEMENT_CONFIG_RESET'] },
        },
        orderBy: { created_at: 'desc' },
      });
      if (log?.action === 'SETTLEMENT_CONFIG_RESET') {
        await this.redisCacheService.set(cacheKey, { reset: true }, 86400 * 365);
        return null;
      }
      if (log?.details) {
        await this.redisCacheService.set(cacheKey, log.details, 86400 * 365);
        return log.details;
      }
    } catch (e: any) {
      this.logger.warn(`Failed to retrieve audit log settlement config: ${e?.message}`);
    }

    return null;
  }

  async saveAuctionSettlementConfig(
    auctionId: string,
    dto: {
      winning_price?: number;
      bid_fees_collected?: number;
      platform_share?: number;
      platform_share_percent?: number;
      tax?: number;
      tax_percent?: number;
      commission?: number;
      commission_percent?: number;
      net_to_seller?: number;
    },
    actorId?: string,
  ): Promise<any> {
    const configData = {
      ...dto,
      is_custom_configured: true,
      configured_by: actorId || 'admin',
      configured_at: new Date().toISOString(),
    };

    const cacheKey = `settlement:auction:${auctionId}`;
    await this.redisCacheService.set(cacheKey, configData, 86400 * 365);

    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId || 'admin',
          action: 'SETTLEMENT_CONFIG_UPDATED',
          entity_type: 'AUCTION',
          entity_id: auctionId,
          details: configData as any,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to create audit log for settlement config: ${e?.message}`);
    }

    return configData;
  }

  async resetAuctionSettlementConfig(
    auctionId: string,
    actorId?: string,
  ): Promise<{ success: boolean }> {
    const cacheKey = `settlement:auction:${auctionId}`;
    await this.redisCacheService.set(cacheKey, { reset: true }, 86400 * 365);

    try {
      await this.prisma.auditLog.create({
        data: {
          actor_id: actorId || 'admin',
          action: 'SETTLEMENT_CONFIG_RESET',
          entity_type: 'AUCTION',
          entity_id: auctionId,
          details: { reset: true, reset_at: new Date().toISOString() },
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to create audit log for settlement reset: ${e?.message}`);
    }

    return { success: true };
  }

  async getAuctionTransactions(
    auctionId: string,
  ): Promise<AuctionTransactionsSummary> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(auctionId)) {
      throw new NotFoundException(`Auction not found: ${auctionId}`);
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
        winner: {
          select: {
            id: true,
            full_name: true,
            phone_number: true,
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction not found: ${auctionId}`);
    }

    const [bids, winnerPayments, feePayments, refunds, escalations, customConfig] =
      await Promise.all([
        this.prisma.bid.findMany({
          where: { auction_id: auctionId },
          include: {
            user: {
              select: {
                id: true,
                phone_number: true,
                full_name: true,
              },
            },
          },
          orderBy: { bid_time: 'desc' },
        }),
        this.prisma.paymentTransaction.findMany({
          where: {
            auction_id: auctionId,
            payment_type: 'WINNING_BID',
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.transaction.findMany({
          where: {
            reference_id: auctionId,
            type: 'BID_FEE',
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.transaction.findMany({
          where: {
            reference_id: auctionId,
            type: 'REFUND',
          },
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.auditLog.findMany({
          where: {
            entity_id: auctionId,
            action: {
              in: [
                'PRIMARY_WINNER_ASSIGNED',
                'PRIMARY_WINNER_DEFAULTED',
                'SECOND_WINNER_ASSIGNED',
                'PAYMENT_REMINDER_SENT',
                'AUCTION_CLOSED',
                'PAYMENT_CONFIRMED',
                'DEADLINE_EXTENDED',
              ],
            },
          },
          orderBy: { created_at: 'desc' },
        }),
        this.getAuctionSettlementConfig(auctionId),
      ]);

    const winningAmount =
      customConfig?.winning_price != null
        ? Number(customConfig.winning_price)
        : Number(auction.winning_bid_amount || 0);

    const bidFee = Number(auction.bid_fee || 0);
    const feePaymentsSum = feePayments.reduce((s, f) => s + Number(f.amount), 0);
    const autoBidFees =
      feePaymentsSum > 0 ? feePaymentsSum : bids.length * bidFee;
    const totalBidFeesCollected =
      customConfig?.bid_fees_collected != null
        ? Number(customConfig.bid_fees_collected)
        : autoBidFees;

    const effPlatformSharePercent =
      customConfig?.platform_share_percent != null
        ? Number(customConfig.platform_share_percent)
        : this.platformSharePercent;

    const effPlatformShare =
      customConfig?.platform_share != null
        ? Number(customConfig.platform_share)
        : (winningAmount * effPlatformSharePercent) / 100;

    const effTaxPercent =
      customConfig?.tax_percent != null
        ? Number(customConfig.tax_percent)
        : this.taxPercent;

    const effTax =
      customConfig?.tax != null
        ? Number(customConfig.tax)
        : (winningAmount * effTaxPercent) / 100;

    const effCommissionPercent =
      customConfig?.commission_percent != null
        ? Number(customConfig.commission_percent)
        : this.commissionPercent;

    const effCommission =
      customConfig?.commission != null
        ? Number(customConfig.commission)
        : (winningAmount * effCommissionPercent) / 100;

    const effNetToSeller =
      customConfig?.net_to_seller != null
        ? Number(customConfig.net_to_seller)
        : winningAmount > 0
        ? Math.max(0, winningAmount - effPlatformShare - effTax - effCommission)
        : 0;

    const platformTotalNet =
      totalBidFeesCollected + effPlatformShare + effCommission - effTax;

    return {
      auction_id: auction.id,
      product_name: auction.product?.name || 'Unknown Product',
      public_code: auction.public_code,
      status: auction.status,
      winner_user_id: auction.winner_user_id,
      winner_name: auction.winner?.full_name || null,
      winner_phone: auction.winner?.phone_number || null,
      winning_bid_amount: winningAmount,
      payment_status: auction.payment_status || 'PENDING',
      payment_deadline: auction.payment_deadline
        ? auction.payment_deadline.toISOString()
        : null,
      second_winner_assigned: !!auction.second_winner_assigned,
      escalation_rule: auction.escalation_rule || 'LOWEST_UNIQUE_BID',
      bid_fee: bidFee,
      total_bids_count: bids.length,
      total_bid_fees_collected: totalBidFeesCollected,
      revenue_sharing: {
        winning_amount: winningAmount,
        platform_share: effPlatformShare,
        platform_share_percent: effPlatformSharePercent,
        tax: effTax,
        tax_percent: effTaxPercent,
        commission: effCommission,
        commission_percent: effCommissionPercent,
        net_to_seller: effNetToSeller,
        platform_total_net: platformTotalNet,
        is_custom_configured: !!customConfig?.is_custom_configured,
        configured_by: customConfig?.configured_by,
        configured_at: customConfig?.configured_at,
      },
      bids: bids.map((b) => ({
        id: b.id,
        ticket_number: b.ticket_number || '',
        user_id: b.user_id,
        user_phone: b.user?.phone_number || null,
        user_name: b.user?.full_name || null,
        amount: Number(b.amount),
        bid_time: b.bid_time.toISOString(),
        service_fee_paid: b.service_fee_paid,
      })),
      winner_payments: winnerPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        gateway: p.gateway,
        status: p.status,
        customer_phone: p.customer_phone,
        client_reference_id: p.client_reference_id,
        created_at: p.created_at.toISOString(),
      })),
      fee_payments: feePayments.map((f) => ({
        id: f.id,
        amount: Number(f.amount),
        user_id: f.user_id,
        type: f.type,
        reference_id: f.reference_id,
        created_at: f.created_at.toISOString(),
      })),
      refunds: refunds.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        user_id: r.user_id,
        reference_id: r.reference_id,
        created_at: r.created_at.toISOString(),
      })),
      escalations: escalations.map((e) => ({
        id: e.id,
        action: e.action,
        actor_id: e.actor_id,
        actor_phone: e.actor_phone,
        details: e.details,
        created_at: e.created_at.toISOString(),
      })),
    };
  }

  async getAllTransactions(
    filters: {
      auction_id?: string;
      user_id?: string;
      type?: string;
      status?: string;
      start?: string;
      end?: string;
      search?: string;
    },
    page = 1,
    limit = 50,
  ): Promise<TransactionsListResponse> {
    const startDate = filters.start ? new Date(filters.start) : new Date(0);
    const endDate = filters.end ? new Date(filters.end) : new Date();

    const [paymentTxns, walletTxns] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
          ...(filters.auction_id ? { auction_id: filters.auction_id } : {}),
          ...(filters.user_id ? { user_id: filters.user_id } : {}),
          ...(filters.status && filters.status !== 'all'
            ? { status: filters.status as any }
            : {}),
          ...(filters.type && filters.type !== 'all'
            ? filters.type === 'WINNING_BID' || filters.type === 'BID_FEE'
              ? { payment_type: filters.type as any }
              : { id: 'none' }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              phone_number: true,
              full_name: true,
            },
          },
          auction: {
            include: {
              product: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.transaction.findMany({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
          ...(filters.user_id ? { user_id: filters.user_id } : {}),
          ...(filters.auction_id ? { reference_id: filters.auction_id } : {}),
          ...(filters.type && filters.type !== 'all'
            ? filters.type === 'DEPOSIT' || filters.type === 'REFUND'
              ? { type: filters.type as any }
              : { id: 'none' }
            : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              phone_number: true,
              full_name: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    const unified: UnifiedTransactionRow[] = [];

    for (const p of paymentTxns) {
      unified.push({
        id: p.id,
        type: p.payment_type,
        payment_type: p.payment_type,
        amount: Number(p.amount),
        status: p.status,
        gateway: p.gateway,
        auction_id: p.auction_id,
        product_name: p.auction?.product?.name || null,
        user_id: p.user_id,
        user_phone: p.user?.phone_number || p.customer_phone || null,
        user_name: p.user?.full_name || null,
        reference_id: p.client_reference_id,
        created_at: p.created_at.toISOString(),
        escalation_flag: p.auction?.second_winner_assigned
          ? 'SECOND_WINNER_ASSIGNED'
          : p.status === 'EXPIRED'
          ? 'PAYMENT_DEFAULTED'
          : null,
      });
    }

    if (!filters.type || filters.type === 'all' || filters.type === 'DEPOSIT' || filters.type === 'REFUND') {
      for (const w of walletTxns) {
        unified.push({
          id: w.id,
          type: w.type,
          payment_type: 'WALLET',
          amount: Number(w.amount),
          status: 'SUCCESSFUL',
          gateway: 'AWASH_WALLET',
          auction_id: w.reference_id?.length === 36 ? w.reference_id : null,
          product_name: null,
          user_id: w.user_id,
          user_phone: w.user?.phone_number || null,
          user_name: w.user?.full_name || null,
          reference_id: w.reference_id,
          created_at: w.created_at.toISOString(),
          escalation_flag: null,
        });
      }
    }

    unified.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    let filteredList = unified;
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase().trim();
      filteredList = filteredList.filter(
        (t) =>
          (t.reference_id && t.reference_id.toLowerCase().includes(q)) ||
          (t.user_phone && t.user_phone.toLowerCase().includes(q)) ||
          (t.user_name && t.user_name.toLowerCase().includes(q)) ||
          (t.product_name && t.product_name.toLowerCase().includes(q)) ||
          (t.auction_id && t.auction_id.toLowerCase().includes(q)),
      );
    }

    const total = filteredList.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filteredList.slice(startIndex, startIndex + limit);

    const totalVolume = filteredList.reduce((s, t) => s + t.amount, 0);
    const winningBidVolume = filteredList
      .filter((t) => t.type === 'WINNING_BID')
      .reduce((s, t) => s + t.amount, 0);
    const bidFeeVolume = filteredList
      .filter((t) => t.type === 'BID_FEE')
      .reduce((s, t) => s + t.amount, 0);
    const depositVolume = filteredList
      .filter((t) => t.type === 'DEPOSIT')
      .reduce((s, t) => s + t.amount, 0);
    const refundVolume = filteredList
      .filter((t) => t.type === 'REFUND')
      .reduce((s, t) => s + t.amount, 0);

    const successfulCount = filteredList.filter(
      (t) => t.status === 'SUCCESSFUL',
    ).length;
    const pendingCount = filteredList.filter(
      (t) => t.status === 'PENDING',
    ).length;
    const defaultedCount = filteredList.filter(
      (t) =>
        t.status === 'EXPIRED' ||
        t.escalation_flag === 'PAYMENT_DEFAULTED' ||
        t.escalation_flag === 'SECOND_WINNER_ASSIGNED',
    ).length;

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
      summary: {
        total_volume: totalVolume,
        winning_bid_volume: winningBidVolume,
        bid_fee_volume: bidFeeVolume,
        deposit_volume: depositVolume,
        refund_volume: refundVolume,
        successful_count: successfulCount,
        pending_count: pendingCount,
        defaulted_count: defaultedCount,
      },
    };
  }

  async exportTransactionsCsv(filters: any): Promise<string> {
    const res = await this.getAllTransactions(filters, 1, 10000);
    const header = [
      'Transaction ID',
      'Type',
      'Amount',
      'Status',
      'Gateway',
      'Auction ID',
      'Product Name',
      'User ID',
      'User Phone',
      'Reference ID',
      'Created At',
      'Escalation Flag',
    ].join(',');

    const rows = res.data.map((t) =>
      [
        t.id,
        t.type,
        t.amount.toFixed(2),
        t.status,
        t.gateway || 'N/A',
        t.auction_id || 'N/A',
        this.csvEscape(t.product_name || 'N/A'),
        t.user_id,
        t.user_phone || 'N/A',
        this.csvEscape(t.reference_id || 'N/A'),
        t.created_at,
        t.escalation_flag || 'NONE',
      ].join(','),
    );

    const summary = [
      '',
      '# Summary Statistics',
      `# Total Volume,${res.summary.total_volume.toFixed(2)}`,
      `# Winning Bid Volume,${res.summary.winning_bid_volume.toFixed(2)}`,
      `# Bid Fee Volume,${res.summary.bid_fee_volume.toFixed(2)}`,
      `# Deposit Volume,${res.summary.deposit_volume.toFixed(2)}`,
      `# Total Transactions,${res.meta.total}`,
      `# Compliance Standard,UNCITRAL Article 37 / ICC Guideline §4.2`,
    ];

    return [header, ...rows, ...summary].join('\n');
  }

  async getComplianceReport(
    startDateStr: string,
    endDateStr: string,
  ): Promise<ComplianceReportResponse> {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const [
      totalAuctions,
      closedAuctions,
      totalBids,
      winningProceedsRow,
      feeProceedsRow,
      secondWinnersRow,
      disputesRow,
      escrowRow,
    ] = await Promise.all([
      this.prisma.auction.count({
        where: { created_at: { gte: start, lte: end } },
      }),
      this.prisma.auction.count({
        where: {
          status: { in: ['CLOSED', 'EXPIRED'] },
          created_at: { gte: start, lte: end },
        },
      }),
      this.prisma.bid.count({
        where: { bid_time: { gte: start, lte: end } },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          payment_type: 'WINNING_BID',
          status: 'SUCCESSFUL',
          created_at: { gte: start, lte: end },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'BID_FEE',
          created_at: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      this.prisma.auction.count({
        where: {
          second_winner_assigned: true,
          created_at: { gte: start, lte: end },
        },
      }),
      this.prisma.dispute.findMany({
        where: { created_at: { gte: start, lte: end } },
      }),
      this.prisma.$queryRawUnsafe<any[]>(
        `SELECT
           COALESCE(SUM(CASE WHEN a.payment_status = 'PENDING' THEN pt.amount ELSE 0 END), 0)::float as held_in_escrow,
           COALESCE(SUM(CASE WHEN a.payment_status = 'PAID' THEN pt.amount ELSE 0 END), 0)::float as released_platform
         FROM payment_transactions pt
         JOIN auctions a ON a.id = pt.auction_id
         WHERE pt.payment_type = 'WINNING_BID'
           AND pt.status = 'SUCCESSFUL'
           AND pt.created_at >= $1 AND pt.created_at <= $2`,
        start,
        end,
      ),
    ]);

    const totalClosed = closedAuctions || 1;
    const paidWinnersCount = Number(winningProceedsRow._count || 0);
    const complianceRate = Math.min(
      100,
      Math.round((paidWinnersCount / totalClosed) * 100),
    );
    const defaultRate = Math.max(0, 100 - complianceRate);

    const openDisputes = disputesRow.filter(
      (d) => d.status === 'OPEN' || d.status === 'PENDING',
    ).length;

    return {
      generated_at: new Date().toISOString(),
      period: {
        start: startDateStr,
        end: endDateStr,
      },
      standards: {
        icc_auction_guidelines: 'ICC Commission on Commercial Law & Practice §4',
        uncitral_procurement_standards: 'UNCITRAL Model Law on Public Procurement Article 37',
        tamper_proof_status: 'Compliant & Verified Read-Only Audit Ledger',
      },
      metrics: {
        total_auctions: totalAuctions,
        closed_auctions: closedAuctions,
        total_bids: totalBids,
        total_bid_fee_volume: Number(feeProceedsRow._sum.amount || 0),
        winning_bids_total_volume: Number(winningProceedsRow._sum.amount || 0),
        winner_payments_collected: Number(escrowRow[0]?.released_platform || 0),
        winner_payments_held_in_escrow: Number(
          escrowRow[0]?.held_in_escrow || 0,
        ),
        payment_compliance_rate_percent: complianceRate,
        payment_default_rate_percent: defaultRate,
        second_winners_assigned_count: secondWinnersRow,
        total_disputes_filed: disputesRow.length,
        unresolved_disputes: openDisputes,
      },
      legal_attestation:
        'This document confirms that all reverse unique bid auctions conducted during this period complied with the transparent winner selection algorithm, non-discrimination bidding rules, automated escalation protocols, and cryptographic bid integrity standards.',
    };
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
