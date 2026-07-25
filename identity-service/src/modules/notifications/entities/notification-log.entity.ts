import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationChannel {
  PUSH = 'PUSH',
  INAPP = 'INAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid', nullable: true })
  auction_id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'varchar', length: 20, default: NotificationChannel.PUSH })
  channel: NotificationChannel;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
