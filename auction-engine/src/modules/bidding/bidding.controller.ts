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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BiddingService } from './bidding.service';
import { BidDto } from './dto/bid.dto';
import { BiddingWindowInterceptor } from '../common/bidding-window.interceptor';
import { ThrottleGuard } from '../common/throttle.guard';
import { NonceGuard } from '../common/nonce.guard';
import { WinnerService } from '../winner/winner.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auction, AuctionStatus } from '../winner/entities/auction.entity';
import { Bid } from '../bidding/entities/bid.entity';

@Controller('auctions')
export class BiddingController {
  private readonly logger = new Logger(BiddingController.name)

  constructor(
    private biddingService: BiddingService,
    private winnerService: WinnerService,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
  ) {}

  @Post(':id/bid')
  @UseInterceptors(BiddingWindowInterceptor)
  @UseGuards(AuthGuard('jwt'), ThrottleGuard, NonceGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async placeBid(
    @Param('id') auctionId: string,
    @Body() dto: BidDto,
    @Req() req: any,
  ) {
    const { amount } = dto;
    const user = req.user;
    const auction = req.auction;

    const result = await this.biddingService.placeBid(
      auctionId,
      user.id,
      amount,
      auction.end_time,
    );

    return {
      message: 'Bid placed successfully',
      new_total_bids: result.newTotalBids,
      ticket_number: result.ticketNumber,
    };
  }

  @Get(':id/result')
  @UseGuards(AuthGuard('jwt'))
  async getAuctionResult(
    @Param('id') auctionId: string,
    @Req() req: any,
  ) {
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['product'],
    });
    if (!auction) throw new NotFoundException('Auction not found');

    const stats = await this.winnerService.getAuctionStats(auctionId);
    const { winners } = await this.winnerService.calculateWinners(auctionId);

    const userBid = await this.bidRepository.findOne({
      where: { auction_id: auctionId, user_id: req.user.id },
      order: { bid_time: 'DESC' },
    });

    const allWinners = await Promise.all(
      winners.map(async (w) => ({
        user_id: w.userId,
        amount: w.amount,
        name: await this.resolveWinnerName(w.userId),
      })),
    );

    return {
      id: auction.id,
      product: auction.product,
      status: auction.status,
      winner_user_id: auction.winner_user_id,
      winner_name: auction.winner_user_id ? await this.resolveWinnerName(auction.winner_user_id) : null,
      winning_bid_amount: auction.winning_bid_amount,
      total_bids: stats.totalBids,
      unique_bidders: stats.uniqueBidders,
      lowest_unique_bid: stats.lowestUniqueBid,
      all_winners: allWinners,
      my_bid: userBid ? { amount: userBid.amount, bid_time: userBid.bid_time, service_fee_paid: userBid.service_fee_paid } : null,
      payment_status: auction.payment_status,
      payment_deadline: auction.payment_deadline,
      created_at: auction.created_at,
    };
  }

  private async resolveWinnerName(userId: string | null): Promise<string | null> {
    if (!userId) return null
    try {
      const res = await fetch(`http://identity-service:3000/api/v1/wallet/user/${userId}`)
      if (!res.ok) return null
      const data = await res.json()
      return data.full_name || data.phone_number || null
    } catch (e) {
      this.logger.warn(`Failed to resolve winner name for ${userId}: ${e.message}`)
      return null
    }
  }
}
