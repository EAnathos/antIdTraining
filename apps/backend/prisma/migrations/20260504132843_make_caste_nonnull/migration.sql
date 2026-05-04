/*
  Warnings:

  - Made the column `caste` on table `ObservationEntry` required. This step will fail if there are existing NULL values in that column.

*/
-- Ensure existing NULL castes are set to a default before adding NOT NULL constraint
UPDATE "ObservationEntry" SET "caste" = 'WORKER' WHERE "caste" IS NULL;

-- Then mark column as NOT NULL
ALTER TABLE "ObservationEntry" ALTER COLUMN "caste" SET NOT NULL;
