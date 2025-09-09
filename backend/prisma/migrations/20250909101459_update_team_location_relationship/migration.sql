/*
  Warnings:

  - You are about to drop the column `location_id` on the `teams` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."teams" DROP CONSTRAINT "teams_location_id_fkey";

-- AlterTable
ALTER TABLE "public"."teams" DROP COLUMN "location_id";

-- CreateTable
CREATE TABLE "public"."team_locations" (
    "teamId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_locations_pkey" PRIMARY KEY ("teamId","locationId")
);

-- AddForeignKey
ALTER TABLE "public"."team_locations" ADD CONSTRAINT "team_locations_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_locations" ADD CONSTRAINT "team_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
