-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "last_order_date" TIMESTAMP(3),
ADD COLUMN     "location" TEXT,
ADD COLUMN     "onboarding_date" TIMESTAMP(3),
ADD COLUMN     "relationship_manager_name" TEXT;
