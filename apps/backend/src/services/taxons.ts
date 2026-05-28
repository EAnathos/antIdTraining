import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import {
  getTaxonCatalog,
  invalidateTaxonCatalogCache,
} from '../lib/taxonCatalog.js'
import { invalidateTaxonLevelProfileCache } from '../lib/taxonLevelProfileCache.js'
import { invalidateGameEntryCacheSafely } from '../lib/gameEntryCache.js'
import { buildTaxonSizeMaps } from '../lib/taxonSizes.js'
import { AppError } from '../lib/errors.js'

const levelDetailSchema = z.object({
  description: z.string().optional().nullable(),
  sizeWorker: z.string().optional().nullable(),
  sizeQueen: z.string().optional().nullable(),
  sizeMale: z.string().optional().nullable(),
  criteria: z.array(z.string()).optional(),
})

const taxonConfusionSchema = z.object({
  confusedTaxonId: z.string().min(1),
  detail: z.string().min(1),
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
        departments: z.array(z.string()).optional(),
      })
      .optional()
      .nullable(),
    invasive: z.boolean().optional(),
    confusions: z.array(taxonConfusionSchema).optional(),
    levelDetails: z
      .object({
        subfamily: levelDetailSchema.optional(),
        genus: levelDetailSchema.optional(),
        subgenus: levelDetailSchema.optional(),
        speciesGroup: levelDetailSchema.optional(),
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

type NormalizedTaxonConfusion = {
  confusedTaxonId: string
  detail: string
}

function capitalizeWords(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-'])\p{L}/gu, (match) => match.toUpperCase())
}

function normalizeTaxonData(data: TaxonInput) {
  const distribution = data.distribution?.departments ?? []
  const confusions = (data.confusions ?? [])
    .map((confusion) => ({
      confusedTaxonId: confusion.confusedTaxonId.trim(),
      detail: confusion.detail.trim(),
    }))
    .filter((confusion) => confusion.confusedTaxonId && confusion.detail)

  return {
    subfamily: capitalizeWords(data.subfamily),
    tribe: data.tribe?.trim() ? capitalizeWords(data.tribe) : null,
    genus: capitalizeWords(data.genus),
    subgenus: data.subgenus?.trim() ? capitalizeWords(data.subgenus) : null,
    speciesGroup: data.speciesGroup?.trim()
      ? data.speciesGroup.trim().toLowerCase()
      : null,
    species: data.species.trim().toLowerCase(),
    swarmingStartMonth: data.swarmingStartMonth ?? null,
    swarmingEndMonth: data.swarmingEndMonth ?? null,
    distribution:
      distribution.length > 0
        ? {
            departments: distribution.filter((r) => r && typeof r === 'string'),
          }
        : null,
    levelDetails: data.levelDetails,
    invasive: data.invasive ?? false,
    confusions,
  }
}

function buildTaxonWriteDataFromNormalized(
  normalized: ReturnType<typeof normalizeTaxonData>,
): Prisma.TaxonUncheckedCreateInput {
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
    invasive: normalized.invasive,
  }
}

async function syncLevelProfiles(
  normalized: ReturnType<typeof normalizeTaxonData>,
) {
  await upsertLevelProfile(
    'SUBFAMILY',
    normalized.subfamily,
    normalized.levelDetails?.subfamily,
  )
  await upsertLevelProfile(
    'GENUS',
    normalized.genus,
    normalized.levelDetails?.genus,
  )
  if (normalized.subgenus) {
    await upsertLevelProfile(
      'SUBGENUS',
      normalized.subgenus,
      normalized.levelDetails?.subgenus,
      normalized.genus,
    )
  }
  if (normalized.speciesGroup) {
    await upsertLevelProfile(
      'SPECIES_GROUP',
      normalized.speciesGroup,
      normalized.levelDetails?.speciesGroup,
      normalized.genus,
    )
  }
  await upsertLevelProfile(
    'SPECIES',
    normalized.species,
    normalized.levelDetails?.species,
    normalized.genus,
  )
}

async function persistTaxonWithProfiles<T extends { id: string }>(
  writeTaxon: () => Promise<T>,
  normalized: ReturnType<typeof normalizeTaxonData>,
) {
  const savedTaxon = await writeTaxon()
  await syncLevelProfiles(normalized)
  await syncTaxonConfusions(savedTaxon.id, normalized.confusions)
  invalidateTaxonCatalogCache()
  invalidateTaxonLevelProfileCache()
  invalidateGameEntryCacheSafely('taxon updated')
  return savedTaxon
}

function normalizeLevelDetail(detail?: z.infer<typeof levelDetailSchema>) {
  if (!detail) return null
  return {
    description: detail.description?.trim() || null,
    sizeWorker: detail.sizeWorker?.trim() || null,
    sizeQueen: detail.sizeQueen?.trim() || null,
    sizeMale: detail.sizeMale?.trim() || null,
    criteria: (detail.criteria ?? [])
      .map((criterion) => criterion.trim())
      .filter(Boolean),
  }
}

type TaxonLevelProfileRecord = {
  description: string | null
  sizeWorker: string | null
  sizeQueen: string | null
  sizeMale: string | null
  criteria: { label: string }[]
  level: 'SUBFAMILY' | 'GENUS' | 'SPECIES' | 'SUBGENUS' | 'SPECIES_GROUP'
  value: string
  genusValue: string | null
}

type TaxonLevelDetail = {
  description: string | null
  sizeWorker: string | null
  sizeQueen: string | null
  sizeMale: string | null
  criteria: { label: string }[]
}

type TaxonConfusionRecord = {
  id: string
  detail: string
  confusedTaxon: {
    id: string
    subfamily: string
    tribe: string | null
    genus: string
    subgenus: string | null
    speciesGroup: string | null
    species: string
  }
}

function emptyLevelDetail(): TaxonLevelDetail {
  return {
    description: null,
    sizeWorker: null,
    sizeQueen: null,
    sizeMale: null,
    criteria: [],
  }
}

function mapLevelDetail(
  profile?: TaxonLevelProfileRecord | null,
  derivedSize?: {
    sizeWorker?: string | null
    sizeQueen?: string | null
    sizeMale?: string | null
  },
): TaxonLevelDetail {
  if (!profile) return emptyLevelDetail()

  return {
    description: profile.description ?? null,
    sizeWorker: derivedSize?.sizeWorker ?? profile.sizeWorker ?? null,
    sizeQueen: derivedSize?.sizeQueen ?? profile.sizeQueen ?? null,
    sizeMale: derivedSize?.sizeMale ?? profile.sizeMale ?? null,
    criteria: profile.criteria ?? [],
  }
}

async function upsertLevelProfile(
  level: 'SUBFAMILY' | 'GENUS' | 'SPECIES' | 'SUBGENUS' | 'SPECIES_GROUP',
  value: string,
  detail?: z.infer<typeof levelDetailSchema>,
  genusValue?: string | null,
) {
  const normalizedDetail = normalizeLevelDetail(detail)
  if (!normalizedDetail) return

  const existing = genusValue
    ? await prisma.taxonLevelProfile.findUnique({
        where: { level_value_genusValue: { level, value, genusValue } },
      })
    : await prisma.taxonLevelProfile.findFirst({
        where: { level, value, genusValue: null },
      })

  if (!existing) {
    await prisma.taxonLevelProfile.create({
      data: {
        level,
        value,
        genusValue: genusValue ?? null,
        description: normalizedDetail.description,
        sizeWorker: normalizedDetail.sizeWorker,
        sizeQueen: normalizedDetail.sizeQueen,
        sizeMale: normalizedDetail.sizeMale,
        criteria: {
          create: normalizedDetail.criteria.map((label, index) => ({
            label,
            position: index,
          })),
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
        create: normalizedDetail.criteria.map((label, index) => ({
          label,
          position: index,
        })),
      },
    },
  })
}

async function syncTaxonConfusions(
  taxonId: string,
  confusions: NormalizedTaxonConfusion[],
) {
  await prisma.taxonConfusion.deleteMany({
    where: {
      OR: [{ taxonId }, { confusedTaxonId: taxonId }],
    },
  })

  const uniqueConfusions = Array.from(
    new Map(
      confusions
        .filter((confusion) => confusion.confusedTaxonId !== taxonId)
        .map((confusion) => [confusion.confusedTaxonId, confusion]),
    ).values(),
  )

  if (uniqueConfusions.length === 0) {
    return
  }

  await prisma.taxonConfusion.createMany({
    data: uniqueConfusions.flatMap((confusion) => [
      {
        taxonId,
        confusedTaxonId: confusion.confusedTaxonId,
        detail: confusion.detail,
      },
      {
        taxonId: confusion.confusedTaxonId,
        confusedTaxonId: taxonId,
        detail: confusion.detail,
      },
    ]),
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
    orderBy: [{ subgenus: 'asc' }, { speciesGroup: 'asc' }],
  })

  return {
    subgenus: match?.subgenus ?? null,
    speciesGroup: match?.speciesGroup ?? null,
  }
}

export async function listTaxons(params: {
  level?: unknown
  q?: unknown
  offset?: unknown
}) {
  const level = String(params.level ?? '').toLowerCase()
  const rawQuery = String(params.q ?? '')
  if (rawQuery.length > 120) {
    throw new AppError(
      400,
      'Le paramètre q est trop long (120 caractères max).',
    )
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
  const subgenera = [
    ...new Set(
      taxons.map((taxon) => taxon.subgenus).filter(Boolean) as string[],
    ),
  ]
  const speciesGroups = [
    ...new Set(
      taxons.map((taxon) => taxon.speciesGroup).filter(Boolean) as string[],
    ),
  ]

  const profiles = (await prisma.taxonLevelProfile.findMany({
    where: {
      OR: [
        { level: 'SUBFAMILY', value: { in: subfamilies } },
        { level: 'GENUS', value: { in: genera } },
        { level: 'SUBGENUS', value: { in: subgenera } },
        { level: 'SPECIES_GROUP', value: { in: speciesGroups } },
        {
          level: 'SPECIES',
          OR: [
            { genusValue: null, value: { in: species } },
            { genusValue: { in: genera }, value: { in: species } },
          ],
        },
      ],
    },
    include: {
      criteria: {
        orderBy: { position: 'asc' },
      },
    },
  })) as any[]

  const taxonIds = taxons.map((taxon) => taxon.id)
  const taxonIdSet = new Set(taxonIds)
  const taxonConfusions = await prisma.taxonConfusion.findMany({
    where: {
      OR: [
        { taxonId: { in: taxonIds } },
        { confusedTaxonId: { in: taxonIds } },
      ],
    },
    include: { taxon: true, confusedTaxon: true },
    orderBy: [{ taxonId: 'asc' }, { createdAt: 'asc' }],
  })

  type TaxonConfusionDisplay = {
    id: string
    detail: string
    confusedTaxon: {
      id: string
      subfamily: string
      tribe: string | null
      genus: string
      subgenus: string | null
      speciesGroup: string | null
      species: string
    }
  }

  const confusionsByTaxonId = new Map<string, TaxonConfusionDisplay[]>()
  const addConfusion = (
    taxonId: string,
    otherTaxon: (typeof taxonConfusions)[number]['taxon'],
    sourceId: string,
    detail: string,
  ) => {
    const current = confusionsByTaxonId.get(taxonId) ?? []
    if (
      current.some(
        (item) =>
          item.confusedTaxon.id === otherTaxon.id && item.detail === detail,
      )
    ) {
      return
    }

    current.push({
      id: sourceId,
      detail,
      confusedTaxon: {
        id: otherTaxon.id,
        subfamily: otherTaxon.subfamily,
        tribe: otherTaxon.tribe,
        genus: otherTaxon.genus,
        subgenus: otherTaxon.subgenus,
        speciesGroup: otherTaxon.speciesGroup,
        species: otherTaxon.species,
      },
    })
    confusionsByTaxonId.set(taxonId, current)
  }

  for (const confusion of taxonConfusions) {
    if (taxonIdSet.has(confusion.taxonId)) {
      addConfusion(
        confusion.taxonId,
        confusion.confusedTaxon,
        confusion.id,
        confusion.detail,
      )
    }

    if (taxonIdSet.has(confusion.confusedTaxonId)) {
      addConfusion(
        confusion.confusedTaxonId,
        confusion.taxon,
        confusion.id,
        confusion.detail,
      )
    }
  }

  const profileByKey = new Map<string, TaxonLevelProfileRecord>(
    profiles.map((profile) => {
      if (
        profile.level === 'SPECIES' ||
        profile.level === 'SUBGENUS' ||
        profile.level === 'SPECIES_GROUP'
      ) {
        return [
          `${profile.level}:${profile.genusValue ?? ''}:${profile.value}`,
          profile,
        ]
      }
      return [`${profile.level}:${profile.value}`, profile]
    }),
  )
  const derivedSizes = await buildTaxonSizeMaps()
  const getProfile = (key: string) => profileByKey.get(key)

  const items = taxons.map((taxon) => ({
    ...taxon,
    confusions: (confusionsByTaxonId.get(taxon.id) ?? []).map((confusion) => ({
      id: confusion.id,
      detail: confusion.detail,
      confusedTaxon: {
        id: confusion.confusedTaxon.id,
        subfamily: confusion.confusedTaxon.subfamily,
        tribe: confusion.confusedTaxon.tribe,
        genus: confusion.confusedTaxon.genus,
        subgenus: confusion.confusedTaxon.subgenus,
        speciesGroup: confusion.confusedTaxon.speciesGroup,
        species: confusion.confusedTaxon.species,
      },
    })),
    levelDetails: {
      subfamily: mapLevelDetail(
        getProfile(`SUBFAMILY:${taxon.subfamily}`),
        derivedSizes.subfamilySizes.get(taxon.subfamily),
      ),
      genus: mapLevelDetail(
        getProfile(`GENUS:${taxon.genus}`),
        derivedSizes.genusSizes.get(taxon.genus),
      ),
      subgenus: taxon.subgenus
        ? mapLevelDetail(
            getProfile(`SUBGENUS:${taxon.genus}:${taxon.subgenus}`) ??
              getProfile(`SUBGENUS::${taxon.subgenus}`),
          )
        : null,
      species: mapLevelDetail(
        getProfile(`SPECIES:${taxon.genus}:${taxon.species}`) ??
          getProfile(`SPECIES::${taxon.species}`),
      ),
      speciesGroup: taxon.speciesGroup
        ? mapLevelDetail(
            getProfile(`SPECIES_GROUP:${taxon.genus}:${taxon.speciesGroup}`) ??
              getProfile(`SPECIES_GROUP::${taxon.speciesGroup}`),
          )
        : null,
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
  const normalized = normalizeTaxonData(input)
  return persistTaxonWithProfiles(
    () =>
      prisma.taxon.create({
        data: buildTaxonWriteDataFromNormalized(normalized),
      }),
    normalized,
  )
}

export async function updateTaxon(id: string, input: TaxonInput) {
  const normalized = normalizeTaxonData(input)
  return persistTaxonWithProfiles(
    () =>
      prisma.taxon.update({
        where: { id },
        data: buildTaxonWriteDataFromNormalized(normalized),
      }),
    normalized,
  )
}

export async function deleteTaxon(id: string) {
  const deleted = await prisma.taxon.delete({ where: { id } })
  invalidateTaxonCatalogCache()
  invalidateTaxonLevelProfileCache()
  invalidateGameEntryCacheSafely('taxon deleted')
  return deleted
}
