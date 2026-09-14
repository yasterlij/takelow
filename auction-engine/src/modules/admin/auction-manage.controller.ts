import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { AuctionAdminService } from "./auction-admin.service";
import { AuctionReviewService } from "./auction-review.service";
import { ProductAdminService } from "./product-admin.service";
import { ImageService } from "./image.service";
import {
  CreateProductDto,
  UpdateProductDto,
  CreateAuctionDto,
  UpdateAuctionDto,
} from "./dto/admin.dto";
import { AuctionStatus } from "@prisma/client";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AuctionManageController {
  constructor(
    private reviewService: AuctionReviewService,
    private auctionService: AuctionAdminService,
    private productService: ProductAdminService,
    private imageService: ImageService,
  ) {}

  @Get("products")
  @ApiOperation({ summary: "List products" })
  async listProducts(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("search") search?: string,
  ) {
    return this.productService.listProducts(
      parseInt(page),
      parseInt(limit),
      search,
    );
  }

  @Get("products/export/csv")
  @ApiOperation({ summary: "Export products as CSV" })
  async exportProductsCsv(
    @Query("search") search: string,
    @Res() res: Response,
  ) {
    const csv = await this.productService.exportProductsCsv(search);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csv);
  }

  @Post("products/upload-image")
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload a product image" })
  async uploadProductImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return { url: this.imageService.saveUploadedFile(file) };
  }

  @Post("products")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Create product" })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productService.createProduct(dto);
  }

  @Patch("products/:id")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Update product" })
  async updateProduct(@Param("id") id: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(id, dto);
  }

  @Post("products/:id/download-images")
  @ApiOperation({ summary: "Download product images" })
  async downloadProductImages(@Param("id") id: string) {
    return this.productService.downloadProductImages(id);
  }

  @Post("products/download-all-images")
  @ApiOperation({ summary: "Download all product images" })
  async downloadAllProductImages() {
    return this.productService.downloadAllProductImages();
  }

  @Delete("products/:id")
  @ApiOperation({ summary: "Delete product" })
  async deleteProduct(@Param("id") id: string) {
    return this.productService.deleteProduct(id);
  }

  @Post("products/bulk-delete")
  @ApiOperation({ summary: "Bulk delete products" })
  async bulkDeleteProducts(@Body() body: { ids: string[] }) {
    return this.productService.bulkDeleteProducts(body.ids);
  }

  @Get("auctions")
  @ApiOperation({ summary: "List auctions" })
  async listAuctions(
    @Query("page") page = "1",
    @Query("limit") limit = "20",
    @Query("status") status?: AuctionStatus,
  ) {
    return this.auctionService.listAuctions(
      parseInt(page),
      parseInt(limit),
      status,
    );
  }

  @Get("auctions/export/csv")
  @ApiOperation({ summary: "Export auctions as CSV" })
  async exportAuctionsCsv(
    @Query("status") status: AuctionStatus,
    @Res() res: Response,
  ) {
    const csv = await this.auctionService.exportAuctionsCsv(status);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=auctions.csv");
    res.send(csv);
  }

  @Post("auctions")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Create auction" })
  async createAuction(@Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(dto);
  }

  @Patch("auctions/:id")
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: "Update auction" })
  async updateAuction(@Param("id") id: string, @Body() dto: UpdateAuctionDto) {
    return this.auctionService.updateAuction(id, dto);
  }

  @Delete("auctions/:id")
  @ApiOperation({ summary: "Delete auction" })
  async deleteAuction(@Param("id") id: string) {
    return this.auctionService.deleteAuction(id);
  }

  @Post("auctions/bulk-delete")
  @ApiOperation({ summary: "Bulk delete auctions" })
  async bulkDeleteAuctions(@Body() body: { ids: string[] }) {
    return this.auctionService.bulkDeleteAuctions(body.ids);
  }

  @Post("auctions/:id/close")
  @ApiOperation({ summary: "Close auction early" })
  async closeAuction(@Param("id") id: string, @Req() req: any) {
    return this.auctionService.closeAuctionEarly(id, req.user?.id);
  }

  @Post("auctions/:id/force-close")
  @ApiOperation({ summary: "Force close auction" })
  async forceCloseAuction(@Param("id") id: string, @Req() req: any) {
    return this.auctionService.forceCloseAuction(id, req.user?.id);
  }

  @Get("auctions/:id/winner")
  @ApiOperation({ summary: "Draw winner for auction" })
  async drawWinner(@Param("id") id: string) {
    return this.reviewService.drawWinner(id);
  }

  @Get("auctions/:id/bids")
  @ApiOperation({ summary: "Get auction bids" })
  async getAuctionBids(@Param("id") id: string) {
    return this.reviewService.getAuctionBids(id);
  }
}
