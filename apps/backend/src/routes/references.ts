import { ReferenceType } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const doiRegex = /^10\.\d{4,9}\/.+/i

const referenceSchema = z
  .object({
    title: z.string().min(1),
    authors: z.array(z.string().min(1)).optional().default([]),
    description: z.string().optional().nullable(),
    type: z.enum([ReferenceType.WEBSITE, ReferenceType.MYRMECOLOGY]),
    url: z.string().trim().optional().nullable(),
    taxonIds: z.array(z.string().min(1)).optional().default([]),
  })
  .transform((value) => ({
    ...value,
    title: value.title.trim(),
    authors: Array.from(new Set(value.authors.map((author) => author.trim()).filter(Boolean))),
    description: value.description === '' ? null : value.description,
    url: value.url === '' ? null : value.url,
    taxonIds: Array.from(new Set(value.taxonIds)),
  }))
  .superRefine((value, context) => {
    if (!value.url) {
      return
    }

    const isUrl = z.string().url().safeParse(value.url).success
    if (value.type === ReferenceType.WEBSITE && !isUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'URL invalide pour une référence WEBSITE',
      })
      return
    }

    if (value.type === ReferenceType.MYRMECOLOGY && !isUrl && !doiRegex.test(value.url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'La valeur doit être une URL ou un DOI valide',
      })
    }
  })

export const referencesRouter = Router()

const referenceInclude = {
  taxons: {
    select: {
      id: true,
      subfamily: true,
      tribe: true,
      genus: true,
      subgenus: true,
      speciesGroup: true,
      species: true,
    },
    orderBy: [{ subfamily: 'asc' as const }, { genus: 'asc' as const }, { species: 'asc' as const }],
  },
}

async function assertExistingTaxons(taxonIds: string[]) {
  if (taxonIds.length === 0) {
    return
  }

  const count = await prisma.taxon.count({ where: { id: { in: taxonIds } } })
  if (count !== taxonIds.length) {
    throw new Error('Certains taxons sélectionnés sont introuvables')
  }
}

referencesRouter.get('/', async (_req, res) => {
  const references = await prisma.reference.findMany({
    include: referenceInclude,
    orderBy: [{ type: 'asc' }, { title: 'asc' }],
  })
  return res.json(references)
})

referencesRouter.post('/', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  try {
    await assertExistingTaxons(parsed.data.taxonIds)
  } catch {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const { taxonIds, ...referenceData } = parsed.data
  const created = await prisma.reference.create({
    data: {
      ...referenceData,
      taxons: taxonIds.length > 0 ? { connect: taxonIds.map((id) => ({ id })) } : undefined,
    },
    include: referenceInclude,
  })
  return res.status(201).json(created)
})

referencesRouter.put('/:id', async (req, res) => {
  const parsed = referenceSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  try {
    await assertExistingTaxons(parsed.data.taxonIds)
    const { taxonIds, ...referenceData } = parsed.data

    const updated = await prisma.reference.update({
      where: { id: req.params.id },
      data: {
        ...referenceData,
        taxons: { set: taxonIds.map((id) => ({ id })) },
      },
      include: referenceInclude,
    })
    return res.json(updated)
  } catch (error) {
    if (error instanceof Error && error.message === 'Certains taxons sélectionnés sont introuvables') {
      return res.status(400).json({ message: 'Payload invalide' })
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ message: 'Référence introuvable' })
    }

    throw error
  }
})

referencesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.reference.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({ message: 'Référence introuvable' })
    }

    throw error
  }
})
