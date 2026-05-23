-- CreateEnum
CREATE TYPE "EntryProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Suggestion" ADD COLUMN     "rejectionMessage" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "EntryProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxonLevel" "TaxonLevel" NOT NULL,
    "taxonValue" TEXT NOT NULL,
    "subfamily" TEXT NOT NULL,
    "genus" TEXT,
    "subgenus" TEXT,
    "species" TEXT,
    "speciesGroup" TEXT,
    "size" TEXT,
    "caste" "Caste" NOT NULL,
    "department" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "biotope" TEXT NOT NULL,
    "photoCredit" TEXT NOT NULL,
    "status" "EntryProposalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "EntryProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryProposalImage" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryProposalImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryProposal_userId_idx" ON "EntryProposal"("userId");

-- CreateIndex
CREATE INDEX "EntryProposal_status_idx" ON "EntryProposal"("status");

-- CreateIndex
CREATE INDEX "EntryProposal_createdAt_idx" ON "EntryProposal"("createdAt");

-- CreateIndex
CREATE INDEX "EntryProposalImage_proposalId_idx" ON "EntryProposalImage"("proposalId");

-- CreateIndex
CREATE INDEX "Suggestion_userId_idx" ON "Suggestion"("userId");

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- AddForeignKey
ALTER TABLE "EntryProposal" ADD CONSTRAINT "EntryProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryProposalImage" ADD CONSTRAINT "EntryProposalImage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EntryProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
