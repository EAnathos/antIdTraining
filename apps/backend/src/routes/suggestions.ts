import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'
import { optionalAuth } from '../middleware/auth.js'

export const suggestionsRouter = Router()

const MAX_SUGGESTIONS_PER_USER = 10

const suggestionSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  message: z.string().min(1),
})

suggestionsRouter.post('/', optionalAuth, async (req, res) => {
  const parsed = suggestionSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  // Check suggestion limit for authenticated users
  if (req.user) {
    const suggestionCount = await prisma.suggestion.count({
      where: { userId: req.user.userId },
    })
    if (suggestionCount >= MAX_SUGGESTIONS_PER_USER) {
      throw new AppError(400, `Limite de ${MAX_SUGGESTIONS_PER_USER} suggestions atteinte.`)
    }
  }

  const created = await prisma.suggestion.create({
    data: {
      userId: req.user?.userId ?? null,
      name: parsed.data.name ?? null,
      email: parsed.data.email ?? null,
      message: parsed.data.message,
    },
  })

  return res.status(201).json(created)
})
