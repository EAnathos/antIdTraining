import { prisma } from '../prisma.js'

type TaxonCatalogItem = {
  subfamily: string
  genus: string
  species: string
}

type TaxonCatalogSnapshot = {
  expiresAt: number
  items: TaxonCatalogItem[]
  subfamilies: string[]
}

let cache: TaxonCatalogSnapshot | null = null
const CACHE_TTL_MS = 60_000

export function invalidateTaxonCatalogCache() {
  cache = null
}

export async function getTaxonCatalog() {
  if (cache && cache.expiresAt > Date.now()) {
    return cache
  }

  const items = await prisma.taxon.findMany({
    select: {
      subfamily: true,
      genus: true,
      species: true,
    },
    orderBy: [{ subfamily: 'asc' }, { genus: 'asc' }, { species: 'asc' }],
  })

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    items,
    subfamilies: Array.from(new Set(items.map((item) => item.subfamily))),
  }

  return cache
}
