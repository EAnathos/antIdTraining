-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Caste" AS ENUM ('WORKER', 'QUEEN', 'MALE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "ObservationEntry" ADD COLUMN IF NOT EXISTS    "caste" "Caste";

-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN IF NOT EXISTS     "sizeMale" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeQueen" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeWorker" TEXT;