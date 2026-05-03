/*
  Warnings:

  - You are about to drop the column `sizeMale` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `sizeQueen` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `sizeWorker` on the `Taxon` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `TaxonLevelProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Taxon" DROP COLUMN "sizeMale",
DROP COLUMN "sizeQueen",
DROP COLUMN "sizeWorker";

-- AlterTable
ALTER TABLE "TaxonLevelProfile" DROP COLUMN "size",
ADD COLUMN     "sizeMale" TEXT,
ADD COLUMN     "sizeQueen" TEXT,
ADD COLUMN     "sizeWorker" TEXT;
