import * as crypto from "crypto";
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BiddingService } from "./bidding.service";
import { BidDto } from "./dto/bid.dto";
import { BiddingWindowInterceptor } from "../common/bidding-window.interceptor";
import { ThrottleGuard } from "../common/throttle.guard";
import { NonceGuard } from "../common/nonce.guard";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Bid } from "../bidding/entities/bid.entity";
import { NotificationDispatchService } from "../worker/notification-dispatch.service";
import { AuctionReviewService } from "../admin/auction-review.service";

@Controller("auctions")
export class BiddingController {
  private readonly logger = new Logger(BiddingController.name);

  private isLegacyBidSchemaError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    const isSchemaError =
      message.includes("does not exist") ||
      message.includes("unknown column") ||
      message.includes("no such column");

    return (
      isSchemaError &&
      (message.includes("encrypted_amount") || message.includes("ticket_number"))
    );
  }

  private normalizeBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "t";
    }
    return value != null;
  }

  private mapLegacyBidRow(row: Record<string, unknown>): Bid {
    return {
      id: String(row.bid_id ?? ""),
      user_id: String(row.bid_user_id ?? ""),
      auction_id: String(row.bid_auction_id ?? ""),
      amount: Number(row.bid_amount ?? 0),
      bid_time: row.bid_bid_time as Date,
      service_fee_paid: this.normalizeBoolean(row.bid_service_fee_paid),
      ticket_number: "",
      encrypted_amount: "",
    } as Bid;
  }

  private async loadUserBids(auctionId: string, userId: string): Promise<Bid[]> {
    try {
      return await this.bidRepository.find({
        where: { auction_id: auctionId, user_id: userId },
        order: { bid_time: "DESC" },
      });
    } catch (e) {
      if (!this.isLegacyBidSchemaError(e)) {
        throw e;
      }

      this.logger.warn(
        `Legacy bid schema detected for auction=${auctionId} user=${userId}, falling back to base bid columns: ${e.message}`,
      );

      const rows = await this.bidRepository
        .createQueryBuilder("bid")
        .select([
          "bid.id",
          "bid.user_id",
          "bid.auction_id",
          "bid.amount",
          "bid.bid_time",
          "bid.service_fee_paid",
        ])
        .where("bid.auction_id = :auctionId", { auctionId })
        .andWhere("bid.user_id = :userId", { userId })
        .orderBy("bid.bid_time", "DESC")
        .getRawMany<Record<string, unknown>>();

      return rows.map((row) => this.mapLegacyBidRow(row));
    }
  }

  private async loadLatestUserBid(
    auctionId: string,
    userId: string,
  ): Promise<Bid | null> {
    try {
      return await this.bidRepository.findOne({
        where: { auction_id: auctionId, user_id: userId },
        order: { bid_time: "DESC" },
      });
    } catch (e) {
      if (!this.isLegacyBidSchemaError(e)) {
        throw e;
      }

      this.logger.warn(
        `Legacy bid schema detected for latest bid auction=${auctionId} user=${userId}, falling back to base bid columns: ${e.message}`,
      );

      const row = await this.bidRepository
        .createQueryBuilder("bid")
        .select([
          "bid.id",
          "bid.user_id",
          "bid.auction_id",
          "bid.amount",
          "bid.bid_time",
          "bid.service_fee_paid",
        ])
        .where("bid.auction_id = :auctionId", { auctionId })
        .andWhere("bid.user_id = :userId", { userId })
        .orderBy("bid.bid_time", "DESC")
        .getRawOne<Record<string, unknown>>();

      return row ? this.mapLegacyBidRow(row) : null;
    }
  }

  constructor(
    private biddingService: BiddingService,
    private auctionReviewService: AuctionReviewService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    private notificationDispatchService: NotificationDispatchService,
  ) {}

  @Post(":id/bid")
  @UseInterceptors(BiddingWindowInterceptor)
  @UseGuards(AuthGuard("jwt"), ThrottleGuard, NonceGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async placeBid(
    @Param("id") auctionId: string,
    @Body() dto: BidDto,
    @Req() req: any,
  ) {
    const { amount } = dto;
    const user = req.user;
    const auction = req.auction;

    const ticketNumber = `BID_${crypto.randomBytes(6).toString("hex")}`;

    const result = await this.biddingService.placeBid(
      auctionId,
      user.id,
      amount,
      auction.end_time,
      ticketNumber,
    );

    this.sendBidSms(user, auction, amount, ticketNumber).catch((e: any) =>
      this.logger.warn(`Failed to send bid SMS: ${e.message}`),
    );

    return {
      message: "Bid placed successfully",
      new_total_bids: result.newTotalBids,
      ticket_number: ticketNumber,
    };
  }

  @Get(":id/my-bids")
  @UseGuards(AuthGuard("jwt"))
  async getMyBids(@Param("id") auctionId: string, @Req() req: any) {
    const bids = await this.loadUserBids(auctionId, req.user.id);
    return {
      auction_id: auctionId,
      bids: bids.map((b) => ({
        amount: this.resolveBidAmount(b),
        bid_time: b.bid_time,
        ticket_number: b.ticket_number,
      })),
    };
  }

  @Get(":id/result")
  @UseGuards(AuthGuard("jwt"))
  async getAuctionResult(@Param("id") auctionId: string, @Req() req: any) {
    const { bids: _bids, ...result } =
      await this.auctionReviewService.drawWinner(auctionId);

    const userBid = await this.loadLatestUserBid(auctionId, req.user.id);

    return {
      ...result,
      my_bid: userBid
        ? {
            amount: this.resolveBidAmount(userBid),
            encrypted_amount: null,
            amount_encrypted: false,
            bid_time: userBid.bid_time,
            service_fee_paid: userBid.service_fee_paid,
          }
        : null,
    };
  }

  private async sendBidSms(
    user: any,
    auction: any,
    amount: number,
    ticketNumber: string,
  ): Promise<void> {
    try {
      await this.notificationDispatchService.dispatch(
        "/api/v1/notify/bid-confirmation",
        {
          phone: user.phone,
          product_name: auction.product?.name || "Unknown",
          bid_amount: amount,
          ticket_number: ticketNumber,
        },
      );
    } catch (e) {
      this.logger.warn(`Failed to send bid SMS: ${e.message}`);
    }
  }

  private resolveBidAmount(bid: Bid): number {
    if (bid.amount !== 0 || !bid.encrypted_amount) return Number(bid.amount);
    try {
      return Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      return 0;
    }
  }
}
