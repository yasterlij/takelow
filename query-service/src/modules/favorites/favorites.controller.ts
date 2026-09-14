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
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('favorites')
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user favorites' })
  async getFavorites(@Req() req: any) {
    return this.favoritesService.getUserFavorites(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':auctionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add favorite' })
  async addFavorite(@Param('auctionId', new ParseUUIDPipe()) auctionId: string, @Req() req: any) {
    return this.favoritesService.addFavorite(req.user.id, auctionId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':auctionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove favorite' })
  async removeFavorite(@Param('auctionId', new ParseUUIDPipe()) auctionId: string, @Req() req: any) {
    await this.favoritesService.removeFavorite(req.user.id, auctionId);
    return { removed: true };
  }
}
