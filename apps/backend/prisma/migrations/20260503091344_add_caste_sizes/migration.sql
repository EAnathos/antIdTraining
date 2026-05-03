-- CreateEnum
CREATE TYPE "Caste" AS ENUM ('WORKER', 'QUEEN', 'MALE');

-- AlterTable
ALTER TABLE "ObservationEntry" ADD COLUMN     "caste" "Caste";

-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN     "sizeMale" TEXT,
ADD COLUMN     "sizeQueen" TEXT,
ADD COLUMN     "sizeWorker" TEXT;
