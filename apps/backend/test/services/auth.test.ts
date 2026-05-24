import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, commonMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('bcryptjs', () => ({
  default: {
    compare: commonMocks.bcryptCompare,
    hash: commonMocks.bcryptHash,
  },
}))
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: commonMocks.jwtSign,
  },
}))
vi.mock('../../src/config.js', () => ({
  config: {
    jwtSecret: 'test-secret',
  },
}))
vi.mock('../../src/lib/rateLimit.js', () => ({
  enforceIpRateLimit: commonMocks.enforceIpRateLimit,
  resetIpRateLimit: commonMocks.resetIpRateLimit,
}))

import { loginAdmin, registerUser } from '../../src/services/auth.js'

describe('auth service', () => {
  beforeEach(() => {
    resetSharedMocks()
    commonMocks.jwtSign.mockReturnValue('jwt-token')
    commonMocks.bcryptHash.mockResolvedValue('hashed-password')
  })

  it('rejects login when user is missing and applies login rate-limit', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null)

    await expect(loginAdmin('unknown', 'password', '127.0.0.1')).rejects.toMatchObject({
      status: 401,
      message: 'Identifiants invalides.',
    })

    expect(commonMocks.enforceIpRateLimit).toHaveBeenCalledWith(
      'login',
      '127.0.0.1',
      15 * 60 * 1000,
      5,
      'Trop de tentatives de connexion depuis cette adresse IP. Réessayez plus tard.',
    )
    expect(commonMocks.resetIpRateLimit).not.toHaveBeenCalled()
  })

  it('logs in a valid user and resets login rate-limit', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({
      id: 'user_1',
      username: 'admin',
      role: 'ADMIN',
      passwordHash: 'stored-hash',
    })
    commonMocks.bcryptCompare.mockResolvedValue(true)

    const result = await loginAdmin('admin', 'good-password', '127.0.0.1')

    expect(result).toEqual({ token: 'jwt-token', role: 'ADMIN' })
    expect(commonMocks.bcryptCompare).toHaveBeenCalledWith('good-password', 'stored-hash')
    expect(commonMocks.resetIpRateLimit).toHaveBeenCalledWith('login', '127.0.0.1')
    expect(commonMocks.jwtSign).toHaveBeenCalledWith({ userId: 'user_1', role: 'ADMIN' }, 'test-secret', {
      expiresIn: '12h',
    })
  })

  it('rejects registration when username already exists', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ id: 'existing' })

    await expect(registerUser('existing', 'password123', '127.0.0.1')).rejects.toMatchObject({
      status: 409,
      message: 'Ce nom d’utilisateur est déjà utilisé.',
    })

    expect(commonMocks.enforceIpRateLimit).toHaveBeenCalledWith(
      'registration',
      '127.0.0.1',
      24 * 60 * 60 * 1000,
      5,
      'Trop de créations de compte depuis cette adresse IP. Réessayez plus tard.',
    )
    expect(prismaMocks.user.create).not.toHaveBeenCalled()
    expect(commonMocks.resetIpRateLimit).not.toHaveBeenCalledWith('registration', '127.0.0.1')
  })

  it('registers a new user and returns auth payload', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null)
    prismaMocks.user.create.mockResolvedValue({
      id: 'user_2',
      username: 'new-user',
      role: 'USER',
    })

    const result = await registerUser('new-user', 'password123', '127.0.0.1')

    expect(result).toEqual({
      token: 'jwt-token',
      role: 'USER',
      user: {
        id: 'user_2',
        username: 'new-user',
        role: 'USER',
      },
    })

    expect(commonMocks.bcryptHash).toHaveBeenCalledWith('password123', 10)
    expect(prismaMocks.user.create).toHaveBeenCalledWith({
      data: {
        username: 'new-user',
        passwordHash: 'hashed-password',
        role: 'USER',
      },
      select: {
        id: true,
        username: true,
        role: true,
      },
    })
    expect(commonMocks.resetIpRateLimit).toHaveBeenCalledWith('registration', '127.0.0.1')
  })
})
