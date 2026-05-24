-- CreateEnum
CREATE TYPE IF NOT EXISTS "Caste" AS ENUM ('WORKER', 'QUEEN', 'MALE');

-- AlterTable
ALTER TABLE "ObservationEntry" ADD COLUMN IF NOT EXISTS    "caste" "Caste";

-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN IF NOT EXISTS     "sizeMale" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeQueen" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeWorker" TEXT;
