import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Auction } from "./auction.entity";

export enum WinnerPaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  EXPIRED = "EXPIRED",
}

@Entity("winners")
@Index(["auction_id", "amount"], { unique: true })
@Index(["auction_id", "rank"], { unique: true })
export class Winner {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "uuid" })
  auction_id: string;

  @ManyToOne(() => Auction, { onDelete: "CASCADE" })
  @JoinColumn({ name: "auction_id" })
  auction: Auction;

  @Index()
  @Column({ type: "uuid" })
  user_id: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @Column({ type: "int", default: 1 })
  rank: number;

  @Column({ type: "varchar", length: 20, default: WinnerPaymentStatus.PENDING })
  payment_status: WinnerPaymentStatus;

  @Column({ type: "timestamp", nullable: true })
  payment_deadline: Date;

  @Column({ type: "timestamp", nullable: true })
  notified_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
