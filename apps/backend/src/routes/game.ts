import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { getGameQuestion, validateGameAnswer, validateGameAnswerSchema } from '../services/game.js'

export const gameRouter = Router()

gameRouter.get('/question', async (req, res) => {
  const question = await getGameQuestion(req.query.level)
  return res.json(question)
})

gameRouter.post('/validate', async (req, res) => {
  const parsed = validateGameAnswerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const result = await validateGameAnswer(parsed.data)
  return res.json(result)
})
