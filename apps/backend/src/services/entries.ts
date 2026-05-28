import { prisma } from '../prisma.js'
import { resolveTaxonSizeDetails } from '../lib/taxonSizes.js'

export type EntryInput = {
  taxonLevel: 'SUBFAMILY' | 'GENUS' | 'SPECIES'
  taxonValue: string
  taxonGenus?: string | null
  subgenus?: string | null
  speciesGroup?: string | null
  size?: string | null
  caste?: 'WORKER' | 'QUEEN' | 'MALE' | null
  department: string
  observedAt: Date
  biotope: string
  photoCredit: string
}

function parseSpeciesTaxonValue(taxonValue: string) {
  const normalized = taxonValue.trim().replace(/\s+/g, ' ')
  const separatorIndex = normalized.indexOf(' ')

  if (separatorIndex <= 0 || separatorIndex >= normalized.length - 1) {
    return null
  }

  const genus = normalized.slice(0, separatorIndex)
  const species = normalized.slice(separatorIndex + 1)
  if (!genus || !species) {
    return null
  }

  return { genus, species }
}

function resolveSpeciesSelection(input: EntryInput) {
  const explicitGenus = input.taxonGenus?.trim()
  if (explicitGenus) {
    return {
      genus: explicitGenus,
      species: input.taxonValue.trim(),
    }
  }

  return parseSpeciesTaxonValue(input.taxonValue)
}

export async function resolveEntryTaxonSelection(input: EntryInput) {
  if (input.taxonLevel === 'SUBFAMILY') {
    const match = await prisma.taxon.findFirst({
      where: {
        subfamily: {
          equals: input.taxonValue.trim(),
          mode: 'insensitive',
        },
      },
      orderBy: { genus: 'asc' },
    })

    if (!match) {
      return null
    }

    const sizeFromProfile = await resolveTaxonSizeDetails(
      { subfamily: match.subfamily, genus: null, species: null },
      input.caste,
    )
    const sizeValue =
      (input.size && input.size.trim()) || sizeFromProfile || null

    return {
      taxonId: null,
      taxonLevel: 'SUBFAMILY' as const,
      taxonValue: match.subfamily,
      subfamily: match.subfamily,
      genus: null,
      species: null,
      size: sizeValue,
    }
  }

  if (input.taxonLevel === 'GENUS') {
    const match = await prisma.taxon.findFirst({
      where: {
        genus: {
          equals: input.taxonValue.trim(),
          mode: 'insensitive',
        },
      },
      orderBy: [{ subfamily: 'asc' }, { species: 'asc' }],
    })

    if (!match) {
      return null
    }

    const sizeFromProfile = await resolveTaxonSizeDetails(
      { subfamily: match.subfamily, genus: match.genus, species: null },
      input.caste,
    )
    const sizeValue =
      (input.size && input.size.trim()) || sizeFromProfile || null

    return {
      taxonId: match.id,
      taxonLevel: 'GENUS' as const,
      taxonValue: match.genus,
      subfamily: match.subfamily,
      genus: match.genus,
      species: null,
      size: sizeValue,
    }
  }

  const speciesSelection = resolveSpeciesSelection(input)
  if (!speciesSelection) {
    return null
  }

  const match = await prisma.taxon.findFirst({
    where: {
      genus: {
        equals: speciesSelection.genus,
        mode: 'insensitive',
      },
      species: {
        equals: speciesSelection.species,
        mode: 'insensitive',
      },
    },
    orderBy: [{ subfamily: 'asc' }, { genus: 'asc' }],
  })

  if (!match) {
    return null
  }

  const sizeFromProfile = await resolveTaxonSizeDetails(
    { subfamily: match.subfamily, genus: match.genus, species: match.species },
    input.caste,
  )
  const sizeValue = (input.size && input.size.trim()) || sizeFromProfile || null

  return {
    taxonId: match.id,
    taxonLevel: 'SPECIES' as const,
    taxonValue: `${match.genus} ${match.species}`,
    subfamily: match.subfamily,
    genus: match.genus,
    species: match.species,
    size: sizeValue,
  }
}
