import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuctionStatus } from "@prisma/client";
import { CreateAuctionDto, UpdateAuctionDto } from "./dto/admin.dto";
import { AuctionClosureService } from "../winner/auction-closure.service";
import { normalizeProductCategory } from "./product-categories";

@Injectable()
export class AuctionAdminService {
  constructor(
    private prisma: PrismaService,
    private closureService: AuctionClosureService,
  ) {}

  private isMissingColumnError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("public_code") || message.includes("specs");
  }

  private async listAuctionsFallback(
    page = 1,
    limit = 20,
    status?: AuctionStatus,
  ) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let where = "";
    if (status) {
      params.push(status);
      where = `WHERE a.status = $${params.length}`;
    }
    params.push(limit, offset);
    const rows = await this.prisma.repository("auction").query(
      `WITH ranked AS (
         SELECT id, LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC)::text, 5, '0') AS public_code
         FROM auctions
       )
       SELECT a.*, ranked.public_code,
              p.id AS product_ref_id,
              p.name AS product_name,
              p.description AS product_description,
              p.image_urls AS product_image_urls,
              p.current_market_price AS product_current_market_price,
              p.category AS product_category,
              p.brand AS product_brand
       FROM auctions a
       LEFT JOIN ranked ON ranked.id = a.id
       LEFT JOIN products p ON p.id = a.product_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countRows = await this.prisma.repository("auction").query(
      `SELECT COUNT(*)::int AS total FROM auctions a ${status ? "WHERE a.status = $1" : ""}`,
      status ? [status] : [],
    );
    const total = countRows[0]?.total || 0;
    return { rows, total };
  }

  async listAuctions(page = 1, limit = 20, status?: AuctionStatus) {
    let data: any[] = [];
    let total = 0;
    try {
      const where: any = {};
      if (status) where.status = status;
      const result = await this.prisma.repository("auction").findAndCount({
        where,
        include: { product: true },
        order: { created_at: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
      data = result[0];
      total = result[1];
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const fallback = await this.listAuctionsFallback(page, limit, status);
      data = fallback.rows.map((row: any) => ({
        ...row,
        product: row.product_ref_id
          ? {
              id: row.product_ref_id,
              name: row.product_name,
              description: row.product_description,
              image_urls: row.product_image_urls,
              current_market_price: Number(
                row.product_current_market_price || 0,
              ),
              category: normalizeProductCategory(
                row.product_category,
                row.product_name,
              ),
              brand: row.product_brand,
              specs: null,
            }
          : null,
      }));
      total = fallback.total;
    }

    const auctionIds = data.map((a) => a.id);
    const bidCounts = auctionIds.length
      ? await this.prisma.repository("bid").query(
          `SELECT auction_id, COUNT(*)::int AS total_bids, COUNT(DISTINCT user_id)::int AS unique_bidders
           FROM bids WHERE auction_id = ANY($1::uuid[]) GROUP BY auction_id`,
          [auctionIds],
        )
      : [];
    const countMap = new Map(
      bidCounts.map((r: any) => [
        r.auction_id,
        {
          total_bids: parseInt(r.total_bids, 10),
          unique_bidders: parseInt(r.unique_bidders, 10),
        },
      ]),
    );
    const enriched = data.map((a) => ({
      ...a,
      stats: countMap.get(a.id) ?? { total_bids: 0, unique_bidders: 0 },
    }));
    return {
      data: enriched,
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
  }

  async createAuction(dto: CreateAuctionDto) {
    let product = null as any;
    try {
      product = await this.prisma.repository("product").findOne({
        where: { id: dto.product_id },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("product").query(
        `SELECT id, approval_status FROM products WHERE id = $1 LIMIT 1`,
        [dto.product_id],
      );
      product = rows[0] || null;
    }
    if (!product) throw new NotFoundException("Product not found");
    if (product.approval_status && product.approval_status !== "APPROVED") {
      throw new BadRequestException(
        "Product must be approved before it can be used for auction creation",
      );
    }
    const entity = this.prisma.repository("auction").create({}) as any;
    entity.product_id = dto.product_id;
    entity.start_time = new Date(dto.start_time);
    entity.end_time = new Date(dto.end_time);
    entity.status = AuctionStatus.ACTIVE;
    if (dto.min_bid != null) entity.min_bid = dto.min_bid;
    if (dto.max_bid != null) entity.max_bid = dto.max_bid;
    if (dto.bid_fee != null) entity.bid_fee = dto.bid_fee;
    try {
      return await this.prisma.repository("auction").save(entity);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("auction").query(
        `INSERT INTO auctions (product_id, start_time, end_time, status, min_bid, max_bid, bid_fee)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          entity.product_id,
          entity.start_time,
          entity.end_time,
          entity.status,
          entity.min_bid ?? null,
          entity.max_bid ?? null,
          entity.bid_fee ?? null,
        ],
      );
      return rows[0];
    }
  }

  async updateAuction(id: string, dto: UpdateAuctionDto) {
    let auction = null as any;
    try {
      auction = await this.prisma.repository("auction").findOne({ where: { id } });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("auction").query(
        `SELECT * FROM auctions WHERE id = $1 LIMIT 1`,
        [id],
      );
      auction = rows[0] || null;
    }
    if (!auction) throw new NotFoundException("Auction not found");
    if (dto.product_id != null) {
      const product = await this.prisma.repository("product").findOne({
        where: { id: dto.product_id },
      });
      if (!product) throw new NotFoundException("Product not found");
      auction.product_id = dto.product_id;
    }
    if (dto.start_time != null) auction.start_time = new Date(dto.start_time);
    if (dto.end_time != null) auction.end_time = new Date(dto.end_time);
    if (dto.status != null) auction.status = dto.status;
    if (dto.min_bid != null) auction.min_bid = dto.min_bid;
    if (dto.max_bid != null) auction.max_bid = dto.max_bid;
    if (dto.bid_fee != null) auction.bid_fee = dto.bid_fee;
    try {
      return await this.prisma.repository("auction").save(auction);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.prisma.repository("auction").query(
        `UPDATE auctions
         SET product_id = $2, start_time = $3, end_time = $4, status = $5, min_bid = $6, max_bid = $7, bid_fee = $8
         WHERE id = $1
         RETURNING *`,
        [
          id,
          auction.product_id,
          auction.start_time,
          auction.end_time,
          auction.status,
          auction.min_bid ?? null,
          auction.max_bid ?? null,
          auction.bid_fee ?? null,
        ],
      );
      return rows[0];
    }
  }

  async deleteAuction(id: string) {
    const auction = await this.prisma.repository("auction").findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    await this.prisma.repository("auction").remove(auction);
    return { deleted: true, id };
  }

  async bulkDeleteAuctions(ids: string[]) {
    const auctions = await this.prisma.repository("auction").find({
      where: { id: { in: ids } },
    });
    await this.prisma.repository("auction").remove(auctions);
    return { deleted: auctions.length };
  }

  async closeAuctionEarly(id: string, actorId?: string) {
    const auction = await this.prisma.repository("auction").findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    await this.closureService.closeSingleAuction(id, actorId || "admin");
    return this.prisma.repository("auction").findOne({
      where: { id },
      include: { product: true },
    });
  }

  async forceCloseAuction(id: string, actorId?: string) {
    const auction = await this.prisma.repository("auction").findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    return this.closureService.forceCloseSingleAuction(id, actorId || "admin");
  }

  async exportAuctionsCsv(status?: AuctionStatus) {
    const where: any = {};
    if (status) where.status = status;
    const auctions = await this.prisma.repository("auction").find({
      where,
      include: { product: true },
      order: { created_at: "DESC" },
    });
    const header =
      "id,product_name,status,start_time,end_time,winner_user_id,winning_bid_amount,created_at";
    const rows = auctions.map((a) =>
      [
        a.id,
        a.product?.name || "",
        a.status,
        a.start_time,
        a.end_time,
        a.winner_user_id || "",
        a.winning_bid_amount || "",
        a.created_at,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }
}
