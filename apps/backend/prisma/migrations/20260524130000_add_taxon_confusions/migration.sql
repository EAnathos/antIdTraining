-- CreateTable
CREATE TABLE IF NOT EXISTS "TaxonConfusion" (
    "id" TEXT NOT NULL,
    "taxonId" TEXT NOT NULL,
    "confusedTaxonId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonConfusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TaxonConfusion_taxonId_confusedTaxonId_key" ON "TaxonConfusion"("taxonId", "confusedTaxonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonConfusion_taxonId_idx" ON "TaxonConfusion"("taxonId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonConfusion_confusedTaxonId_idx" ON "TaxonConfusion"("confusedTaxonId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonConfusion_taxonId_fkey') THEN
        ALTER TABLE "TaxonConfusion" ADD CONSTRAINT "TaxonConfusion_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonConfusion_confusedTaxonId_fkey') THEN
        ALTER TABLE "TaxonConfusion" ADD CONSTRAINT "TaxonConfusion_confusedTaxonId_fkey" FOREIGN KEY ("confusedTaxonId") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;