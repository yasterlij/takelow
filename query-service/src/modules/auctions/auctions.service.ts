import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan, In } from "typeorm";
import { Auction, AuctionStatus } from "./entities/auction.entity";
import { Bid } from "./entities/bid.entity";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { normalizeProductCategory } from "./product-categories";

interface WinnerRow {
  user_id: string;
  amount: number;
  rank: number;
  payment_status: string;
  payment_deadline: Date;
  user_name: string | null;
  phone: string | null;
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

  private isRecoverableSchemaError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes("does not exist") ||
      message.includes("public_code") ||
      message.includes("category") ||
      message.includes("specs") ||
      message.includes("bid_fee") ||
      message.includes("current_market_price") ||
      message.includes("created_at")
    );
  }

  private async getExistingColumns(table: string): Promise<Set<string>> {
    const rows: any[] = await this.auctionRepository.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
      [table],
    );
    return new Set(rows.map((r) => r.column_name));
  }

  private async loadAuctionRows(
    statuses: AuctionStatus[],
    activeOnly = false,
  ): Promise<any[]> {
    const statusPlaceholders = statuses
      .map((_, index) => `$${index + 1}`)
      .join(", ");
    const params: any[] = [...statuses];
    let where = `a.status IN (${statusPlaceholders})`;
    if (activeOnly) {
      params.push(new Date());
      where += ` AND a.end_time > $${params.length}`;
    }

    const auctionCols = await this.getExistingColumns("auctions");
    const productCols = await this.getExistingColumns("products");

    if (auctionCols.size === 0) {
      return [];
    }

    const hasProductsTable = productCols.size > 0;
    const rankedOrder = auctionCols.has("created_at")
      ? "created_at ASC"
      : "start_time ASC, id ASC";
    const finalOrder = auctionCols.has("created_at")
      ? "a.created_at DESC"
      : "a.start_time DESC";

    const auctionSelect = [
      "a.id",
      "ranked.public_code",
      "a.product_id",
      "a.start_time",
      "a.end_time",
      "a.status",
      ...(auctionCols.has("bid_fee") ? ["a.bid_fee"] : []),
      ...(auctionCols.has("winner_user_id") ? ["a.winner_user_id"] : []),
      ...(auctionCols.has("winning_bid_amount")
        ? ["a.winning_bid_amount"]
        : []),
      ...(auctionCols.has("payment_status") ? ["a.payment_status"] : []),
      ...(auctionCols.has("payment_deadline") ? ["a.payment_deadline"] : []),
      ...(auctionCols.has("created_at") ? ["a.created_at"] : []),
    ].join(",\n        ");

    const productSelect = hasProductsTable
      ? [
          "p.id AS product_ref_id",
          "p.name AS product_name",
          "p.description AS product_description",
          "p.image_urls AS product_image_urls",
          ...(productCols.has("current_market_price")
            ? ["p.current_market_price AS product_current_market_price"]
            : ["NULL::numeric AS product_current_market_price"]),
          ...(productCols.has("category")
            ? ["p.category AS product_category"]
            : ["NULL::text AS product_category"]),
          ...(productCols.has("brand")
            ? ["p.brand AS product_brand"]
            : ["NULL::text AS product_brand"]),
        ].join(",\n        ")
      : [
          "NULL::uuid AS product_ref_id",
          "NULL::text AS product_name",
          "NULL::text AS product_description",
          "NULL::text[] AS product_image_urls",
          "NULL::numeric AS product_current_market_price",
          "NULL::text AS product_category",
          "NULL::text AS product_brand",
        ].join(",\n        ");

    return this.auctionRepository.query(
      `WITH ranked AS (
        SELECT id, LPAD(ROW_NUMBER() OVER (ORDER BY ${rankedOrder})::text, 5, '0') AS public_code
        FROM auctions
      )
      SELECT
        ${auctionSelect},
        ${productSelect}
      FROM auctions a
      LEFT JOIN ranked ON ranked.id = a.id
      ${hasProductsTable ? "LEFT JOIN products p ON p.id = a.product_id" : ""}
      WHERE ${where}
      ORDER BY ${finalOrder}
      LIMIT 50`,
      params,
    );
  }

  private toAuctionRecord(row: any) {
    return {
      id: row.id,
      public_code: row.public_code,
      product_id: row.product_id,
      product: row.product_ref_id
        ? {
            id: row.product_ref_id,
            name: row.product_name,
            description: row.product_description,
            image_urls: row.product_image_urls,
            current_market_price: Number(row.product_current_market_price || 0),
            category: normalizeProductCategory(
              row.product_category,
              row.product_name,
              row.product_brand,
            ),
            brand: row.product_brand,
            specs: null,
          }
        : null,
      start_time: row.start_time,
      end_time: row.end_time,
      status: row.status,
      bid_fee: row.bid_fee != null ? Number(row.bid_fee) : null,
      winner_user_id: row.winner_user_id,
      winning_bid_amount: row.winning_bid_amount,
      payment_status: row.payment_status,
      payment_deadline: row.payment_deadline,
      created_at: row.created_at,
    };
  }

  async getActiveAuctions(): Promise<any[]> {
    let auctions: any[] = [];
    try {
      auctions = await this.auctionRepository.find({
        where: { status: AuctionStatus.ACTIVE, end_time: MoreThan(new Date()) },
        relations: ["product"],
        order: { created_at: "DESC" },
        take: 50,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const rows = await this.loadAuctionRows([AuctionStatus.ACTIVE], true);
      auctions = rows.map((row) => this.toAuctionRecord(row));
    }

    if (auctions.length === 0) return [];

    const auctionIds = auctions.map((a) => a.id);

    let bidCountMap = new Map<string, number>();
    let uniqueBidderMap = new Map<string, number>();
    try {
      const [bidCounts, uniqueBidderRows] = await Promise.all([
        this.bidRepository
          .createQueryBuilder("bid")
          .select("bid.auction_id", "auction_id")
          .addSelect("COUNT(*)", "count")
          .where("bid.auction_id IN (:...ids)", { ids: auctionIds })
          .groupBy("bid.auction_id")
          .getRawMany(),
        this.bidRepository
          .createQueryBuilder("bid")
          .select("bid.auction_id", "auction_id")
          .addSelect("COUNT(DISTINCT bid.user_id)", "count")
          .where("bid.auction_id IN (:...ids)", { ids: auctionIds })
          .groupBy("bid.auction_id")
          .getRawMany(),
      ]);

      bidCountMap = new Map(
        bidCounts.map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
      );
      uniqueBidderMap = new Map(
        uniqueBidderRows.map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
      );
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
    }

    return auctions.map((auction) => ({
      id: auction.id,
      public_code: auction.public_code,
      product_id: auction.product_id,
      product: auction.product || null,
      start_time: auction.start_time,
      end_time: auction.end_time,
      bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
      time_remaining: this.computeTimeRemaining(auction.end_time),
      stats: {
        total_bids: bidCountMap.get(auction.id) || 0,
        unique_bidders: uniqueBidderMap.get(auction.id) || 0,
      },
      status: auction.status,
    }));
  }

  async getActiveAuction(auctionId: string): Promise<any> {
    let auction: any = null;
    try {
      auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ["product"],
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const auctionCols = await this.getExistingColumns("auctions");
      const productCols = await this.getExistingColumns("products");
      const auctionSelect = [
        "a.id",
        "ranked.public_code",
        "a.product_id",
        "a.start_time",
        "a.end_time",
        "a.status",
        ...(auctionCols.has("bid_fee") ? ["a.bid_fee"] : []),
        ...(auctionCols.has("winner_user_id") ? ["a.winner_user_id"] : []),
        ...(auctionCols.has("winning_bid_amount")
          ? ["a.winning_bid_amount"]
          : []),
        ...(auctionCols.has("payment_status") ? ["a.payment_status"] : []),
        ...(auctionCols.has("payment_deadline") ? ["a.payment_deadline"] : []),
        ...(auctionCols.has("created_at") ? ["a.created_at"] : []),
      ].join(",\n          ");
      const productSelect = [
        "p.id AS product_ref_id",
        "p.name AS product_name",
        "p.description AS product_description",
        "p.image_urls AS product_image_urls",
        "p.current_market_price AS product_current_market_price",
        ...(productCols.has("category") ? ["p.category AS product_category"] : ["NULL::text AS product_category"]),
        ...(productCols.has("brand") ? ["p.brand AS product_brand"] : []),
      ].join(",\n          ");
      const rows = await this.auctionRepository.query(
        `WITH ranked AS (
          SELECT id, LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::text, 5, '0') AS public_code
          FROM auctions
        )
        SELECT
          ${auctionSelect},
          ${productSelect}
        FROM auctions a
        LEFT JOIN ranked ON ranked.id = a.id
        LEFT JOIN products p ON p.id = a.product_id
        WHERE a.id = $1
        LIMIT 1`,
        [auctionId],
      );
      auction = rows[0] ? this.toAuctionRecord(rows[0]) : null;
    }

    if (
      !auction ||
      auction.status !== AuctionStatus.ACTIVE ||
      auction.end_time.getTime() <= Date.now()
    ) {
      throw new NotFoundException("Auction not found or has ended");
    }

    const now = Date.now();
    const timeRemaining = Math.max(0, auction.end_time.getTime() - now);

    const totalBids = await this.bidRepository.count({
      where: { auction_id: auctionId },
    });

    const uniqueBidders = await this.bidRepository
      .createQueryBuilder("bid")
      .where("bid.auction_id = :auctionId", { auctionId })
      .select("COUNT(DISTINCT bid.user_id)", "count")
      .getRawOne();

    return {
      id: auction.id,
      public_code: auction.public_code,
      product: (auction as any).product || null,
      bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
      time_remaining: {
        days: Math.floor(timeRemaining / 86400000),
        hours: Math.floor((timeRemaining % 86400000) / 3600000),
        minutes: Math.floor((timeRemaining % 3600000) / 60000),
        seconds: Math.floor((timeRemaining % 60000) / 1000),
      },
      stats: {
        total_bids: totalBids,
        unique_bidders: parseInt(uniqueBidders?.count || "0", 10),
      },
      status: auction.status,
    };
  }

  async getClosedAuctions(): Promise<any[]> {
    let auctions: any[] = [];
    try {
      auctions = await this.auctionRepository.find({
        where: [
          { status: AuctionStatus.CLOSED },
          { status: AuctionStatus.EXPIRED },
        ],
        relations: ["product"],
        order: { created_at: "DESC" },
        take: 50,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      const rows = await this.loadAuctionRows([
        AuctionStatus.CLOSED,
        AuctionStatus.EXPIRED,
      ]);
      auctions = rows.map((row) => this.toAuctionRecord(row));
    }

    const auctionIds = auctions.map((a) => a.id);

    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    if (auctionIds.length > 0) {
      try {
        const winnerRows: any[] = await this.auctionRepository.query(
          `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name, u.phone_number AS phone
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
            phone: row.phone || null,
          });
        }
      } catch {
        // winners table may not exist in query service's read replica; ignore
      }
    }

    if (auctions.length === 0) return [];

    const bidCountRows = await this.bidRepository
      .createQueryBuilder("bid")
      .select("bid.auction_id", "auction_id")
      .addSelect("COUNT(*)", "count")
      .where("bid.auction_id IN (:...ids)", { ids: auctionIds })
      .groupBy("bid.auction_id")
      .getRawMany();
    const bidCountMap = new Map(
      bidCountRows.map((r: any) => [r.auction_id, parseInt(r.count, 10)]),
    );

    return auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id) || [];
      return {
        id: auction.id,
        public_code: auction.public_code,
        product_id: auction.product_id,
        product: auction.product || null,
        start_time: auction.start_time,
        end_time: auction.end_time,
        bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
        status: auction.status,
        winner_user_id: auction.winner_user_id,
        winning_bid_amount: auction.winning_bid_amount,
        winners: auctionWinners.map((w) => ({
          user_id: w.user_id,
          user_name: w.user_name,
          phone: w.phone,
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
      select: ["id", "status"],
    });
    const isActive = auction?.status === AuctionStatus.ACTIVE;
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "DESC" },
      take: 200,
    });
    return Promise.all(
      bids.map(async (b) => {
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
      }),
    );
  }

  async getUserBidHistory(userId: string): Promise<any[]> {
    const bids = await this.bidRepository.find({
      where: { user_id: userId },
      order: { bid_time: "DESC" },
      take: 100,
    });

    if (bids.length === 0) return [];

    const auctionIds = [...new Set(bids.map((b) => b.auction_id))];
    const auctions = await this.auctionRepository.find({
      where: { id: In(auctionIds) },
      select: ["id", "status"],
    });
    const auctionStatusMap = new Map(auctions.map((a) => [a.id, a.status]));

    return Promise.all(
      bids.map(async (b) => {
        const isActive =
          auctionStatusMap.get(b.auction_id) === AuctionStatus.ACTIVE;
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
      }),
    );
  }

  async getUserWonAuctions(userId: string): Promise<any[]> {
    let auctions: any[];
    try {
      auctions = await this.auctionRepository.find({
        where: {
          winner_user_id: userId,
          status: AuctionStatus.CLOSED,
        },
        relations: ["product"],
        order: { created_at: "DESC" },
        take: 50,
      });
    } catch (error) {
      if (!this.isRecoverableSchemaError(error)) throw error;
      auctions = (await this.loadAuctionRows([AuctionStatus.CLOSED])).filter(
        (a) => a.winner_user_id === userId,
      );
    }

    const auctionIds = auctions.map((a) => a.id);
    let winnersByAuction: Map<string, WinnerRow[]> = new Map();
    if (auctionIds.length > 0) {
      try {
        const winnerRows: any[] = await this.auctionRepository.query(
          `SELECT w.auction_id, w.user_id, w.amount, w.rank, w.payment_status, w.payment_deadline, u.full_name AS user_name, u.phone_number AS phone
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
            phone: row.phone || null,
          });
        }
      } catch {
        /* ignore */
      }
    }

    return auctions.map((auction) => {
      const auctionWinners = winnersByAuction.get(auction.id) || [];
      return {
        id: auction.id,
        product: auction.product,
        start_time: auction.start_time,
        end_time: auction.end_time,
        bid_fee: auction.bid_fee != null ? Number(auction.bid_fee) : null,
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
