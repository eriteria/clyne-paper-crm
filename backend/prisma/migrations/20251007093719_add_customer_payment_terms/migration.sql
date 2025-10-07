-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "default_payment_term_days" INTEGER NOT NULL DEFAULT 30;
