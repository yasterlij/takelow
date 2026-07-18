import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('favorites')
export class Favorite {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid' })
  auction_id: string;

  @CreateDateColumn()
  created_at: Date;
}
