-- Backfill existing shared species profiles into genus-specific copies.
-- Shared profiles (genusValue IS NULL) remain as a fallback for older data.

CREATE TEMP TABLE "_SpeciesProfileBackfillTargets" ON COMMIT DROP AS
SELECT DISTINCT
  sp.id AS old_profile_id,
  sp.level,
  sp.value,
  tg.genus,
  sp.description,
  sp."sizeWorker",
  sp."sizeQueen",
  sp."sizeMale",
  sp."createdAt",
  sp."updatedAt"
FROM "TaxonLevelProfile" sp
JOIN (
  SELECT DISTINCT species, genus
  FROM "Taxon"
  WHERE genus IS NOT NULL AND btrim(genus) <> ''
) tg
  ON tg.species = sp.value
WHERE sp.level = 'SPECIES'
  AND sp."genusValue" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "TaxonLevelProfile" existing
    WHERE existing.level = sp.level
      AND existing.value = sp.value
      AND existing."genusValue" = tg.genus
  );

INSERT INTO "TaxonLevelProfile" (
  id,
  level,
  value,
  "genusValue",
  description,
  "sizeWorker",
  "sizeQueen",
  "sizeMale",
  "createdAt",
  "updatedAt"
)
SELECT
  md5(target.old_profile_id || ':' || target.genus),
  target.level,
  target.value,
  target.genus,
  target.description,
  target."sizeWorker",
  target."sizeQueen",
  target."sizeMale",
  target."createdAt",
  target."updatedAt"
FROM "_SpeciesProfileBackfillTargets" target
ON CONFLICT (id) DO NOTHING;

INSERT INTO "TaxonLevelCriterion" (
  id,
  "profileId",
  label,
  position,
  "createdAt"
)
SELECT
  md5(target.old_profile_id || ':' || target.genus || ':' || criterion.id),
  md5(target.old_profile_id || ':' || target.genus),
  criterion.label,
  criterion.position,
  criterion."createdAt"
FROM "_SpeciesProfileBackfillTargets" target
JOIN "TaxonLevelCriterion" criterion
  ON criterion."profileId" = target.old_profile_id
ON CONFLICT (id) DO NOTHING;
