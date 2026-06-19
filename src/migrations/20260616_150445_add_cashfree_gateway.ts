import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const exists = await db.execute(sql`
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'enum_payments_gateway' AND e.enumlabel = 'cashfree'
  `)
  if (exists.rows && exists.rows.length > 0) {
    payload.logger.info("Enum label 'cashfree' already exists, skipping.")
    return
  }
  await db.execute(sql`
   ALTER TYPE "public"."enum_payments_gateway" ADD VALUE 'cashfree';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ALTER COLUMN "gateway" SET DATA TYPE text;
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DEFAULT 'razorpay'::text;
  DROP TYPE "public"."enum_payments_gateway";
  CREATE TYPE "public"."enum_payments_gateway" AS ENUM('razorpay');
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DEFAULT 'razorpay'::"public"."enum_payments_gateway";
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DATA TYPE "public"."enum_payments_gateway" USING "gateway"::"public"."enum_payments_gateway";`)
}
