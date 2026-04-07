import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const taxonSchema = z.object({
  subfamily: z.string().min(1),
  tribe: z.string().optional().nullable(),
  genus: z.string().min(1),
  subgenus: z.string().optional().nullable(),
  speciesGroup: z.string().optional().nullable(),
  species: z.string().min(1),
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
  }
}

function isPrismaError(error: unknown): error is { code: string } {
  return typeof error === 'object' && error !== null && 'code' in error
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

  return res.json(taxons)
})

taxonsRouter.post('/', async (req, res) => {
  const parsed = taxonSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  try {
    const created = await prisma.taxon.create({ data: normalizeTaxonData(parsed.data) })
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
    const updated = await prisma.taxon.update({
      where: { id: req.params.id },
      data: normalizeTaxonData(parsed.data),
    })

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
