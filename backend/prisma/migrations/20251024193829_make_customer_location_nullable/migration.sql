-- DropForeignKey
ALTER TABLE "public"."customers" DROP CONSTRAINT "customers_location_id_fkey";

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "location_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
