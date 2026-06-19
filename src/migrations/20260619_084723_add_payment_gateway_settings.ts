import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_payment_gateway_settings_gateway') THEN
            CREATE TYPE "public"."enum_payment_gateway_settings_gateway" AS ENUM('razorpay', 'cashfree');
        END IF;
    END$$;

    CREATE TABLE IF NOT EXISTS "payment_gateway_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "gateway" "enum_payment_gateway_settings_gateway" NOT NULL,
        "display_name" varchar NOT NULL,
        "is_enabled" boolean DEFAULT true NOT NULL,
        "is_test_mode" boolean DEFAULT true NOT NULL,
        "sort_order" numeric DEFAULT 1 NOT NULL,
        "description" varchar,
        "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "payment_gateway_settings_id" integer;
    
    CREATE UNIQUE INDEX IF NOT EXISTS "payment_gateway_settings_gateway_idx" ON "payment_gateway_settings" USING btree ("gateway");
    CREATE INDEX IF NOT EXISTS "payment_gateway_settings_updated_at_idx" ON "payment_gateway_settings" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "payment_gateway_settings_created_at_idx" ON "payment_gateway_settings" USING btree ("created_at");
    
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_payment_gateway_settings_fk') THEN
            ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_gateway_settings_fk" FOREIGN KEY ("payment_gateway_settings_id") REFERENCES "public"."payment_gateway_settings"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
    END$$;
    
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_payment_gateway_settings_i_idx" ON "payload_locked_documents_rels" USING btree ("payment_gateway_settings_id");

    -- Seed default records: Razorpay and Cashfree enabled
    INSERT INTO "payment_gateway_settings" ("gateway", "display_name", "is_enabled", "is_test_mode", "sort_order", "description")
    VALUES 
      ('razorpay', 'Razorpay', true, true, 1, 'Pay securely using cards, UPI, netbanking and wallets.'),
      ('cashfree', 'Cashfree', true, true, 2, 'Pay through Cashfree using UPI, cards and netbanking.')
    ON CONFLICT (gateway) DO NOTHING;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payment_gateway_settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payment_gateway_settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_gateway_settings_fk";
  
  DROP INDEX "payload_locked_documents_rels_payment_gateway_settings_i_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_gateway_settings_id";
  DROP TYPE "public"."enum_payment_gateway_settings_gateway";`)
}
