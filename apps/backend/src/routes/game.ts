import { Router } from 'express'
import { z } from 'zod'
import { enforceIpRateLimit } from '../lib/rateLimit.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  getGameQuestion,
  validateGameAnswer,
  validateGameAnswerSchema,
} from '../services/game.js'
import { optionalAuth } from '../middleware/auth.js'

const gameQuestionQuerySchema = z.object({
  level: z.string().optional(),
  departments: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : [],
    ),
  swarmingMonths: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return []
      return v
        .split(',')
        .map((m) => parseInt(m, 10))
        .filter((m) => !isNaN(m) && m >= 1 && m <= 12)
    }),
})

const GAME_QUESTION_WINDOW_MS = 60 * 1000
const GAME_QUESTION_MAX_ATTEMPTS = 30
const GAME_VALIDATE_WINDOW_MS = 60 * 1000
const GAME_VALIDATE_MAX_ATTEMPTS = 60

export const gameRouter = Router()

gameRouter.get(
  '/question',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'game:question',
      req.ip,
      GAME_QUESTION_WINDOW_MS,
      GAME_QUESTION_MAX_ATTEMPTS,
      'Trop de requêtes de jeu depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = gameQuestionQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      throw parsed.error
    }
    const { level, departments, swarmingMonths } = parsed.data

    const filters = {
      departments: departments.length > 0 ? departments : undefined,
      swarmingMonths: swarmingMonths.length > 0 ? swarmingMonths : undefined,
    }

    const question = await getGameQuestion(
      level,
      req.user?.userId ?? null,
      filters,
    )
    return res.json(question)
  }),
)

gameRouter.post(
  '/validate',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'game:validate',
      req.ip,
      GAME_VALIDATE_WINDOW_MS,
      GAME_VALIDATE_MAX_ATTEMPTS,
      'Trop de validations de réponses depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = validateGameAnswerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw parsed.error
    }

    const result = await validateGameAnswer(
      parsed.data,
      req.user?.userId ?? null,
    )
    return res.json(result)
  }),
)
