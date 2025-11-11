-- AlterTable
ALTER TABLE "waybills" ADD COLUMN     "destination_customer_id" TEXT;

-- AddForeignKey
ALTER TABLE "waybills" ADD CONSTRAINT "waybills_destination_customer_id_fkey" FOREIGN KEY ("destination_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
