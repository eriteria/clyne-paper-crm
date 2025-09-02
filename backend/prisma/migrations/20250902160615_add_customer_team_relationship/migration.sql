-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "team_id" TEXT;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "location_names" TEXT[];

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
