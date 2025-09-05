/*
  Warnings:

  - You are about to drop the column `location_names` on the `teams` table. All the data in the column will be lost.
  - You are about to drop the column `region_id` on the `teams` table. All the data in the column will be lost.
  - Added the required column `location_id` to the `teams` table without a default value. This is not possible if the table is not empty.

*/

-- First, add the new column as nullable
ALTER TABLE "public"."teams" ADD COLUMN "location_id" TEXT;
ALTER TABLE "public"."teams" ADD COLUMN "description" TEXT;

-- Get the first location ID to use as default for existing teams
-- Update existing teams to use the first location temporarily
UPDATE "public"."teams" 
SET "location_id" = (
  SELECT "id" FROM "public"."locations" LIMIT 1
) 
WHERE "location_id" IS NULL;

-- Now make the column required
ALTER TABLE "public"."teams" ALTER COLUMN "location_id" SET NOT NULL;

-- Drop the old foreign key and columns
ALTER TABLE "public"."teams" DROP CONSTRAINT "teams_region_id_fkey";
ALTER TABLE "public"."teams" DROP COLUMN "location_names";
ALTER TABLE "public"."teams" DROP COLUMN "region_id";

-- Add the new foreign key
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
