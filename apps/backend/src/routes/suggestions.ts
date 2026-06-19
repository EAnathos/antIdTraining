import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { MAX_SUGGESTIONS_PER_USER } from '../lib/suggestionConstants.js'
import { cuidSchema } from '../lib/zodUtils.js'

export const suggestionsRouter = Router()

const suggestionSchema = z.object({
  title: z.string().max(150, 'Titre trop long').trim().optional().nullable(),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(5000, 'Message trop long')
    .trim(),
})

suggestionsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = suggestionSchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Requête invalide.'
      throw new AppError(400, message)
    }

    const suggestionCount = await prisma.suggestion.count({
      where: { userId: req.user!.userId, status: 'PENDING' },
    })
    if (suggestionCount >= MAX_SUGGESTIONS_PER_USER) {
      throw new AppError(
        400,
        `Limite de ${MAX_SUGGESTIONS_PER_USER} suggestions atteinte.`,
      )
    }

    const created = await prisma.suggestion.create({
      data: {
        userId: req.user!.userId,
        title: parsed.data.title ?? null,
        message: parsed.data.message,
      },
    })

    return res.status(201).json(created)
  }),
)

suggestionsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const idParsed = cuidSchema.safeParse(req.params.id)
    if (!idParsed.success) {
      throw new AppError(400, 'ID invalide.')
    }
    const id = idParsed.data
    const parsed = suggestionSchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Requête invalide.'
      throw new AppError(400, message)
    }

    const existing = await prisma.suggestion.findUnique({
      where: { id },
    })
    if (!existing) throw new AppError(404, 'Suggestion introuvable.')
    if (existing.userId !== req.user!.userId)
      throw new AppError(403, 'Accès refusé.')
    if (existing.status !== 'PENDING')
      throw new AppError(
        400,
        'Seules les suggestions en attente peuvent être modifiées.',
      )

    const updated = await prisma.suggestion.update({
      where: { id },
      data: {
        title: parsed.data.title,
        message: parsed.data.message,
      },
    })

    return res.json(updated)
  }),
)
