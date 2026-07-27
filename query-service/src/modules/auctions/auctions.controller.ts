import { Controller, Get, Param, Query, UseInterceptors, Req, UseGuards, ParseUUIDPipe } from '@nestjs/common';
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

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async getActiveAuction(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionsService.getActiveAuction(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/bids')
  async getBidHistory(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.auctionsService.getBidHistory(id);
  }
}
