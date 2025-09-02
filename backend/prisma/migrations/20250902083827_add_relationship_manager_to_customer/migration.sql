-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "relationship_manager_id" TEXT;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_relationship_manager_id_fkey" FOREIGN KEY ("relationship_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
