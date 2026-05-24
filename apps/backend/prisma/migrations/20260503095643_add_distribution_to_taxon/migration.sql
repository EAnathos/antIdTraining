-- AlterTable
ALTER TABLE "Taxon" ADD COLUMN IF NOT EXISTS     "distribution" JSONB;
