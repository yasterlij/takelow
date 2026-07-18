import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Auction } from '../modules/auctions/entities/auction.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Bid } from '../modules/auctions/entities/bid.entity';
import { Favorite } from '../modules/favorites/entities/favorite.entity';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [Auction, Product, Bid, Favorite],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
};
