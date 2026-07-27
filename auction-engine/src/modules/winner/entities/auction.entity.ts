import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "../../admin/entities/product.entity";

export enum AuctionStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  EXPIRED = "EXPIRED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  EXPIRED = "EXPIRED",
}

@Entity("auctions")
export class Auction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "uuid" })
  product_id: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "timestamp" })
  start_time: Date;

  @Column({ type: "timestamp" })
  end_time: Date;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  min_bid: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  max_bid: number;

  @Column({ type: "int", default: 1 })
  num_winners: number;

  @Index(["status", "end_time"])
  @Index(["status", "payment_status", "winner_user_id"])
  @Column({
    type: "enum",
    enum: AuctionStatus,
    default: AuctionStatus.ACTIVE,
  })
  status: AuctionStatus;

  @Column({ type: "uuid", nullable: true })
  winner_user_id: string;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  winning_bid_amount: number;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    nullable: true,
  })
  payment_status: PaymentStatus;

  @Column({ type: "timestamp", nullable: true })
  payment_deadline: Date;

  @Column({ type: "timestamp", nullable: true })
  last_payment_update: Date;

  @CreateDateColumn()
  created_at: Date;
}
