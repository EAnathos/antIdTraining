-- AlterTable
ALTER TABLE "Reference" ADD COLUMN IF NOT EXISTS     "authors" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE IF NOT EXISTS "_ReferenceToTaxon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReferenceToTaxon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "_ReferenceToTaxon_B_index" ON "_ReferenceToTaxon"("B");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ReferenceToTaxon_A_fkey') THEN
        ALTER TABLE "_ReferenceToTaxon" ADD CONSTRAINT "_ReferenceToTaxon_A_fkey" FOREIGN KEY ("A") REFERENCES "Reference"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_ReferenceToTaxon_B_fkey') THEN
        ALTER TABLE "_ReferenceToTaxon" ADD CONSTRAINT "_ReferenceToTaxon_B_fkey" FOREIGN KEY ("B") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
