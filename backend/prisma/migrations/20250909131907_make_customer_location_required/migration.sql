/*
  Warnings:

  - You are about to drop the column `location` on the `customers` table. All the data in the column will be lost.
  - Made the column `location_id` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "public"."customers" DROP CONSTRAINT "customers_location_id_fkey";

-- AlterTable
ALTER TABLE "public"."customers" DROP COLUMN "location",
ALTER COLUMN "location_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
