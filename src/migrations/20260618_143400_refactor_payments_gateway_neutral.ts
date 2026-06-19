import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  const columnExists = await db.execute(sql`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_order_id'
  `)
  
  if (columnExists.rows && columnExists.rows.length > 0) {
    payload.logger.info("Columns already exist, performing data migration only.")
    await db.execute(sql`
      UPDATE "payments" 
      SET "gateway_order_id" = COALESCE("gateway_order_id", "razorpay_order_id"), 
          "gateway_payment_id" = COALESCE("gateway_payment_id", "razorpay_payment_id"), 
          "gateway_signature" = COALESCE("gateway_signature", "razorpay_signature")
      WHERE "gateway_order_id" IS NULL;
    `)
    return
  }

  await db.execute(sql`
   ALTER TABLE "payments" ALTER COLUMN "razorpay_order_id" DROP NOT NULL;
   ALTER TABLE "payments" ADD COLUMN "gateway_order_id" varchar;
   ALTER TABLE "payments" ADD COLUMN "gateway_payment_id" varchar;
   ALTER TABLE "payments" ADD COLUMN "gateway_signature" varchar;
   
   -- Migrate existing Razorpay data to the new gateway-neutral columns
   UPDATE "payments" 
   SET "gateway_order_id" = "razorpay_order_id", 
       "gateway_payment_id" = "razorpay_payment_id", 
       "gateway_signature" = "razorpay_signature";
   
   -- Enforce NOT NULL constraint on gateway_order_id now that it is populated
   ALTER TABLE "payments" ALTER COLUMN "gateway_order_id" SET NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" ALTER COLUMN "razorpay_order_id" SET NOT NULL;
   ALTER TABLE "payments" DROP COLUMN "gateway_order_id";
   ALTER TABLE "payments" DROP COLUMN "gateway_payment_id";
   ALTER TABLE "payments" DROP COLUMN "gateway_signature";`)
}
