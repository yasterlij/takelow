import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("bids")
export class Bid {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "uuid" })
  user_id: string;

  @Index()
  @Column({ type: "uuid" })
  auction_id: string;

  @Index(["auction_id", "amount"])
  @Index(["auction_id", "user_id"])
  @Column({ type: "decimal", precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn()
  bid_time: Date;

  @Column({ type: "boolean", default: true })
  service_fee_paid: boolean;
}
