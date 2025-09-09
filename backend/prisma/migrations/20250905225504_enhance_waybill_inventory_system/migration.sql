/*
  Warnings:

  - You are about to drop the column `location` on the `inventory_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sku,location_id]` on the table `inventory_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `location_id` to the `inventory_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `waybill_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `waybill_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `waybill_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location_id` to the `waybills` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."WaybillStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REVIEW');

-- CreateEnum
CREATE TYPE "public"."WaybillItemStatus" AS ENUM ('PENDING', 'MATCHED', 'NEW_PRODUCT', 'PROCESSED');

-- DropForeignKey
ALTER TABLE "public"."waybill_items" DROP CONSTRAINT "waybill_items_inventory_item_id_fkey";

-- AlterTable
ALTER TABLE "public"."inventory_items" DROP COLUMN "location",
ADD COLUMN     "location_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."waybill_items" ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "sku" TEXT NOT NULL,
ADD COLUMN     "status" "public"."WaybillItemStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "unit" TEXT NOT NULL,
ALTER COLUMN "inventory_item_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."waybills" ADD COLUMN     "location_id" TEXT NOT NULL,
ADD COLUMN     "processed_at" TIMESTAMP(3),
ADD COLUMN     "processed_by" TEXT,
ADD COLUMN     "status" "public"."WaybillStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_sku_location_id_key" ON "public"."inventory_items"("sku", "location_id");

-- AddForeignKey
ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waybills" ADD CONSTRAINT "waybills_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."waybill_items" ADD CONSTRAINT "waybill_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
