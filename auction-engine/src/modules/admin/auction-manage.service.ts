import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Auction, AuctionStatus } from '../winner/entities/auction.entity';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, CreateAuctionDto, UpdateAuctionDto } from './dto/admin.dto';

@Injectable()
export class AuctionManageService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async listProducts(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) where.name = Like(`%${search}%`);
    const [data, total] = await this.productRepository.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async createProduct(dto: CreateProductDto) {
    return this.productRepository.save(this.productRepository.create(dto));
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async deleteProduct(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    await this.productRepository.remove(product);
    return { deleted: true, id };
  }

  async bulkDeleteProducts(ids: string[]) {
    const products = await this.productRepository.find({ where: { id: In(ids) } });
    await this.productRepository.remove(products);
    return { deleted: products.length };
  }

  async exportProductsCsv(search?: string) {
    const where: any = {};
    if (search) where.name = Like(`%${search}%`);
    const products = await this.productRepository.find({ where, order: { created_at: 'DESC' } });
    const header = 'id,name,description,brand,current_market_price,created_at';
    const rows = products.map((p) =>
      [p.id, p.name, (p.description || '').replace(/,/g, ';'), p.brand || '', p.current_market_price, p.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async listAuctions(page = 1, limit = 20, status?: AuctionStatus) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await this.auctionRepository.findAndCount({
      where,
      relations: ['product'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, total_pages: Math.ceil(total / limit) } };
  }

  async createAuction(dto: CreateAuctionDto) {
    const product = await this.productRepository.findOne({ where: { id: dto.product_id } });
    if (!product) throw new NotFoundException('Product not found');
    return this.auctionRepository.save(this.auctionRepository.create({
      product_id: dto.product_id,
      start_time: new Date(dto.start_time),
      end_time: new Date(dto.end_time),
      status: AuctionStatus.ACTIVE,
    }));
  }

  async updateAuction(id: string, dto: UpdateAuctionDto) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException('Auction not found');
    if (dto.product_id != null) {
      const product = await this.productRepository.findOne({ where: { id: dto.product_id } });
      if (!product) throw new NotFoundException('Product not found');
      auction.product_id = dto.product_id;
    }
    if (dto.start_time != null) auction.start_time = new Date(dto.start_time);
    if (dto.end_time != null) auction.end_time = new Date(dto.end_time);
    if (dto.status != null) auction.status = dto.status;
    return this.auctionRepository.save(auction);
  }

  async deleteAuction(id: string) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException('Auction not found');
    await this.auctionRepository.remove(auction);
    return { deleted: true, id };
  }

  async bulkDeleteAuctions(ids: string[]) {
    const auctions = await this.auctionRepository.find({ where: { id: In(ids) } });
    await this.auctionRepository.remove(auctions);
    return { deleted: auctions.length };
  }

  async closeAuctionEarly(id: string) {
    const auction = await this.auctionRepository.findOne({ where: { id } });
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException('Auction is not active');
    }
    auction.status = AuctionStatus.CLOSED;
    auction.end_time = new Date();
    return this.auctionRepository.save(auction);
  }

  async exportAuctionsCsv(status?: AuctionStatus) {
    const where: any = {};
    if (status) where.status = status;
    const auctions = await this.auctionRepository.find({
      where,
      relations: ['product'],
      order: { created_at: 'DESC' },
    });
    const header = 'id,product_name,status,start_time,end_time,winner_user_id,winning_bid_amount,created_at';
    const rows = auctions.map((a) =>
      [a.id, a.product?.name || '', a.status, a.start_time, a.end_time, a.winner_user_id || '', a.winning_bid_amount || '', a.created_at].join(','),
    );
    return [header, ...rows].join('\n');
  }
}