import type { TaxonLevel } from '@prisma/client'
import { prisma } from '../prisma.js'

export type CachedGameEntry = {
  id: string
  taxonLevel: TaxonLevel
  subfamily: string
  genus: string | null
  species: string | null
  size: string | null
  department: string
  observedAt: Date
  biotope: string
  photoCredit: string
  images: Array<{ imageUrl: string }>
}

type CacheSnapshot = {
  expiresAt: number
  entries: CachedGameEntry[]
}

const CACHE_TTL_MS = 60_000
let cache: CacheSnapshot | null = null

export function invalidateGameEntryCache() {
  cache = null
}

export async function getGameEntriesCache() {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.entries
  }

  const entries = await prisma.observationEntry.findMany({
    select: {
      id: true,
      taxonLevel: true,
      subfamily: true,
      genus: true,
      species: true,
      size: true,
      department: true,
      observedAt: true,
      biotope: true,
      photoCredit: true,
      images: {
        select: { imageUrl: true },
      },
    },
  })

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    entries,
  }

  return entries
}