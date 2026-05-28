import { Router } from 'express'
import { enforceIpRateLimit } from '../lib/rateLimit.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  getGameQuestion,
  validateGameAnswer,
  validateGameAnswerSchema,
} from '../services/game.js'
import { optionalAuth } from '../middleware/auth.js'

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

    const departments =
      typeof req.query.departments === 'string'
        ? req.query.departments.split(',').filter((d) => d.trim())
        : []
    const swarmingMonths =
      typeof req.query.swarmingMonths === 'string'
        ? req.query.swarmingMonths
            .split(',')
            .map((m) => parseInt(m, 10))
            .filter((m) => !isNaN(m) && m >= 1 && m <= 12)
        : []

    const filters = {
      departments: departments.length > 0 ? departments : undefined,
      swarmingMonths: swarmingMonths.length > 0 ? swarmingMonths : undefined,
    }

    const question = await getGameQuestion(
      req.query.level,
      req.user?.userId ?? null,
      filters,
    )
    return res.json(question)
  }),
)

gameRouter.post(
  '/validate',
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

    const result = await validateGameAnswer(parsed.data)
    return res.json(result)
  }),
)
