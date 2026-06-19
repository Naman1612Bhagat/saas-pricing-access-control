import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const exists1 = await db.execute(sql`
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'enum_payments_gateway' AND e.enumlabel = 'paypal'
  `)
  if (!exists1.rows || exists1.rows.length === 0) {
    await db.execute(sql`ALTER TYPE "public"."enum_payments_gateway" ADD VALUE 'paypal';`)
  }

  const exists2 = await db.execute(sql`
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'enum_payment_gateway_settings_gateway' AND e.enumlabel = 'paypal'
  `)
  if (!exists2.rows || exists2.rows.length === 0) {
    await db.execute(sql`ALTER TYPE "public"."enum_payment_gateway_settings_gateway" ADD VALUE 'paypal';`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ALTER COLUMN "gateway" SET DATA TYPE text;
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DEFAULT 'razorpay'::text;
  DROP TYPE "public"."enum_payments_gateway";
  CREATE TYPE "public"."enum_payments_gateway" AS ENUM('razorpay', 'cashfree');
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DEFAULT 'razorpay'::"public"."enum_payments_gateway";
  ALTER TABLE "payments" ALTER COLUMN "gateway" SET DATA TYPE "public"."enum_payments_gateway" USING "gateway"::"public"."enum_payments_gateway";
  ALTER TABLE "payment_gateway_settings" ALTER COLUMN "gateway" SET DATA TYPE text;
  DROP TYPE "public"."enum_payment_gateway_settings_gateway";
  CREATE TYPE "public"."enum_payment_gateway_settings_gateway" AS ENUM('razorpay', 'cashfree');
  ALTER TABLE "payment_gateway_settings" ALTER COLUMN "gateway" SET DATA TYPE "public"."enum_payment_gateway_settings_gateway" USING "gateway"::"public"."enum_payment_gateway_settings_gateway";`)
}
