-- AlterTable
ALTER TABLE "TaxonLevelProfile" ADD COLUMN "genusValue" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "TaxonLevelProfile_level_value_key";

-- DropConstraint
ALTER TABLE "TaxonLevelProfile" DROP CONSTRAINT IF EXISTS "TaxonLevelProfile_level_value_key";

-- CreateIndex
CREATE UNIQUE INDEX "TaxonLevelProfile_level_value_genusValue_key" ON "TaxonLevelProfile"("level", "value", "genusValue");

-- CreateIndex
CREATE INDEX "TaxonLevelProfile_level_value_idx" ON "TaxonLevelProfile"("level", "value");
