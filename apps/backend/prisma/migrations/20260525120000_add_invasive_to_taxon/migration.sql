-- Migration: add_invasive_to_taxon

-- Add `invasive` boolean column to Taxon with default false
ALTER TABLE "Taxon" ADD COLUMN IF NOT EXISTS "invasive" boolean NOT NULL DEFAULT false;
