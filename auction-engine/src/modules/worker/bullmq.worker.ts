import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Redis } from "ioredis";
import { InjectRedis } from "../common/redis.decorator";

const BATCH_SIZE = 50;

@Injectable()
@Processor("incoming-bids")
export class BullMqWorker extends WorkerHost {
  private readonly logger = new Logger(BullMqWorker.name);
  private batchBuffer: Map<string, any[]> = new Map();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { auction_id, encrypted_amount, user_id, bid_time, ticket_number } = job.data;

    const bufferKey = `batch:${auction_id}`;
    if (!this.batchBuffer.has(bufferKey)) {
      this.batchBuffer.set(bufferKey, []);
    }

    const batch = this.batchBuffer.get(bufferKey)!;
    batch.push({ auction_id, amount: 0, encrypted_amount: encrypted_amount || "", user_id, bid_time, ticket_number: ticket_number || "" });

    if (batch.length >= BATCH_SIZE) {
      await this.flushBatch(bufferKey);
    }

    return { queued: true };
  }

  private async flushBatch(bufferKey: string): Promise<void> {
    const batch = this.batchBuffer.get(bufferKey);
    if (!batch || batch.length === 0) return;

    const auctionId = batch[0].auction_id;
    this.logger.debug(`Flushing ${batch.length} bids for auction ${auctionId}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const placeholders = batch
        .map(
          (_, i) =>
            `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`,
        )
        .join(", ");

      const values: any[] = [];
      batch.forEach((b) => {
        values.push(b.auction_id);
        values.push(b.amount);
        values.push(b.user_id);
        values.push(b.bid_time || new Date().toISOString());
        values.push(b.ticket_number || "");
        values.push(b.encrypted_amount || "");
      });

      await queryRunner.manager.query(
        `INSERT INTO bids (auction_id, amount, user_id, bid_time, ticket_number, encrypted_amount) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        values,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Batch insert failed for auction ${auctionId}: ${error.message}`,
      );
      throw error;
    } finally {
      await queryRunner.release();
      this.batchBuffer.delete(bufferKey);
    }
  }

  async flushAuction(auctionId: string): Promise<void> {
    const bufferKey = `batch:${auctionId}`;
    if (this.batchBuffer.has(bufferKey)) {
      this.logger.log(`Flushing buffer for auction ${auctionId}`);
      await this.flushBatch(bufferKey);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async flushAllBatches(): Promise<void> {
    if (this.batchBuffer.size === 0) return;
    const keys = Array.from(this.batchBuffer.keys());
    for (const key of keys) {
      await this.flushBatch(key);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    for (const [key] of this.batchBuffer) {
      await this.flushBatch(key);
    }
  }
}
