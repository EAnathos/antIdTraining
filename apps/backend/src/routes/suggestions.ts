import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'

export const suggestionsRouter = Router()

const suggestionSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  message: z.string().min(1),
})

suggestionsRouter.post('/', async (req, res) => {
  const parsed = suggestionSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const created = await prisma.suggestion.create({
    data: {
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      message: parsed.data.message,
    },
  })

  return res.status(201).json(created)
})
