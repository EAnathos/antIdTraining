import type { TaxonLevel } from '@prisma/client'
import { prisma } from '../prisma.js'
import { decryptSensitiveText } from './encryption.js'
import { logger } from './logger.js'

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
  swarmingStartMonth: number | null
  swarmingEndMonth: number | null
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

export function invalidateGameEntryCacheSafely(reason?: string) {
  try {
    invalidateGameEntryCache()
  } catch (error) {
    logger.error(
      { err: error, reason },
      'Failed to invalidate game entry cache',
    )
  }
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
      caste: true,
      department: true,
      observedAt: true,
      biotope: true,
      photoCredit: true,
      images: {
        select: { imageUrl: true },
      },
      taxon: {
        select: {
          swarmingStartMonth: true,
          swarmingEndMonth: true,
        },
      },
    },
  })

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    entries: entries.map((entry) => {
      let photoCredit = entry.photoCredit
      try {
        photoCredit = (decryptSensitiveText(entry.photoCredit) ??
          entry.photoCredit) as string
      } catch (error) {
        logger.warn(
          { err: error, entryId: entry.id },
          'Impossible de déchiffrer photoCredit, valeur brute utilisée',
        )
      }
      return {
        ...entry,
        photoCredit,
        swarmingStartMonth: entry.taxon?.swarmingStartMonth ?? null,
        swarmingEndMonth: entry.taxon?.swarmingEndMonth ?? null,
      }
    }),
  }

  return cache.entries
}
