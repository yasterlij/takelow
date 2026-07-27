import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async getFavorites(@Req() req: any) {
    return this.favoritesService.getUserFavorites(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':auctionId')
  async addFavorite(@Param('auctionId', new ParseUUIDPipe()) auctionId: string, @Req() req: any) {
    return this.favoritesService.addFavorite(req.user.id, auctionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':auctionId')
  async removeFavorite(@Param('auctionId', new ParseUUIDPipe()) auctionId: string, @Req() req: any) {
    await this.favoritesService.removeFavorite(req.user.id, auctionId);
    return { removed: true };
  }
}
