import { DataSource } from "typeorm";
import { Bid } from "../modules/bidding/entities/bid.entity";
import { Auction } from "../modules/winner/entities/auction.entity";
import { Winner } from "../modules/winner/entities/winner.entity";
import { Product } from "../modules/admin/entities/product.entity";

export default new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgresql://admin:secret@localhost:5432/takelow_db",
  entities: [Bid, Auction, Winner, Product],
  migrations: ["src/migrations/*.ts"],
  logging: true,
});
