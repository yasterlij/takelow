import { DataSource } from 'typeorm';
import { Auction } from '../modules/auctions/entities/auction.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Bid } from '../modules/auctions/entities/bid.entity';
import { Favorite } from '../modules/favorites/entities/favorite.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db',
  entities: [Auction, Product, Bid, Favorite],
  migrations: ['src/migrations/*.ts'],
  logging: true,
});
