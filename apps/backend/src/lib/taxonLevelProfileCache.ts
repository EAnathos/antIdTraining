import { prisma } from '../prisma.js'

export type TaxonLevelProfileLevel = 'SUBFAMILY' | 'GENUS' | 'SUBGENUS' | 'SPECIES_GROUP' | 'SPECIES'

export type CachedTaxonLevelProfile = {
  level: TaxonLevelProfileLevel
  value: string
  genusValue: string | null
  description: string | null
  sizeWorker: string | null
  sizeQueen: string | null
  sizeMale: string | null
  criteria: string[]
}

type CacheSnapshot = {
  expiresAt: number
  profiles: Map<string, CachedTaxonLevelProfile>
}

const CACHE_TTL_MS = 60_000
let cache: CacheSnapshot | null = null

function key(level: TaxonLevelProfileLevel, value: string, genusValue: string | null) {
  return `${level}:${value}:${genusValue ?? ''}`
}

export function invalidateTaxonLevelProfileCache() {
  cache = null
}

export async function getTaxonLevelProfileCache() {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.profiles
  }

  const profiles = await prisma.taxonLevelProfile.findMany({
    select: {
      level: true,
      value: true,
      genusValue: true,
      description: true,
      sizeWorker: true,
      sizeQueen: true,
      sizeMale: true,
      criteria: {
        orderBy: { position: 'asc' },
        select: { label: true },
      },
    },
  })

  const map = new Map<string, CachedTaxonLevelProfile>()
  for (const profile of profiles) {
    map.set(key(profile.level, profile.value, profile.genusValue), {
      level: profile.level,
      value: profile.value,
      genusValue: profile.genusValue,
      description: profile.description,
      sizeWorker: profile.sizeWorker,
      sizeQueen: profile.sizeQueen,
      sizeMale: profile.sizeMale,
      criteria: profile.criteria.map((criterion) => criterion.label),
    })
  }

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    profiles: map,
  }

  return map
}

export async function getTaxonLevelProfile(
  level: TaxonLevelProfileLevel,
  value: string,
  genusValue: string | null = null,
) {
  const profiles = await getTaxonLevelProfileCache()
  return profiles.get(key(level, value, genusValue)) ?? null
}

export async function resolveTaxonWorkerSize(entry: { species?: string | null; genus?: string | null; subfamily: string }) {
  if (entry.species && entry.genus) {
    const speciesProfile = await getTaxonLevelProfile('SPECIES', entry.species, entry.genus)
    if (speciesProfile?.sizeWorker) return speciesProfile.sizeWorker

    const sharedSpeciesProfile = await getTaxonLevelProfile('SPECIES', entry.species, null)
    if (sharedSpeciesProfile?.sizeWorker) return sharedSpeciesProfile.sizeWorker
  }

  if (entry.genus) {
    const genusProfile = await getTaxonLevelProfile('GENUS', entry.genus, null)
    if (genusProfile?.sizeWorker) return genusProfile.sizeWorker
  }

  if (entry.subfamily) {
    const subfamilyProfile = await getTaxonLevelProfile('SUBFAMILY', entry.subfamily, null)
    if (subfamilyProfile?.sizeWorker) return subfamilyProfile.sizeWorker
  }

  return null
}