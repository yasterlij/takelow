import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateWinnersTable1785050000000 implements MigrationInterface {
  name = "CreateWinnersTable1785050000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "winners",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "uuid",
          },
          {
            name: "auction_id",
            type: "uuid",
          },
          {
            name: "user_id",
            type: "uuid",
          },
          {
            name: "amount",
            type: "decimal",
            precision: 12,
            scale: 2,
          },
          {
            name: "rank",
            type: "int",
            default: 1,
          },
          {
            name: "payment_status",
            type: "varchar",
            length: "20",
            default: "'PENDING'",
          },
          {
            name: "payment_deadline",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "notified_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "winners",
      new TableIndex({
        name: "IDX_winners_auction_amount",
        columnNames: ["auction_id", "amount"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "winners",
      new TableIndex({
        name: "IDX_winners_auction_rank",
        columnNames: ["auction_id", "rank"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "winners",
      new TableIndex({
        name: "IDX_winners_auction_id",
        columnNames: ["auction_id"],
      }),
    );

    await queryRunner.createIndex(
      "winners",
      new TableIndex({
        name: "IDX_winners_user_id",
        columnNames: ["user_id"],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("winners");
  }
}
