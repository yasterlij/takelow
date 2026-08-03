import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, In } from "typeorm";
import { Auction, AuctionStatus } from "../winner/entities/auction.entity";
import { Winner, WinnerPaymentStatus } from "../winner/entities/winner.entity";
import { Product } from "./entities/product.entity";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateAuctionDto,
  UpdateAuctionDto,
} from "./dto/admin.dto";
import { AuctionClosureService } from "../winner/auction-closure.service";
import { WinnerService } from "../winner/winner.service";
import { Bid } from "../bidding/entities/bid.entity";
import { ImageService } from "./image.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { normalizeProductCategory } from "./product-categories";

@Injectable()
export class AuctionManageService {
  private readonly logger = new Logger(AuctionManageService.name);
  private readonly specKeys = [
    "storage",
    "ram",
    "edition",
    "battery",
    "camera",
    "osVersion",
    "display",
    "chipset",
  ] as const;

  private isMissingColumnError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("public_code") || message.includes("specs");
  }

  private async listProductsFallback(page = 1, limit = 20, search?: string) {
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let where = "";
    if (search) {
      params.push(`%${search}%`);
      where = `WHERE name ILIKE $${params.length}`;
    }
    params.push(limit, offset);
    const rows = await this.productRepository.query(
      `SELECT id, name, description, image_urls, current_market_price, category, brand, created_at
       FROM products
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    const countRows = await this.productRepository.query(
      `SELECT COUNT(*)::int AS total FROM products ${where}`,
      search ? [`%${search}%`] : [],
    );
    const total = countRows[0]?.total || 0;
    return {
      data: rows.map((row: any) => ({
        ...row,
        category: normalizeProductCategory(row.category, row.name),
        specs: null,
      })),
      meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
    };
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
    const rows = await this.auctionRepository.query(
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
    const countRows = await this.auctionRepository.query(
      `SELECT COUNT(*)::int AS total FROM auctions a ${status ? "WHERE a.status = $1" : ""}`,
      status ? [status] : [],
    );
    const total = countRows[0]?.total || 0;
    return { rows, total };
  }

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
    private closureService: AuctionClosureService,
    private winnerService: WinnerService,
    private imageService: ImageService,
    private bidEncryptionService: BidEncryptionService,
  ) {}

  async listProducts(page = 1, limit = 20, search?: string) {
    try {
      const where: any = {};
      if (search) where.name = Like(`%${search}%`);
      const [data, total] = await this.productRepository.findAndCount({
        where,
        order: { created_at: "DESC" },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data,
        meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
      };
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      return this.listProductsFallback(page, limit, search);
    }
  }

  async createProduct(dto: CreateProductDto) {
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    data.category = normalizeProductCategory(data.category, data.name);
    data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    try {
      return await this.productRepository.save(
        this.productRepository.create(data),
      );
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `INSERT INTO products (name, description, image_urls, current_market_price, category)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          data.name,
          data.description || null,
          data.image_urls || null,
          data.current_market_price,
          data.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(rows[0]?.category, data.name),
        specs: null,
      };
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    let product = null as any;
    try {
      product = await this.productRepository.findOne({ where: { id } });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `SELECT id, name, description, image_urls, current_market_price, brand, created_at FROM products WHERE id = $1 LIMIT 1`,
        [id],
      );
      product = rows[0] || null;
    }
    if (!product) throw new NotFoundException("Product not found");
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(
        data.image_urls,
      );
    }
    if (data.category !== undefined) {
      data.category = normalizeProductCategory(
        data.category,
        data.name ?? product.name,
      );
    }
    if (data.specs !== undefined) {
      data.specs = this.normalizeSpecs(data.specs) ?? undefined;
    }
    Object.assign(product, data);
    try {
      return await this.productRepository.save(product);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `UPDATE products
         SET name = $2, description = $3, image_urls = $4, current_market_price = $5, category = $6
         WHERE id = $1
         RETURNING id, name, description, image_urls, current_market_price, category, brand, created_at`,
        [
          id,
          product.name,
          product.description || null,
          product.image_urls || null,
          product.current_market_price,
          product.category,
        ],
      );
      return {
        ...rows[0],
        category: normalizeProductCategory(product.category, product.name),
        specs: null,
      };
    }
  }

  async deleteProduct(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    await this.productRepository.remove(product);
    return { deleted: true, id };
  }

  async downloadProductImages(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    if (!product.image_urls?.length) {
      return { downloaded: 0, message: "No images to download" };
    }
    const localUrls = await this.imageService.processImageUrls(
      product.image_urls,
    );
    product.image_urls = localUrls;
    await this.productRepository.save(product);
    const downloaded = localUrls.filter((u) =>
      u.startsWith("/uploads/"),
    ).length;
    return { downloaded, total: product.image_urls.length };
  }

  async downloadAllProductImages() {
    const products = await this.productRepository.find();
    let total = 0;
    for (const product of products) {
      if (!product.image_urls?.length) continue;
      const localUrls = await this.imageService.processImageUrls(
        product.image_urls,
      );
      product.image_urls = localUrls;
      await this.productRepository.save(product);
      total += localUrls.filter((u) => u.startsWith("/uploads/")).length;
    }
    return { downloaded: total, products: products.length };
  }

  async bulkDeleteProducts(ids: string[]) {
    const products = await this.productRepository.find({
      where: { id: In(ids) },
    });
    await this.productRepository.remove(products);
    return { deleted: products.length };
  }

  async exportProductsCsv(search?: string) {
    const where: any = {};
    if (search) where.name = Like(`%${search}%`);
    let products: any[] = [];
    try {
      products = await this.productRepository.find({
        where,
        order: { created_at: "DESC" },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const fallback = await this.listProductsFallback(1, 100000, search);
      products = fallback.data;
    }
    const header =
      "id,name,description,category,current_market_price,specs,created_at";
    const rows = products.map((p) =>
      [
        p.id,
        p.name,
        (p.description || "").replace(/,/g, ";"),
        p.category || normalizeProductCategory(undefined, p.name),
        p.current_market_price,
        JSON.stringify(p.specs || {}).replace(/,/g, ";"),
        p.created_at,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }

  async listAuctions(page = 1, limit = 20, status?: AuctionStatus) {
    let data: any[] = [];
    let total = 0;
    try {
      const where: any = {};
      if (status) where.status = status;
      const result = await this.auctionRepository.findAndCount({
        where,
        relations: ["product"],
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
      ? await this.bidRepository
          .createQueryBuilder("bid")
          .select("bid.auction_id", "auction_id")
          .addSelect("COUNT(*)", "total_bids")
          .addSelect("COUNT(DISTINCT bid.user_id)", "unique_bidders")
          .where("bid.auction_id IN (:...ids)", { ids: auctionIds })
          .groupBy("bid.auction_id")
          .getRawMany()
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
      product = await this.productRepository.findOne({
        where: { id: dto.product_id },
      });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.productRepository.query(
        `SELECT id FROM products WHERE id = $1 LIMIT 1`,
        [dto.product_id],
      );
      product = rows[0] || null;
    }
    if (!product) throw new NotFoundException("Product not found");
    const entity = this.auctionRepository.create() as Auction;
    entity.product_id = dto.product_id;
    entity.start_time = new Date(dto.start_time);
    entity.end_time = new Date(dto.end_time);
    entity.status = AuctionStatus.ACTIVE;
    if (dto.min_bid != null) entity.min_bid = dto.min_bid;
    if (dto.max_bid != null) entity.max_bid = dto.max_bid;
    if (dto.bid_fee != null) entity.bid_fee = dto.bid_fee;
    try {
      return await this.auctionRepository.save(entity);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.auctionRepository.query(
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

  private normalizeSpecs(specs?: Record<string, string>) {
    if (!specs || typeof specs !== "object") return null;
    const normalized = this.specKeys.reduce<Record<string, string>>(
      (acc, key) => {
        const value = specs[key];
        if (typeof value === "string" && value.trim()) acc[key] = value.trim();
        return acc;
      },
      {},
    );
    return Object.keys(normalized).length ? normalized : null;
  }

  async updateAuction(id: string, dto: UpdateAuctionDto) {
    let auction = null as any;
    try {
      auction = await this.auctionRepository.findOne({ where: { id } });
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.auctionRepository.query(
        `SELECT * FROM auctions WHERE id = $1 LIMIT 1`,
        [id],
      );
      auction = rows[0] || null;
    }
    if (!auction) throw new NotFoundException("Auction not found");
    if (dto.product_id != null) {
      const product = await this.productRepository.findOne({
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
      return await this.auctionRepository.save(auction);
    } catch (error) {
      if (!this.isMissingColumnError(error)) throw error;
      const rows = await this.auctionRepository.query(
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
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    await this.auctionRepository.remove(auction);
    return { deleted: true, id };
  }

  async bulkDeleteAuctions(ids: string[]) {
    const auctions = await this.auctionRepository.find({
      where: { id: In(ids) },
    });
    await this.auctionRepository.remove(auctions);
    return { deleted: auctions.length };
  }

  async closeAuctionEarly(id: string, actorId?: string) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    await this.closureService.closeSingleAuction(id, actorId || "admin");
    return this.auctionRepository.findOne({
      where: { id },
      relations: ["product"],
    });
  }

  async forceCloseAuction(id: string, actorId?: string) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    return this.closureService.forceCloseSingleAuction(id, actorId || "admin");
  }

  private async resolveWinnerUserInfo(
    userId: string | null,
  ): Promise<{ name: string | null; phone: string | null } | null> {
    if (!userId) return null;
    try {
      const identityBase =
        process.env.IDENTITY_SERVICE_URL || "http://localhost:3001";
      const headers: Record<string, string> = {};
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      const res = await fetch(
        `${identityBase}/api/v1/wallet/user/${userId}/internal`,
        { headers },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return {
        name: data.full_name || data.phone_number || null,
        phone: data.phone_number || null,
      };
    } catch (e) {
      this.logger.warn(
        `Failed to resolve winner info for ${userId}: ${e.message}`,
      );
      return null;
    }
  }

  async drawWinner(auctionId: string) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new NotFoundException("Auction not found");

    let bids: Bid[] = [];
    if (auction.status === AuctionStatus.CLOSED) {
      bids = await this.bidRepository.find({
        where: { auction_id: auctionId },
        order: { bid_time: "ASC" },
      });
    }

    const { winningAmounts, totalBids, winners } =
      await this.winnerService.calculateWinners(auctionId);
    const uniqueBidders =
      await this.winnerService.getUniqueBiddersCount(auctionId);
    const stats = {
      totalBids,
      uniqueBidders,
      lowestUniqueBid: winningAmounts.length > 0 ? winningAmounts[0] : null,
    };
    const primaryWinnerInfo = await this.resolveWinnerUserInfo(
      auction.winner_user_id,
    );
    const winnerName = primaryWinnerInfo?.name || null;
    const winnerPhone = primaryWinnerInfo?.phone || null;

    const persistedWinners = await this.winnerRepository.find({
      where: { auction_id: auctionId },
      order: { rank: "ASC" },
    });

    const allWinners = await Promise.all(
      (persistedWinners.length > 0 ? persistedWinners : winners).map(
        async (w: any) => {
          const info = await this.resolveWinnerUserInfo(w.user_id || w.userId);
          return {
            user_id: w.user_id || w.userId,
            amount: w.amount,
            rank: w.rank,
            payment_status: w.payment_status,
            payment_deadline: w.payment_deadline,
            name: info?.name || null,
            phone: info?.phone || null,
          };
        },
      ),
    );

    return {
      id: auction.id,
      product: auction.product,
      status: auction.status,
      start_time: auction.start_time,
      end_time: auction.end_time,
      winner_user_id: auction.winner_user_id,
      winner_name: winnerName,
      winner_phone: winnerPhone,
      winning_bid_amount:
        auction.winning_bid_amount ??
        (winners.length > 0 ? winners[0].amount : null),
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      winners_count: allWinners.length,
      bids: bids.map((b) => ({ ...b, amount: this.resolveBidAmount(b) })),
      created_at: auction.created_at,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
    };
  }

  private resolveBidAmount(bid: Bid): number {
    if (bid.amount !== 0 || !bid.encrypted_amount) return bid.amount;
    try {
      return this.bidEncryptionService.decrypt(bid.encrypted_amount);
    } catch {
      return 0;
    }
  }

  async getAuctionBids(auctionId: string) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      select: ["id", "status"],
    });
    if (!auction) throw new NotFoundException("Auction not found");
    const bids = await this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "ASC" },
    });
    const isActive = auction.status === AuctionStatus.ACTIVE;
    const enriched = await Promise.all(
      bids.map(async (b) => {
        const info = await this.resolveWinnerUserInfo(b.user_id);
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
          user_name: info?.name || null,
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
    return enriched;
  }

  async exportAuctionsCsv(status?: AuctionStatus) {
    const where: any = {};
    if (status) where.status = status;
    const auctions = await this.auctionRepository.find({
      where,
      relations: ["product"],
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
