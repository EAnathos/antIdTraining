import { ReferenceType } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'

const doiRegex = /^10\.\d{4,9}\/.+/i

export const referenceSchema = z
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
        message: 'URL invalide pour une référence WEBSITE.',
      })
      return
    }

    if (value.type === ReferenceType.MYRMECOLOGY && !isUrl && !doiRegex.test(value.url)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['url'],
        message: 'La valeur doit être une URL ou un DOI valide.',
      })
    }
  })

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

type ReferenceInput = z.infer<typeof referenceSchema>

async function assertExistingTaxons(taxonIds: string[]) {
  if (taxonIds.length === 0) {
    return
  }

  const count = await prisma.taxon.count({ where: { id: { in: taxonIds } } })
  if (count !== taxonIds.length) {
    throw new AppError(400, 'Certains taxons sélectionnés sont introuvables.')
  }
}

export async function listReferences() {
  return prisma.reference.findMany({
    include: referenceInclude,
    orderBy: [{ type: 'asc' }, { title: 'asc' }],
  })
}

export async function createReference(input: ReferenceInput) {
  await assertExistingTaxons(input.taxonIds)
  const { taxonIds, ...referenceData } = input

  return prisma.reference.create({
    data: {
      ...referenceData,
      taxons: taxonIds.length > 0 ? { connect: taxonIds.map((id) => ({ id })) } : undefined,
    },
    include: referenceInclude,
  })
}

export async function updateReference(id: string, input: ReferenceInput) {
  await assertExistingTaxons(input.taxonIds)
  const { taxonIds, ...referenceData } = input

  return prisma.reference.update({
    where: { id },
    data: {
      ...referenceData,
      taxons: { set: taxonIds.map((taxonId) => ({ id: taxonId })) },
    },
    include: referenceInclude,
  })
}

export async function deleteReference(id: string) {
  return prisma.reference.delete({ where: { id } })
}
