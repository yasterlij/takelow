import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuctionManageService } from './auction-manage.service';
import { CreateProductDto, UpdateProductDto, CreateAuctionDto, UpdateAuctionDto } from './dto/admin.dto';
import { AuctionStatus } from '../winner/entities/auction.entity';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Response } from 'express';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class AuctionManageController {
  constructor(private service: AuctionManageService) {}

  @Get('products')
  async listProducts(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.service.listProducts(parseInt(page), parseInt(limit), search);
  }

  @Get('products/export/csv')
  async exportProductsCsv(@Query('search') search: string, @Res() res: Response) {
    const csv = await this.service.exportProductsCsv(search);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  }

  @Post('products')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Patch('products/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    return this.service.deleteProduct(id);
  }

  @Post('products/bulk-delete')
  async bulkDeleteProducts(@Body() body: { ids: string[] }) {
    return this.service.bulkDeleteProducts(body.ids);
  }

  @Get('auctions')
  async listAuctions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: AuctionStatus,
  ) {
    return this.service.listAuctions(parseInt(page), parseInt(limit), status);
  }

  @Get('auctions/export/csv')
  async exportAuctionsCsv(@Query('status') status: AuctionStatus, @Res() res: Response) {
    const csv = await this.service.exportAuctionsCsv(status);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=auctions.csv');
    res.send(csv);
  }

  @Post('auctions')
  @UsePipes(new ValidationPipe({ transform: true }))
  async createAuction(@Body() dto: CreateAuctionDto) {
    return this.service.createAuction(dto);
  }

  @Patch('auctions/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateAuction(@Param('id') id: string, @Body() dto: UpdateAuctionDto) {
    return this.service.updateAuction(id, dto);
  }

  @Delete('auctions/:id')
  async deleteAuction(@Param('id') id: string) {
    return this.service.deleteAuction(id);
  }

  @Post('auctions/bulk-delete')
  async bulkDeleteAuctions(@Body() body: { ids: string[] }) {
    return this.service.bulkDeleteAuctions(body.ids);
  }

  @Post('auctions/:id/close')
  async closeAuction(@Param('id') id: string) {
    return this.service.closeAuctionEarly(id);
  }

  @Get('auctions/:id/winner')
  async drawWinner(@Param('id') id: string) {
    return this.service.drawWinner(id);
  }

  @Get('auctions/:id/bids')
  async getAuctionBids(@Param('id') id: string) {
    return this.service.getAuctionBids(id);
  }
}