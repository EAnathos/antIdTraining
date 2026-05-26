import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, commonMocks, resetSharedMocks } from '../utils/sharedMocks'
import { AppError } from '../../src/lib/errors.js'

vi.mock('../../src/middleware/auth.js', () => ({
  getAdminCookieOptions: () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  }),
  optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    const rawUser = req.header('x-test-user')
    if (rawUser) {
      req.user = JSON.parse(rawUser)
    }
    next()
  },
}))

vi.mock('../../src/services/auth.js', () => ({
  loginAdmin: commonMocks.loginAdmin,
  registerUser: commonMocks.registerUser,
  verifyRegistrationEmail: commonMocks.verifyRegistrationEmail,
}))

vi.mock('../../src/services/stats.js', () => ({
  getUserPoints: commonMocks.getUserPoints,
}))

vi.mock('../../src/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: prismaMocks.user.findUnique,
    },
  },
}))

import { authRouter } from '../../src/routes/auth.js'
import { errorHandler } from '../../src/middleware/error.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/auth', authRouter)
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
})

async function post(path: string, body: unknown, headers?: Record<string, string>) {
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

describe('authRouter', () => {
  it('returns 400 on invalid login payload', async () => {
    const { response, json } = await post('/api/auth/login', {
      email: 'not-an-email',
      password: 'short',
    })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Requête invalide.')
    expect(json.errors.email?.[0]).toContain('Email invalide')
    expect(json.errors.password?.[0]).toContain('au moins 8 caractères')
    expect((commonMocks as any).loginAdmin).not.toHaveBeenCalled()
  })

  it('logs in and sets admin cookie', async () => {
    ;(commonMocks as any).loginAdmin.mockResolvedValue({
      token: 'jwt-token',
      role: 'ADMIN',
      user: {
        id: 'admin_1',
        username: 'admin_user',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    })

    const { response, json } = await post('/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(200)
    expect(json).toEqual({
      token: 'jwt-token',
      role: 'ADMIN',
      user: {
        id: 'admin_1',
        username: 'admin_user',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    })
    expect((commonMocks as any).loginAdmin).toHaveBeenCalledWith('admin@example.com', 'password123', '::ffff:127.0.0.1')
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('adminToken=jwt-token')
  })

  it('returns 403 when logging in before email verification', async () => {
    ;(commonMocks as any).loginAdmin.mockRejectedValue(new AppError(403, 'Veuillez valider votre adresse e-mail avant de vous connecter.'))

    const { response, json } = await post('/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123',
    })

    expect(response.status).toBe(403)
    expect(json.message).toBe('Veuillez valider votre adresse e-mail avant de vous connecter.')
  })

  it('returns 400 on register payload with mismatched passwords', async () => {
    const { response, json } = await post('/api/auth/register', {
      username: 'new_user',
      email: 'new_user@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Requête invalide.')
    expect(json.errors.confirmPassword?.[0]).toBe('Les mots de passe ne correspondent pas')
    expect((commonMocks as any).registerUser).not.toHaveBeenCalled()
  })

  it('registers user and returns auth payload with 201', async () => {
    ;(commonMocks as any).registerUser.mockResolvedValue({
      requiresEmailVerification: true,
      email: 'new_user@example.com',
    })

    const { response, json } = await post('/api/auth/register', {
      username: 'new_user',
      email: 'new_user@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })

    expect(response.status).toBe(201)
    expect(json).toEqual({
      requiresEmailVerification: true,
      email: 'new_user@example.com',
    })
  })

  it('verifies email and returns auth payload', async () => {
    ;(commonMocks as any).verifyRegistrationEmail.mockResolvedValue({
      token: 'verified-token',
      role: 'USER',
      user: {
        id: 'user_2',
        username: 'new_user',
        email: 'new_user@example.com',
        role: 'USER',
      },
    })

    const { response, json } = await post('/api/auth/verify-email', {
      email: 'new_user@example.com',
      code: '123456',
    })

    expect(response.status).toBe(200)
    expect(json).toEqual({
      token: 'verified-token',
      role: 'USER',
      user: {
        id: 'user_2',
        username: 'new_user',
        email: 'new_user@example.com',
        role: 'USER',
      },
    })
    expect((commonMocks as any).verifyRegistrationEmail).toHaveBeenCalledWith('new_user@example.com', '123456', '::ffff:127.0.0.1')
  })

  it('returns 401 on /me when unauthenticated', async () => {
    const { response, json } = await get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(json).toEqual({ message: 'Non autorisé.' })
  })

  it('returns authenticated profile on /me', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ username: 'player_one', email: 'player@example.com' })
    commonMocks.getUserPoints.mockResolvedValue(42)

    const { response, json } = await get('/api/auth/me', {
      'x-test-user': JSON.stringify({ userId: 'user_42', role: 'USER' }),
    })

    expect(response.status).toBe(200)
    expect(json).toEqual({
      userId: 'user_42',
      role: 'USER',
      username: 'player_one',
      email: 'player@example.com',
      points: 42,
    })
    expect(prismaMocks.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_42' },
      select: { username: true, email: true },
    })
    expect(commonMocks.getUserPoints).toHaveBeenCalledWith('user_42')
  })

  it('clears cookie on logout', async () => {
    const response = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
    })

    expect(response.status).toBe(204)
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('adminToken=')
  })
})
