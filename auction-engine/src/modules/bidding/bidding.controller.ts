import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BiddingService } from './bidding.service';
import { BidDto } from './dto/bid.dto';
import { BiddingWindowInterceptor } from '../common/bidding-window.interceptor';
import { ThrottleGuard } from '../common/throttle.guard';
import { NonceGuard } from '../common/nonce.guard';

@Controller('auctions')
@UseInterceptors(BiddingWindowInterceptor)
export class BiddingController {
  constructor(private biddingService: BiddingService) {}

  @Post(':id/bid')
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
      Number(user.wallet_balance),
      auction.end_time,
    );

    return {
      message: 'Bid placed successfully',
      new_total_bids: result.newTotalBids,
    };
  }
}
