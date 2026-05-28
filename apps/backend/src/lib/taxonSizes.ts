import { prisma } from '../prisma.js'

export type TaxonSizeDetails = {
  sizeWorker: string | null
  sizeQueen: string | null
  sizeMale: string | null
}

type SizeBounds = {
  min: number
  max: number
}

function parseSizeBounds(value: string | null | undefined): SizeBounds | null {
  if (!value) return null

  const match = value
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*mm$/i)
  if (!match) return null

  const first = Number.parseFloat(match[1].replace(',', '.'))
  const second = match[2]
    ? Number.parseFloat(match[2].replace(',', '.'))
    : first

  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return null
  }

  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  }
}

function formatSizeBounds(bounds: SizeBounds | null): string | null {
  if (!bounds) return null

  const formatter = new Intl.NumberFormat('fr-FR', {
    useGrouping: false,
    maximumFractionDigits: 2,
  })

  const min = formatter.format(bounds.min)
  const max = formatter.format(bounds.max)

  return bounds.min === bounds.max ? `${min} mm` : `${min}-${max} mm`
}

function mergeSizeValues(
  values: Array<string | null | undefined>,
): string | null {
  const bounds = values
    .map(parseSizeBounds)
    .filter((value): value is SizeBounds => Boolean(value))

  if (!bounds.length) return null

  return formatSizeBounds({
    min: Math.min(...bounds.map((value) => value.min)),
    max: Math.max(...bounds.map((value) => value.max)),
  })
}

function buildSizeDetails(
  profile: {
    sizeWorker: string | null
    sizeQueen: string | null
    sizeMale: string | null
  } | null,
): TaxonSizeDetails {
  return {
    sizeWorker: profile?.sizeWorker ?? null,
    sizeQueen: profile?.sizeQueen ?? null,
    sizeMale: profile?.sizeMale ?? null,
  }
}

export async function buildTaxonSizeMaps() {
  const allTaxons = await prisma.taxon.findMany({
    select: {
      subfamily: true,
      genus: true,
      species: true,
    },
  })

  const speciesValues = [...new Set(allTaxons.map((taxon) => taxon.species))]
  const speciesProfiles = speciesValues.length
    ? await prisma.taxonLevelProfile.findMany({
        where: {
          level: 'SPECIES',
          value: { in: speciesValues },
        },
        select: {
          value: true,
          sizeWorker: true,
          sizeQueen: true,
          sizeMale: true,
        },
      })
    : []

  const speciesByValue = new Map<string, TaxonSizeDetails>()
  for (const profile of speciesProfiles) {
    speciesByValue.set(profile.value, buildSizeDetails(profile))
  }

  const genusGroups = new Map<string, Array<TaxonSizeDetails>>()
  const subfamilyGroups = new Map<string, Array<TaxonSizeDetails>>()

  for (const taxon of allTaxons) {
    const speciesSize = speciesByValue.get(taxon.species)
    if (!speciesSize) continue

    const genusItems = genusGroups.get(taxon.genus) ?? []
    genusItems.push(speciesSize)
    genusGroups.set(taxon.genus, genusItems)

    const subfamilyItems = subfamilyGroups.get(taxon.subfamily) ?? []
    subfamilyItems.push(speciesSize)
    subfamilyGroups.set(taxon.subfamily, subfamilyItems)
  }

  const genusSizes = new Map<string, TaxonSizeDetails>()
  for (const [genus, items] of genusGroups) {
    genusSizes.set(genus, {
      sizeWorker: mergeSizeValues(items.map((item) => item.sizeWorker)),
      sizeQueen: mergeSizeValues(items.map((item) => item.sizeQueen)),
      sizeMale: mergeSizeValues(items.map((item) => item.sizeMale)),
    })
  }

  const subfamilySizes = new Map<string, TaxonSizeDetails>()
  for (const [subfamily, items] of subfamilyGroups) {
    subfamilySizes.set(subfamily, {
      sizeWorker: mergeSizeValues(items.map((item) => item.sizeWorker)),
      sizeQueen: mergeSizeValues(items.map((item) => item.sizeQueen)),
      sizeMale: mergeSizeValues(items.map((item) => item.sizeMale)),
    })
  }

  return {
    speciesSizes: speciesByValue,
    genusSizes,
    subfamilySizes,
  }
}

export async function resolveTaxonSizeDetails(
  entry: { species?: string | null; genus?: string | null; subfamily: string },
  caste?: 'WORKER' | 'QUEEN' | 'MALE' | null,
) {
  const sizeKey =
    caste === 'QUEEN'
      ? 'sizeQueen'
      : caste === 'MALE'
        ? 'sizeMale'
        : 'sizeWorker'

  if (entry.species && entry.genus) {
    const profile = await prisma.taxonLevelProfile.findUnique({
      where: {
        level_value_genusValue: {
          level: 'SPECIES',
          value: entry.species,
          genusValue: entry.genus,
        },
      },
      select: { sizeWorker: true, sizeQueen: true, sizeMale: true },
    })

    if (profile) {
      const details = buildSizeDetails(profile)
      return details[sizeKey]
    }

    const sharedProfile = await prisma.taxonLevelProfile.findFirst({
      where: { level: 'SPECIES', value: entry.species, genusValue: null },
      select: { sizeWorker: true, sizeQueen: true, sizeMale: true },
    })

    const details = buildSizeDetails(sharedProfile)
    return details[sizeKey]
  }

  const where = entry.genus
    ? {
        genus: {
          equals: entry.genus,
          mode: 'insensitive' as const,
        },
      }
    : {
        subfamily: {
          equals: entry.subfamily,
          mode: 'insensitive' as const,
        },
      }

  const taxa = await prisma.taxon.findMany({
    where,
    select: { species: true },
  })

  const speciesValues = [...new Set(taxa.map((taxon) => taxon.species))]
  if (!speciesValues.length) {
    return null
  }

  const profiles = await prisma.taxonLevelProfile.findMany({
    where: {
      level: 'SPECIES',
      value: { in: speciesValues },
    },
    select: { sizeWorker: true, sizeQueen: true, sizeMale: true },
  })

  const derivedSize = mergeSizeValues(
    profiles.map((profile) => profile[sizeKey]),
  )
  if (derivedSize) {
    return derivedSize
  }

  const storedProfile = await prisma.taxonLevelProfile.findFirst({
    where: entry.genus
      ? {
          level: 'GENUS',
          value: entry.genus,
          genusValue: null,
        }
      : {
          level: 'SUBFAMILY',
          value: entry.subfamily,
          genusValue: null,
        },
    select: { sizeWorker: true, sizeQueen: true, sizeMale: true },
  })

  return buildSizeDetails(storedProfile)[sizeKey]
}
