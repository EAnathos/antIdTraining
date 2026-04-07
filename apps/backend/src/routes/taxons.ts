import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const levelDetailSchema = z.object({
  description: z.string().optional().nullable(),
  criteria: z.array(z.string()).optional(),
})

const taxonSchema = z.object({
  subfamily: z.string().min(1),
  tribe: z.string().optional().nullable(),
  genus: z.string().min(1),
  subgenus: z.string().optional().nullable(),
  speciesGroup: z.string().optional().nullable(),
  species: z.string().min(1),
  levelDetails: z
    .object({
      subfamily: levelDetailSchema.optional(),
      genus: levelDetailSchema.optional(),
      species: levelDetailSchema.optional(),
    })
    .optional(),
})

function capitalizeWords(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-'])\p{L}/gu, (match) => match.toUpperCase())
}

function normalizeTaxonData(data: z.infer<typeof taxonSchema>) {
  return {
    subfamily: capitalizeWords(data.subfamily),
    tribe: data.tribe?.trim() ? capitalizeWords(data.tribe) : null,
    genus: capitalizeWords(data.genus),
    subgenus: data.subgenus?.trim() ? capitalizeWords(data.subgenus) : null,
    speciesGroup: data.speciesGroup?.trim() ? data.speciesGroup.trim().toLowerCase() : null,
    species: data.species.trim().toLowerCase(),
    levelDetails: data.levelDetails,
  }
}

function isPrismaError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error
}

function normalizeLevelDetail(detail?: z.infer<typeof levelDetailSchema>) {
  if (!detail) return null
  return {
    description: detail.description?.trim() || null,
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
      criteria: {
        deleteMany: {},
        create: normalizedDetail.criteria.map((label, index) => ({ label, position: index })),
      },
    },
  })
}

export const taxonsRouter = Router()

taxonsRouter.get('/', async (req, res) => {
  const level = String(req.query.level ?? '').toLowerCase()
  const q = String(req.query.q ?? '').trim()

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

  const taxons = await prisma.taxon.findMany({
    where,
    orderBy: [{ subfamily: 'asc' }, { genus: 'asc' }, { species: 'asc' }],
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

  return res.json(
    taxons.map((taxon) => ({
      ...taxon,
      levelDetails: {
        subfamily: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)
          ? {
              description: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)?.description ?? null,
              criteria: profileByKey.get(`SUBFAMILY:${taxon.subfamily}`)?.criteria ?? [],
            }
          : { description: null, criteria: [] },
        genus: profileByKey.get(`GENUS:${taxon.genus}`)
          ? {
              description: profileByKey.get(`GENUS:${taxon.genus}`)?.description ?? null,
              criteria: profileByKey.get(`GENUS:${taxon.genus}`)?.criteria ?? [],
            }
          : { description: null, criteria: [] },
        species: profileByKey.get(`SPECIES:${taxon.species}`)
          ? {
              description: profileByKey.get(`SPECIES:${taxon.species}`)?.description ?? null,
              criteria: profileByKey.get(`SPECIES:${taxon.species}`)?.criteria ?? [],
            }
          : { description: null, criteria: [] },
      },
    })),
  )
})

taxonsRouter.post('/', async (req, res) => {
  const parsed = taxonSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  try {
    const normalized = normalizeTaxonData(parsed.data)
    const created = await prisma.taxon.create({
      data: {
        subfamily: normalized.subfamily,
        tribe: normalized.tribe,
        genus: normalized.genus,
        subgenus: normalized.subgenus,
        speciesGroup: normalized.speciesGroup,
        species: normalized.species,
      },
    })

    await upsertLevelProfile('SUBFAMILY', normalized.subfamily, normalized.levelDetails?.subfamily)
    await upsertLevelProfile('GENUS', normalized.genus, normalized.levelDetails?.genus)
    await upsertLevelProfile('SPECIES', normalized.species, normalized.levelDetails?.species)

    return res.status(201).json(created)
  } catch (error) {
    if (isPrismaError(error) && error.code === 'P2002') {
      return res.status(409).json({ message: 'Ce taxon existe déjà' })
    }

    throw error
  }
})

taxonsRouter.put('/:id', async (req, res) => {
  const parsed = taxonSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  try {
    const normalized = normalizeTaxonData(parsed.data)
    const updated = await prisma.taxon.update({
      where: { id: req.params.id },
      data: {
        subfamily: normalized.subfamily,
        tribe: normalized.tribe,
        genus: normalized.genus,
        subgenus: normalized.subgenus,
        speciesGroup: normalized.speciesGroup,
        species: normalized.species,
      },
    })

    await upsertLevelProfile('SUBFAMILY', normalized.subfamily, normalized.levelDetails?.subfamily)
    await upsertLevelProfile('GENUS', normalized.genus, normalized.levelDetails?.genus)
    await upsertLevelProfile('SPECIES', normalized.species, normalized.levelDetails?.species)

    return res.json(updated)
  } catch (error) {
    if (isPrismaError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Taxon introuvable' })
    }

    if (isPrismaError(error) && error.code === 'P2002') {
      return res.status(409).json({ message: 'Ce taxon existe déjà' })
    }

    throw error
  }
})

taxonsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.taxon.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (isPrismaError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Taxon introuvable' })
    }

    throw error
  }
})
