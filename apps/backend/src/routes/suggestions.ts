import { Router } from 'express'
import { z } from 'zod'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../prisma.js'
import { AppError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { encryptSensitiveText } from '../lib/encryption.js'
import {
  MAX_SUGGESTIONS_PER_USER,
  publicSuggestion,
} from '../lib/suggestionFormatters.js'

export const suggestionsRouter = Router()

const suggestionSchema = z.object({
  name: z.string().max(100, 'Nom trop long').trim().optional().nullable(),
  email: z
    .string()
    .email('Email invalide')
    .max(255, 'Email trop long')
    .optional()
    .nullable(),
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
      throw new AppError(400, 'Requête invalide.')
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
        name: parsed.data.name
          ? (encryptSensitiveText(parsed.data.name) ?? parsed.data.name)
          : null,
        email: parsed.data.email
          ? (encryptSensitiveText(parsed.data.email) ?? parsed.data.email)
          : null,
        message: parsed.data.message,
      },
    })

    return res.status(201).json(publicSuggestion(created))
  }),
)

const patchSuggestionSchema = z.object({
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(5000, 'Message trop long')
    .trim(),
})

suggestionsRouter.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const parsed = patchSuggestionSchema.safeParse(req.body)
    if (!parsed.success) throw new AppError(400, 'Requête invalide.')

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
      data: { message: parsed.data.message },
    })

    return res.json(publicSuggestion(updated))
  }),
)
