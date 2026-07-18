import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @Index()
  @Column({ type: 'uuid' })
  auction_id: string;

  @Column({ type: 'integer' })
  amount: number;

  @CreateDateColumn()
  bid_time: Date;

  @Column({ type: 'boolean', default: true })
  service_fee_paid: boolean;
}
