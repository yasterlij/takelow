import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Bid } from '../modules/bidding/entities/bid.entity';
import { Auction } from '../modules/winner/entities/auction.entity';
import { Product } from '../modules/admin/entities/product.entity';
import { PaymentTransaction } from '../modules/payment/entities/payment-transaction.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db',
  entities: [Bid, Auction, Product, PaymentTransaction],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 50,
    idleTimeoutMillis: 30000,
  },
};
