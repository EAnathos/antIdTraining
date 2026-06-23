import express from 'express'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { ZodError } from 'zod'
import { commonMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/lib/syncMetrics.js', () => ({
  syncBusinessMetrics: vi.fn(),
}))

vi.mock('../../src/middleware/auth.js', () => ({
  optionalAuth: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    const rawUser = req.header('x-test-user')
    if (rawUser) {
      req.user = JSON.parse(rawUser)
    }
    next()
  },
}))

vi.mock('../../src/lib/rateLimit.js', () => ({
  enforceIpRateLimit: commonMocks.enforceIpRateLimit,
}))

vi.mock('../../src/services/game.js', () => ({
  getGameQuestion: commonMocks.getGameQuestion,
  validateGameAnswer: commonMocks.validateGameAnswer,
  validateGameAnswerSchema: commonMocks.validateGameAnswerSchema,
}))
import { gameRouter } from '../../src/routes/game.js'
import * as gameService from '../../src/services/game.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/game', gameRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`
      }
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

beforeEach(() => {
  resetSharedMocks()
  // ensure validate schema placeholder exists per-test
  ;(commonMocks as any).validateGameAnswerSchema.safeParse = vi.fn()
  // ensure the service mock exists per-test
  ;(commonMocks as any).validateGameAnswer =
    (commonMocks as any).validateGameAnswer ?? vi.fn()
})

async function get(path: string, headers?: Record<string, string>) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers,
  })

  const text = await response.text()
  return {
    response,
    json: text ? JSON.parse(text) : null,
  }
}

async function post(
  path: string,
  body: unknown,
  headers?: Record<string, string>,
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  return {
    response,
    json: text ? JSON.parse(text) : null,
  }
}

describe('gameRouter', () => {
  it('returns a question and calls getGameQuestion with filters and user', async () => {
    ;(commonMocks as any).getGameQuestion.mockResolvedValue({
      id: 'q1',
      prompt: 'Quel genre ?',
    })

    const { response, json } = await get(
      '/api/game/question?level=easy&departments=75,33&swarmingMonths=5,6',
      {
        'x-test-user': JSON.stringify({ userId: 'user_123', role: 'USER' }),
      },
    )

    expect(response.status).toBe(200)
    expect(json).toEqual({ id: 'q1', prompt: 'Quel genre ?' })
    expect(commonMocks.enforceIpRateLimit).toHaveBeenCalled()
    expect((commonMocks as any).getGameQuestion).toHaveBeenCalledWith(
      'easy',
      'user_123',
      {
        departments: ['75', '33'],
        swarmingMonths: [5, 6],
      },
    )
  })

  it('returns 400 on invalid validate payload', async () => {
    ;(commonMocks as any).validateGameAnswerSchema.safeParse.mockReturnValue({
      success: false,
      error: new ZodError([]),
    })

    const { response, json } = await post('/api/game/validate', {
      invalid: true,
    })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Requête invalide.')
    expect((commonMocks as any).validateGameAnswer).not.toHaveBeenCalled()
  })

  it('validates answer and returns result', async () => {
    ;(commonMocks as any).validateGameAnswerSchema.safeParse.mockReturnValue({
      success: true,
      data: { questionId: 'q1', answer: 'a' },
    })
    ;(gameService as any).validateGameAnswer.mockResolvedValue({
      correct: true,
      points: 5,
    })

    const { response, json } = await post('/api/game/validate', {
      questionId: 'q1',
      answer: 'a',
    })

    expect(response.status).toBe(200)
    expect(json).toEqual({ correct: true, points: 5 })
    expect(commonMocks.enforceIpRateLimit).toHaveBeenCalled()
    expect((gameService as any).validateGameAnswer).toHaveBeenCalledWith(
      { questionId: 'q1', answer: 'a' },
      null,
    )
  })
})
