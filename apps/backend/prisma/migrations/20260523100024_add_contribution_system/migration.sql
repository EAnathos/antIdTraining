-- CreateEnum
CREATE TYPE IF NOT EXISTS "EntryProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Suggestion" ADD COLUMN IF NOT EXISTS     "rejectionMessage" TEXT,
ADD COLUMN IF NOT EXISTS     "userId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "EntryProposal" (
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
CREATE TABLE IF NOT EXISTS "EntryProposalImage" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryProposalImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EntryProposal_userId_idx" ON "EntryProposal"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EntryProposal_status_idx" ON "EntryProposal"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EntryProposal_createdAt_idx" ON "EntryProposal"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EntryProposalImage_proposalId_idx" ON "EntryProposalImage"("proposalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Suggestion_userId_idx" ON "Suggestion"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EntryProposal_userId_fkey') THEN
        ALTER TABLE "EntryProposal" ADD CONSTRAINT "EntryProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EntryProposalImage_proposalId_fkey') THEN
        ALTER TABLE "EntryProposalImage" ADD CONSTRAINT "EntryProposalImage_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "EntryProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Suggestion_userId_fkey') THEN
        ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;
