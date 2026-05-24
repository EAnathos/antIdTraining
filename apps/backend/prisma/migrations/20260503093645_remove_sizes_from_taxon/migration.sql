/*
  Warnings:

  - You are about to drop the column `sizeMale` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `sizeQueen` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `sizeWorker` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `TaxonLevelProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Taxon" DROP COLUMN IF EXISTS "sizeMale",
DROP COLUMN IF EXISTS "sizeQueen",
DROP COLUMN IF EXISTS "sizeWorker";

-- AlterTable
ALTER TABLE "TaxonLevelProfile" DROP COLUMN IF EXISTS "size",
ADD COLUMN IF NOT EXISTS    "sizeMale" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeQueen" TEXT,
ADD COLUMN IF NOT EXISTS     "sizeWorker" TEXT;
