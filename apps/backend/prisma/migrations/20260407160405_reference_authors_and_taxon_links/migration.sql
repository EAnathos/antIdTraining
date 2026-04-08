-- AlterTable
ALTER TABLE "Reference" ADD COLUMN     "authors" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "_ReferenceToTaxon" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ReferenceToTaxon_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ReferenceToTaxon_B_index" ON "_ReferenceToTaxon"("B");

-- AddForeignKey
ALTER TABLE "_ReferenceToTaxon" ADD CONSTRAINT "_ReferenceToTaxon_A_fkey" FOREIGN KEY ("A") REFERENCES "Reference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ReferenceToTaxon" ADD CONSTRAINT "_ReferenceToTaxon_B_fkey" FOREIGN KEY ("B") REFERENCES "Taxon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
