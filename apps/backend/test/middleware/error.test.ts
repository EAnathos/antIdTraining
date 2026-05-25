import multer from 'multer'
import { z, ZodError } from 'zod'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loggerError: vi.fn(),
}))

vi.mock('../../src/lib/logger.js', () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

import { AppError } from '../../src/lib/errors.js'
import { errorHandler, notFoundHandler } from '../../src/middleware/error.js'

function createResponseMock() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  }

  response.status.mockReturnValue(response)
  response.json.mockReturnValue(response)

  return response
}

describe('error middleware', () => {
  it('returns 404 for unknown routes', () => {
    const response = createResponseMock()

    notFoundHandler({} as any, response as any)

    expect(response.status).toHaveBeenCalledWith(404)
    expect(response.json).toHaveBeenCalledWith({ message: 'Route introuvable.' })
  })

  it('handles AppError with custom status and message', () => {
    const response = createResponseMock()

    errorHandler(new AppError(403, 'Accès refusé'), { method: 'GET', originalUrl: '/x' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({ message: 'Accès refusé' })
  })

  it('handles payload too large errors', () => {
    const response = createResponseMock()

    errorHandler({ type: 'entity.too.large' }, { method: 'POST', originalUrl: '/upload' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(413)
    expect(response.json).toHaveBeenCalledWith({ message: 'Snapshot trop volumineux.' })
  })

  it('handles multer file size errors', () => {
    const response = createResponseMock()

    errorHandler(new multer.MulterError('LIMIT_FILE_SIZE'), { method: 'POST', originalUrl: '/zip' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(413)
    expect(response.json).toHaveBeenCalledWith({ message: 'Archive trop volumineuse.' })
  })

  it('handles generic multer errors', () => {
    const response = createResponseMock()

    errorHandler(new multer.MulterError('LIMIT_UNEXPECTED_FILE'), { method: 'POST', originalUrl: '/zip' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(400)
    expect(response.json).toHaveBeenCalledWith({ message: 'Requête invalide.' })
  })

  it('handles zod validation errors', () => {
    const response = createResponseMock()

    let zodError: ZodError
    try {
      z.object({ username: z.string().min(3) }).parse({ username: 'ab' })
      throw new Error('Expected ZodError')
    } catch (error) {
      zodError = error as ZodError
    }

    errorHandler(zodError!, { method: 'POST', originalUrl: '/auth' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(400)
    const payload = response.json.mock.calls[0][0]
    expect(payload.message).toBe('Requête invalide.')
    expect(payload.errors.username).toBeDefined()
  })

  it('handles Prisma not-found and unique conflicts', () => {
    const notFoundResponse = createResponseMock()
    errorHandler({ code: 'P2025' }, { method: 'GET', originalUrl: '/resource' } as any, notFoundResponse as any, vi.fn())
    expect(notFoundResponse.status).toHaveBeenCalledWith(404)
    expect(notFoundResponse.json).toHaveBeenCalledWith({ message: 'Ressource introuvable.' })

    const uniqueResponse = createResponseMock()
    errorHandler(
      { code: 'P2002', meta: { target: ['username', 'email'] } },
      { method: 'POST', originalUrl: '/users' } as any,
      uniqueResponse as any,
      vi.fn(),
    )

    expect(uniqueResponse.status).toHaveBeenCalledWith(409)
    expect(uniqueResponse.json).toHaveBeenCalledWith({
      message: 'La valeur pour "username", "email" existe déjà.',
      field: 'username',
      fields: ['username', 'email'],
    })
  })

  it('handles unknown errors with an internal server response and errorId', () => {
    const response = createResponseMock()

    errorHandler(new Error('Boom'), { method: 'GET', originalUrl: '/boom' } as any, response as any, vi.fn())

    expect(response.status).toHaveBeenCalledWith(500)
    const payload = response.json.mock.calls[0][0]
    expect(payload.message).toBe('Erreur interne du serveur.')
    expect(typeof payload.errorId).toBe('string')
    expect(payload.errorId.length).toBe(12)
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
