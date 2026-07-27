import { Controller, Get, Param, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CacheInterceptor } from '../common/cache.interceptor';

@Controller('products')
@UseInterceptors(CacheInterceptor)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.productsService.findOne(id);
  }
}
