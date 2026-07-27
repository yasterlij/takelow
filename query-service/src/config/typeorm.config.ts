import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Auction } from '../modules/auctions/entities/auction.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Bid } from '../modules/auctions/entities/bid.entity';
import { Favorite } from '../modules/favorites/entities/favorite.entity';

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://admin:secret@localhost:5432/takelow_db';
const readReplicaUrl = process.env.READ_REPLICA_URL;

const entities = [Auction, Product, Bid, Favorite];
const extra = {
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const typeOrmConfig: TypeOrmModuleOptions = readReplicaUrl
  ? {
      type: 'postgres',
      replication: {
        master: { url: databaseUrl },
        slaves: [{ url: readReplicaUrl }],
      },
      entities,
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      extra,
    }
  : {
      type: 'postgres',
      url: databaseUrl,
      entities,
      synchronize: false,
      logging: process.env.NODE_ENV !== 'production',
      extra,
    };
