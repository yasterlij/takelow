import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastPaymentUpdateToAuctions1784728502088 implements MigrationInterface {
  name = "AddLastPaymentUpdateToAuctions1784728502088";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" ADD "last_payment_update" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auctions" DROP COLUMN "last_payment_update"`,
    );
  }
}
