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
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { BiddingService } from "./bidding.service";
import { BidDto } from "./dto/bid.dto";
import { BiddingWindowInterceptor } from "../common/bidding-window.interceptor";
import { ThrottleGuard } from "../common/throttle.guard";
import { NonceGuard } from "../common/nonce.guard";
import { WinnerService } from "../winner/winner.service";
import { BidEncryptionService } from "../common/bid-encryption.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction, AuctionStatus } from "../winner/entities/auction.entity";
import { Winner } from "../winner/entities/winner.entity";
import { Bid } from "../bidding/entities/bid.entity";

@Controller("auctions")
export class BiddingController {
  private readonly logger = new Logger(BiddingController.name);

  constructor(
    private biddingService: BiddingService,
    private winnerService: WinnerService,
    private bidEncryptionService: BidEncryptionService,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(Winner)
    private winnerRepository: Repository<Winner>,
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

  @Get(":id/result")
  @UseGuards(AuthGuard("jwt"))
  async getAuctionResult(@Param("id") auctionId: string, @Req() req: any) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new NotFoundException("Auction not found");

    const stats = await this.winnerService.getAuctionStats(auctionId);
    const { winners } = await this.winnerService.calculateWinners(auctionId);

    const userBid = await this.bidRepository.findOne({
      where: { auction_id: auctionId, user_id: req.user.id },
      order: { bid_time: "DESC" },
    });

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

    const primaryWinnerInfo = auction.winner_user_id
      ? await this.resolveWinnerUserInfo(auction.winner_user_id)
      : null;

    return {
      id: auction.id,
      product: auction.product,
      status: auction.status,
      winner_user_id: auction.winner_user_id,
      winner_name: primaryWinnerInfo?.name || null,
      winner_phone: primaryWinnerInfo?.phone || null,
      winning_bid_amount:
        auction.winning_bid_amount ??
        (winners.length > 0 ? winners[0].amount : null),
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      winners_count: allWinners.length,
      my_bid: userBid
        ? {
            amount: this.resolveBidAmount(userBid),
            encrypted_amount: null,
            amount_encrypted: false,
            bid_time: userBid.bid_time,
            service_fee_paid: userBid.service_fee_paid,
          }
        : null,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
      created_at: auction.created_at,
    };
  }

  private async sendBidSms(
    user: any,
    auction: any,
    amount: number,
    ticketNumber: string,
  ): Promise<void> {
    try {
      const identityBase =
        process.env.IDENTITY_SERVICE_URL || "http://localhost:3001";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey) headers["x-internal-api-key"] = internalApiKey;
      await fetch(`${identityBase}/api/v1/notify/bid-confirmation`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: user.phone,
          product_name: auction.product?.name || "Unknown",
          bid_amount: amount,
          ticket_number: ticketNumber,
        }),
      });
    } catch (e) {
      this.logger.warn(`Failed to send bid SMS: ${e.message}`);
    }
  }

  private async resolveWinnerUserInfo(
    userId: string | null,
  ): Promise<{ name: string | null; phone: string | null } | null> {
    if (!userId) return null;
    try {
      const internalHeaders: Record<string, string> = {};
      const internalApiKey = process.env.INTERNAL_API_KEY || "";
      if (internalApiKey)
        internalHeaders["x-internal-api-key"] = internalApiKey;
      const res = await fetch(
        `http://identity-service:3000/api/v1/wallet/user/${userId}/internal`,
        { headers: internalHeaders },
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

  private resolveBidAmount(bid: Bid): number {
    if (bid.amount !== 0 || !bid.encrypted_amount) return Number(bid.amount);
    try {
      return Number(this.bidEncryptionService.decrypt(bid.encrypted_amount));
    } catch {
      return 0;
    }
  }
}
