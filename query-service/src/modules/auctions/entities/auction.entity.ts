import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

export enum AuctionStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  EXPIRED = 'EXPIRED',
}

@Entity('auctions')
export class Auction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  product_id: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'timestamp' })
  start_time: Date;

  @Column({ type: 'timestamp' })
  end_time: Date;

  @Column({ type: 'int', default: 1 })
  num_winners: number;

  @Column({
    type: 'enum',
    enum: AuctionStatus,
    default: AuctionStatus.ACTIVE,
  })
  status: AuctionStatus;

  @Column({ type: 'uuid', nullable: true })
  winner_user_id: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  winning_bid_amount: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  payment_status: string;

  @Column({ type: 'timestamp', nullable: true })
  payment_deadline: Date;

  @CreateDateColumn()
  created_at: Date;
}
