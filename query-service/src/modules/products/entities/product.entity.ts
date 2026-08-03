import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  image_urls: string[];

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  current_market_price: number;

  @Column({ type: 'varchar', length: 80, default: 'Electronics' })
  category: string;

  @Column({ type: 'varchar', nullable: true })
  brand: string;

  @Column({ type: 'jsonb', nullable: true })
  specs: Record<string, string> | null;
}
