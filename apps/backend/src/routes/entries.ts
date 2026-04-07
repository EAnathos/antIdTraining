import { type RequestHandler, Router } from 'express'
import multer from 'multer'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { upload } from '../middleware/upload.js'

const entrySchema = z.object({
  taxonLevel: z.enum(['SUBFAMILY', 'GENUS', 'SPECIES']),
  taxonValue: z.string().min(1),
  taxonGenus: z.string().optional().nullable(),
  department: z.string().min(1),
  observedAt: z.coerce.date(),
  biotope: z.string().min(1),
  photoCredit: z.string().min(1),
})

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

function resolveSpeciesSelection(input: z.infer<typeof entrySchema>) {
  const explicitGenus = input.taxonGenus?.trim()
  if (explicitGenus) {
    return {
      genus: explicitGenus,
      species: input.taxonValue.trim(),
    }
  }

  return parseSpeciesTaxonValue(input.taxonValue)
}

async function resolveTaxonSelection(input: z.infer<typeof entrySchema>) {
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

    return {
      taxonId: null,
      taxonLevel: 'SUBFAMILY' as const,
      taxonValue: match.subfamily,
      subfamily: match.subfamily,
      genus: null,
      species: null,
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

    return {
      taxonId: match.id,
      taxonLevel: 'GENUS' as const,
      taxonValue: match.genus,
      subfamily: match.subfamily,
      genus: match.genus,
      species: null,
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

  return {
    taxonId: match.id,
    taxonLevel: 'SPECIES' as const,
    taxonValue: `${match.genus} ${match.species}`,
    subfamily: match.subfamily,
    genus: match.genus,
    species: match.species,
  }
}

export const entriesRouter = Router()

const uploadEntryImages: RequestHandler = (req, res, next) => {
  upload.array('images', 3)(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Chaque image doit faire 8 Mo maximum.' })
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Vous pouvez envoyer 3 images maximum.' })
    }

    if (error) {
      return res.status(400).json({ message: 'Erreur lors de l’upload des images.' })
    }

    return next()
  })
}

entriesRouter.get('/', async (_req, res) => {
  const entries = await prisma.observationEntry.findMany({
    include: { images: true },
    orderBy: { observedAt: 'desc' },
  })
  return res.json(entries)
})

entriesRouter.post('/', uploadEntryImages, async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const taxonSelection = await resolveTaxonSelection(parsed.data)
  if (!taxonSelection) {
    return res.status(400).json({ message: 'Taxon introuvable pour ce niveau.' })
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? []
  const createData: Prisma.ObservationEntryUncheckedCreateInput = {
    ...taxonSelection,
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
  }

  const created = await prisma.observationEntry.create({
    data: {
      ...createData,
      images: {
        create: files.map((file) => ({ imageUrl: `/uploads/${file.filename}` })),
      },
    },
    include: { images: true },
  })

  return res.status(201).json(created)
})

entriesRouter.put('/:id', async (req, res) => {
  const parsed = entrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const taxonSelection = await resolveTaxonSelection(parsed.data)
  if (!taxonSelection) {
    return res.status(400).json({ message: 'Taxon introuvable pour ce niveau.' })
  }

  const updateData: Prisma.ObservationEntryUncheckedUpdateInput = {
    ...taxonSelection,
    department: parsed.data.department,
    observedAt: parsed.data.observedAt,
    biotope: parsed.data.biotope,
    photoCredit: parsed.data.photoCredit,
  }

  try {
    const updated = await prisma.observationEntry.update({
      where: { id: req.params.id },
      data: updateData,
      include: { images: true },
    })

    return res.json(updated)
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ message: 'Entrée introuvable' })
    }

    throw error
  }
})

entriesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.observationEntry.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ message: 'Entrée introuvable' })
    }

    throw error
  }
})
