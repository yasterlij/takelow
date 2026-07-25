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

@Injectable()
export class AuctionManageService {
  private readonly logger = new Logger(AuctionManageService.name);

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
  ) {}

  async listProducts(page = 1, limit = 20, search?: string) {
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
  }

  async createProduct(dto: CreateProductDto) {
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(data.image_urls);
    }
    return this.productRepository.save(this.productRepository.create(data));
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException("Product not found");
    const data = { ...dto };
    if (data.image_urls?.length) {
      data.image_urls = await this.imageService.processImageUrls(data.image_urls);
    }
    Object.assign(product, data);
    return this.productRepository.save(product);
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
    const localUrls = await this.imageService.processImageUrls(product.image_urls);
    product.image_urls = localUrls;
    await this.productRepository.save(product);
    const downloaded = localUrls.filter((u) => u.startsWith("/uploads/")).length;
    return { downloaded, total: product.image_urls.length };
  }

  async downloadAllProductImages() {
    const products = await this.productRepository.find();
    let total = 0;
    for (const product of products) {
      if (!product.image_urls?.length) continue;
      const localUrls = await this.imageService.processImageUrls(product.image_urls);
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
    const products = await this.productRepository.find({
      where,
      order: { created_at: "DESC" },
    });
    const header = "id,name,description,brand,current_market_price,created_at";
    const rows = products.map((p) =>
      [
        p.id,
        p.name,
        (p.description || "").replace(/,/g, ";"),
        p.brand || "",
        p.current_market_price,
        p.created_at,
      ].join(","),
    );
    return [header, ...rows].join("\n");
  }

  async listAuctions(page = 1, limit = 20, status?: AuctionStatus) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await this.auctionRepository.findAndCount({
      where,
      relations: ["product"],
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
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
    const product = await this.productRepository.findOne({
      where: { id: dto.product_id },
    });
    if (!product) throw new NotFoundException("Product not found");
    const entity = this.auctionRepository.create() as Auction;
    entity.product_id = dto.product_id;
    entity.start_time = new Date(dto.start_time);
    entity.end_time = new Date(dto.end_time);
    entity.status = AuctionStatus.ACTIVE;
    if (dto.min_bid != null) entity.min_bid = dto.min_bid;
    if (dto.max_bid != null) entity.max_bid = dto.max_bid;
    return this.auctionRepository.save(entity);
  }

  async updateAuction(id: string, dto: UpdateAuctionDto) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
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
    return this.auctionRepository.save(auction);
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

  private async resolveWinnerUserInfo(
    userId: string | null,
  ): Promise<{ name: string | null; phone: string | null } | null> {
    if (!userId) return null;
    try {
      const res = await fetch(
        `http://identity-service:3000/api/v1/wallet/user/${userId}`,
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

    const stats = await this.winnerService.getAuctionStats(auctionId);
    const { winners } = await this.winnerService.calculateWinners(auctionId);
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
      persistedWinners.map(async (w) => {
        const info = await this.resolveWinnerUserInfo(w.user_id);
        return {
          user_id: w.user_id,
          amount: w.amount,
          rank: w.rank,
          payment_status: w.payment_status,
          payment_deadline: w.payment_deadline,
          name: info?.name || null,
          phone: info?.phone || null,
        };
      }),
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
      winning_bid_amount: auction.winning_bid_amount,
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      winners_count: allWinners.length,
      bids,
      created_at: auction.created_at,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
    };
  }

  async getAuctionBids(auctionId: string) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException("Auction not found");
    return this.bidRepository.find({
      where: { auction_id: auctionId },
      order: { bid_time: "ASC" },
    });
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
