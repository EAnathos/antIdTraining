import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { getTaxonCatalog, invalidateTaxonCatalogCache } from '../lib/taxonCatalog.js'
import { AppError } from '../lib/errors.js'

const levelDetailSchema = z.object({
  description: z.string().optional().nullable(),
  sizeWorker: z.string().optional().nullable(),
  sizeQueen: z.string().optional().nullable(),
  sizeMale: z.string().optional().nullable(),
  criteria: z.array(z.string()).optional(),
})

export const taxonSchema = z
  .object({
    subfamily: z.string().min(1),
    tribe: z.string().optional().nullable(),
    genus: z.string().min(1),
    subgenus: z.string().optional().nullable(),
    speciesGroup: z.string().optional().nullable(),
    species: z.string().min(1),
    swarmingStartMonth: z.number().int().min(1).max(12).optional().nullable(),
    swarmingEndMonth: z.number().int().min(1).max(12).optional().nullable(),
    distribution: z
      .object({
        regions: z.array(z.string()).optional(),
      })
      .optional()
      .nullable(),
    levelDetails: z
      .object({
        subfamily: levelDetailSchema.optional(),
        genus: levelDetailSchema.optional(),
        species: levelDetailSchema.optional(),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    const startMonth = value.swarmingStartMonth ?? null
    const endMonth = value.swarmingEndMonth ?? null

    if (startMonth !== null && endMonth !== null && startMonth > endMonth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['swarmingEndMonth'],
        message: 'La fin de période doit être postérieure au début de période.',
      })
    }
  })

type TaxonInput = z.infer<typeof taxonSchema>

function capitalizeWords(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-'])\p{L}/gu, (match) => match.toUpperCase())
}

function normalizeTaxonData(data: TaxonInput) {
  return {
    subfamily: capitalizeWords(data.subfamily),
    tribe: data.tribe?.trim() ? capitalizeWords(data.tribe) : null,
    genus: capitalizeWords(data.genus),
    subgenus: data.subgenus?.trim() ? capitalizeWords(data.subgenus) : null,
    speciesGroup: data.speciesGroup?.trim() ? data.speciesGroup.trim().toLowerCase() : null,
    species: data.species.trim().toLowerCase(),
    swarmingStartMonth: data.swarmingStartMonth ?? null,
    swarmingEndMonth: data.swarmingEndMonth ?? null,
    distribution: data.distribution?.regions
      ? { regions: data.distribution.regions.filter((r) => r && typeof r === 'string') }
      : null,
    levelDetails: data.levelDetails,
  }
}

function buildTaxonWriteData(data: TaxonInput): Prisma.TaxonUncheckedCreateInput {
  const normalized = normalizeTaxonData(data)

  return {
    subfamily: normalized.subfamily,
    tribe: normalized.tribe,
    genus: normalized.genus,
    subgenus: normalized.subgenus,
    speciesGroup: normalized.speciesGroup,
    species: normalized.species,
    swarmingStartMonth: normalized.swarmingStartMonth,
    swarmingEndMonth: normalized.swarmingEndMonth,
    distribution: normalized.distribution as any,
  }
}

function normalizeLevelDetail(detail?: z.infer<typeof levelDetailSchema>) {
  if (!detail) return null
  return {
    description: detail.description?.trim() || null,
    sizeWorker: detail.sizeWorker?.trim() || null,
    sizeQueen: detail.sizeQueen?.trim() || null,
    sizeMale: detail.sizeMale?.trim() || null,
    criteria: (detail.criteria ?? []).map((criterion) => criterion.trim()).filter(Boolean),
  }
}

async function upsertLevelProfile(level: 'SUBFAMILY' | 'GENUS' | 'SPECIES', value: string, detail?: z.infer<typeof levelDetailSchema>) {
  const normalizedDetail = normalizeLevelDetail(detail)
  if (!normalizedDetail) return

  const existing = await prisma.taxonLevelProfile.findUnique({
    where: { level_value: { level, value } },
  })

  if (!existing) {
    await prisma.taxonLevelProfile.create({
      data: {
        level,
        value,
        description: normalizedDetail.description,
        sizeWorker: normalizedDetail.sizeWorker,
        sizeQueen: normalizedDetail.sizeQueen,
        sizeMale: normalizedDetail.sizeMale,
        criteria: {
          create: normalizedDetail.criteria.map((label, index) => ({ label, position: index })),
        },
      },
    })
    return
  }

  await prisma.taxonLevelProfile.update({
    where: { id: existing.id },
    data: {
      description: normalizedDetail.description,
      sizeWorker: normalizedDetail.sizeWorker,
      sizeQueen: normalizedDetail.sizeQueen,
      sizeMale: normalizedDetail.sizeMale,
      criteria: {
        deleteMany: {},
        create: normalizedDetail.criteria.map((label, index) => ({ label, position: index })),
      },
    },
  })
}

export async function listSubfamilies() {
  const taxonCatalog = await getTaxonCatalog()
  return taxonCatalog.subfamilies
}

export async function listGenera(subfamily: string) {
  const normalizedSubfamily = subfamily.trim()
  if (!normalizedSubfamily) {
    throw new AppError(400, 'Le paramètre subfamily est requis.')
  }

  const genera = await prisma.taxon.findMany({
    where: {
      subfamily: {
        equals: normalizedSubfamily,
        mode: 'insensitive',
      },
    },
    select: { genus: true },
    distinct: ['genus'],
    orderBy: { genus: 'asc' },
  })

  return genera.map((item) => item.genus)
}

export async function listSpecies(genus: string) {
  const normalizedGenus = genus.trim()
  if (!normalizedGenus) {
    throw new AppError(400, 'Le paramètre genus est requis.')
  }

  const species = await prisma.taxon.findMany({
    where: {
      genus: {
        equals: normalizedGenus,
        mode: 'insensitive',
      },
    },
    select: { species: true },
    distinct: ['species'],
    orderBy: { species: 'asc' },
  })

  return species.map((item) => item.species)
}

export async function listSubgenera(genus: string) {
  const normalizedGenus = genus.trim()
  if (!normalizedGenus) {
    throw new AppError(400, 'Le paramètre genus est requis.')
  }

  const subgenera = await prisma.taxon.findMany({
    where: {
      genus: {
        equals: normalizedGenus,
        mode: 'insensitive',
      },
    },
    select: { subgenus: true },
    distinct: ['subgenus'],
    orderBy: { subgenus: 'asc' },
  })

  return subgenera.map((item) => item.subgenus).filter(Boolean) as string[]
}

export async function listSpeciesGroups(genus: string) {
  const normalizedGenus = genus.trim()
  if (!normalizedGenus) {
    throw new AppError(400, 'Le paramètre genus est requis.')
  }

  const groups = await prisma.taxon.findMany({
    where: {
      genus: {
        equals: normalizedGenus,
        mode: 'insensitive',
      },
    },
    select: { speciesGroup: true },
    distinct: ['speciesGroup'],
    orderBy: { speciesGroup: 'asc' },
  })

  return groups.map((item) => item.speciesGroup).filter(Boolean) as string[]
}

export async function getSpeciesMetadata(genus: string, species: string) {
  const normalizedGenus = genus.trim()
  const normalizedSpecies = species.trim()

  if (!normalizedGenus) {
    throw new AppError(400, 'Le paramètre genus est requis.')
  }

  if (!normalizedSpecies) {
    throw new AppError(400, 'Le paramètre species est requis.')
  }

  const match = await prisma.taxon.findFirst({
    where: {
      genus: {
        equals: normalizedGenus,
        mode: 'insensitive',
      },
      species: {
        equals: normalizedSpecies,
        mode: 'insensitive',
      },
    },
    select: {
      subgenus: true,
      speciesGroup: true,
    },
    orderBy: [
      { subgenus: 'asc' },
      { speciesGroup: 'asc' },
    ],
  })

  return {
    subgenus: match?.subgenus ?? null,
    speciesGroup: match?.speciesGroup ?? null,
  }
}

export async function listTaxons(params: { level?: unknown; q?: unknown; offset?: unknown }) {
  const level = String(params.level ?? '').toLowerCase()
  const rawQuery = String(params.q ?? '')
  if (rawQuery.length > 120) {
    throw new AppError(400, 'Le paramètre q est trop long (120 caractères max).')
  }

  const q = rawQuery.trim()
  const rawOffsetValue = params.offset
  if (rawOffsetValue !== undefined && !/^\d+$/.test(String(rawOffsetValue))) {
    throw new AppError(400, 'Le paramètre offset est invalide.')
  }

  const offset = Number(rawOffsetValue ?? 0)
  const limit = 50

  const where = q
    ? level === 'subfamily'
      ? { subfamily: { contains: q, mode: 'insensitive' as const } }
      : level === 'genus'
        ? { genus: { contains: q, mode: 'insensitive' as const } }
        : level === 'species'
          ? { species: { contains: q, mode: 'insensitive' as const } }
          : {
              OR: [
                { subfamily: { contains: q, mode: 'insensitive' as const } },
                { genus: { contains: q, mode: 'insensitive' as const } },
                { species: { contains: q, mode: 'insensitive' as const } },
              ],
            }
    : undefined

  const total = await prisma.taxon.count({ where })

  const taxons = await prisma.taxon.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy: [
      { subfamily: 'asc' },
      { tribe: 'asc' },
      { genus: 'asc' },
      { subgenus: 'asc' },
      { speciesGroup: 'asc' },
      { species: 'asc' },
    ],
  })

  const subfamilies = [...new Set(taxons.map((taxon) => taxon.subfamily))]
  const genera = [...new Set(taxons.map((taxon) => taxon.genus))]
  const species = [...new Set(taxons.map((taxon) => taxon.species))]

  const profiles = await prisma.taxonLevelProfile.findMany({
    where: {
      OR: [
        { level: 'SUBFAMILY', value: { in: subfamilies } },
        { level: 'GENUS', value: { in: genera } },
        { level: 'SPECIES', value: { in: species } },
      ],
    },
    include: {
      criteria: {
        orderBy: { position: 'asc' },
      },
    },
  })

  const profileByKey = new Map(profiles.map((profile) => [`${profile.level}:${profile.value}`, profile]))

  const items = taxons.map((taxon) => ({
    ...taxon,
    levelDetails: {
      subfamily: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)
        ? {
            description: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)?.description ?? null,
            sizeWorker: null,
            sizeQueen: null,
            sizeMale: null,
            criteria: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)?.criteria ?? [],
          }
        : { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
      genus: profileByKey.get(`GENUS:${taxon.genus}`)
        ? {
            description: profileByKey.get(`GENUS:${taxon.genus}`)?.description ?? null,
            sizeWorker: profileByKey.get(`GENUS:${taxon.genus}`)?.sizeWorker ?? null,
            sizeQueen: profileByKey.get(`GENUS:${taxon.genus}`)?.sizeQueen ?? null,
            sizeMale: profileByKey.get(`GENUS:${taxon.genus}`)?.sizeMale ?? null,
            criteria: profileByKey.get(`GENUS:${taxon.genus}`)?.criteria ?? [],
          }
        : { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
      species: profileByKey.get(`SPECIES:${taxon.species}`)
        ? {
            description: profileByKey.get(`SPECIES:${taxon.species}`)?.description ?? null,
            sizeWorker: profileByKey.get(`SPECIES:${taxon.species}`)?.sizeWorker ?? null,
            sizeQueen: profileByKey.get(`SPECIES:${taxon.species}`)?.sizeQueen ?? null,
            sizeMale: profileByKey.get(`SPECIES:${taxon.species}`)?.sizeMale ?? null,
            criteria: profileByKey.get(`SPECIES:${taxon.species}`)?.criteria ?? [],
          }
        : { description: null, sizeWorker: null, sizeQueen: null, sizeMale: null, criteria: [] },
    },
  }))

  const nextOffset = offset + items.length
  const hasMore = nextOffset < total

  return {
    items,
    offset,
    limit,
    nextOffset,
    hasMore,
    total,
  }
}

export async function createTaxon(input: TaxonInput) {
  const created = await prisma.taxon.create({
    data: buildTaxonWriteData(input),
  })

  const normalized = normalizeTaxonData(input)
  await upsertLevelProfile('SUBFAMILY', normalized.subfamily, normalized.levelDetails?.subfamily)
  await upsertLevelProfile('GENUS', normalized.genus, normalized.levelDetails?.genus)
  await upsertLevelProfile('SPECIES', normalized.species, normalized.levelDetails?.species)

  invalidateTaxonCatalogCache()
  return created
}

export async function updateTaxon(id: string, input: TaxonInput) {
  const updated = await prisma.taxon.update({
    where: { id },
    data: buildTaxonWriteData(input),
  })

  const normalized = normalizeTaxonData(input)
  await upsertLevelProfile('SUBFAMILY', normalized.subfamily, normalized.levelDetails?.subfamily)
  await upsertLevelProfile('GENUS', normalized.genus, normalized.levelDetails?.genus)
  await upsertLevelProfile('SPECIES', normalized.species, normalized.levelDetails?.species)

  invalidateTaxonCatalogCache()
  return updated
}

export async function deleteTaxon(id: string) {
  await prisma.taxon.delete({ where: { id } })
  invalidateTaxonCatalogCache()
}
