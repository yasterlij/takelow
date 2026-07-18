import { Controller, Get, Param, Query, UseInterceptors, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuctionsService } from './auctions.service';
import { CacheInterceptor } from '../common/cache.interceptor';

@Controller('auctions')
@UseInterceptors(CacheInterceptor)
export class AuctionsController {
  constructor(private auctionsService: AuctionsService) {}

  @Get('active')
  async getActiveAuctions() {
    return this.auctionsService.getActiveAuctions();
  }

  @Get('closed')
  async getClosedAuctions() {
    return this.auctionsService.getClosedAuctions();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-bids')
  async getMyBidHistory(@Req() req: any) {
    return this.auctionsService.getUserBidHistory(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-wins')
  async getMyWonAuctions(@Req() req: any) {
    return this.auctionsService.getUserWonAuctions(req.user.id);
  }

  @Get(':id')
  async getActiveAuction(@Param('id') id: string) {
    return this.auctionsService.getActiveAuction(id);
  }

  @Get(':id/bids')
  async getBidHistory(@Param('id') id: string) {
    return this.auctionsService.getBidHistory(id);
  }
}
