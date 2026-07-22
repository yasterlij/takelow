import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullMqWorker } from './bullmq.worker';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'incoming-bids',
    }),
    TypeOrmModule.forFeature([]),
  ],
  providers: [BullMqWorker],
  exports: [BullMqWorker],
})
export class WorkerModule {}
