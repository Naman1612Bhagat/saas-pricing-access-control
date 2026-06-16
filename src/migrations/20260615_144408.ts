import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_gateway" AS ENUM('razorpay');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('created', 'paid', 'failed');
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"plan_id" integer NOT NULL,
  	"amount" numeric NOT NULL,
  	"currency" varchar DEFAULT 'INR' NOT NULL,
  	"gateway" "enum_payments_gateway" DEFAULT 'razorpay' NOT NULL,
  	"razorpay_order_id" varchar NOT NULL,
  	"razorpay_payment_id" varchar,
  	"razorpay_signature" varchar,
  	"status" "enum_payments_status" DEFAULT 'created' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");
  CREATE INDEX "payments_plan_idx" ON "payments" USING btree ("plan_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  DROP TYPE "public"."enum_payments_gateway";
  DROP TYPE "public"."enum_payments_status";`)
}
