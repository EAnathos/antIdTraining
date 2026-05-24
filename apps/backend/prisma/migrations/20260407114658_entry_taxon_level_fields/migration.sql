-- CreateEnum
CREATE TYPE IF NOT EXISTS "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE IF NOT EXISTS "ReferenceType" AS ENUM ('WEBSITE', 'MYRMECOLOGY');

-- CreateEnum
CREATE TYPE IF NOT EXISTS "TaxonLevel" AS ENUM ('SUBFAMILY', 'GENUS', 'SPECIES');

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Taxon" (
    "id" TEXT NOT NULL,
    "subfamily" TEXT NOT NULL,
    "tribe" TEXT,
    "genus" TEXT NOT NULL,
    "subgenus" TEXT,
    "speciesGroup" TEXT,
    "species" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Taxon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaxonLevelProfile" (
    "id" TEXT NOT NULL,
    "level" "TaxonLevel" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonLevelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaxonLevelCriterion" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxonLevelCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ObservationEntry" (
    "id" TEXT NOT NULL,
    "taxonId" TEXT,
    "taxonLevel" "TaxonLevel" NOT NULL,
    "taxonValue" TEXT NOT NULL,
    "subfamily" TEXT NOT NULL,
    "genus" TEXT,
    "species" TEXT,
    "department" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "biotope" TEXT NOT NULL,
    "photoCredit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservationEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EntryImage" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Reference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReferenceType" NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Taxon_subfamily_idx" ON "Taxon"("subfamily");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Taxon_genus_idx" ON "Taxon"("genus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Taxon_species_idx" ON "Taxon"("species");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Taxon_subfamily_tribe_genus_species_key" ON "Taxon"("subfamily", "tribe", "genus", "species");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonLevelProfile_level_idx" ON "TaxonLevelProfile"("level");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonLevelProfile_value_idx" ON "TaxonLevelProfile"("value");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TaxonLevelProfile_level_value_key" ON "TaxonLevelProfile"("level", "value");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonLevelCriterion_profileId_idx" ON "TaxonLevelCriterion"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxonLevelCriterion_profileId_position_idx" ON "TaxonLevelCriterion"("profileId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_taxonLevel_idx" ON "ObservationEntry"("taxonLevel");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_taxonValue_idx" ON "ObservationEntry"("taxonValue");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_subfamily_idx" ON "ObservationEntry"("subfamily");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_genus_idx" ON "ObservationEntry"("genus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_species_idx" ON "ObservationEntry"("species");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_department_idx" ON "ObservationEntry"("department");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ObservationEntry_observedAt_idx" ON "ObservationEntry"("observedAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonLevelCriterion_profileId_fkey') THEN
        ALTER TABLE "TaxonLevelCriterion" ADD CONSTRAINT "TaxonLevelCriterion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TaxonLevelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ObservationEntry_taxonId_fkey') THEN
        ALTER TABLE "ObservationEntry" ADD CONSTRAINT "ObservationEntry_taxonId_fkey" FOREIGN KEY ("taxonId") REFERENCES "Taxon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EntryImage_entryId_fkey') THEN
        ALTER TABLE "EntryImage" ADD CONSTRAINT "EntryImage_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ObservationEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
