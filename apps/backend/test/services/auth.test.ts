import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  prismaMocks,
  commonMocks,
  resetSharedMocks,
} from '../utils/sharedMocks'

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
vi.mock('../../src/lib/mail.js', () => ({
  sendLoginNotificationEmail: commonMocks.sendLoginNotificationEmail,
  sendVerificationEmail: commonMocks.sendVerificationEmail,
}))

import {
  loginAdmin,
  registerUser,
  verifyRegistrationEmail,
} from '../../src/services/auth.js'

describe('auth service', () => {
  beforeEach(() => {
    resetSharedMocks()
    commonMocks.jwtSign.mockReturnValue('jwt-token')
    commonMocks.bcryptHash.mockResolvedValue('hashed-password')
  })

  it('rejects login when user is missing and applies login rate-limit', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null)

    await expect(
      loginAdmin('unknown@example.com', 'password', '127.0.0.1'),
    ).rejects.toMatchObject({
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
      email: 'admin@example.com',
      role: 'ADMIN',
      emailVerifiedAt: new Date(),
      passwordHash: 'stored-hash',
    })
    commonMocks.bcryptCompare.mockResolvedValue(true)

    const result = await loginAdmin(
      'admin@example.com',
      'good-password',
      '127.0.0.1',
    )

    expect(result).toEqual({
      token: 'jwt-token',
      role: 'ADMIN',
      user: {
        id: 'user_1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
      },
    })
    expect(commonMocks.bcryptCompare).toHaveBeenCalledWith(
      'good-password',
      'stored-hash',
    )
    expect(commonMocks.resetIpRateLimit).toHaveBeenCalledWith(
      'login',
      '127.0.0.1',
    )
    expect(commonMocks.jwtSign).toHaveBeenCalledWith(
      { userId: 'user_1', role: 'ADMIN' },
      'test-secret',
      {
        expiresIn: '12h',
      },
    )
    expect(commonMocks.sendLoginNotificationEmail).toHaveBeenCalledWith(
      'admin@example.com',
      'admin',
    )
  })

  it('rejects login when the email is not verified', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({
      id: 'user_1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'ADMIN',
      emailVerifiedAt: null,
      passwordHash: 'stored-hash',
    })
    commonMocks.bcryptCompare.mockResolvedValue(true)

    await expect(
      loginAdmin('admin@example.com', 'good-password', '127.0.0.1'),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Veuillez valider votre adresse e-mail avant de vous connecter.',
    })
    expect(commonMocks.resetIpRateLimit).not.toHaveBeenCalledWith(
      'login',
      '127.0.0.1',
    )
  })

  it('rejects registration when username already exists', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ id: 'existing' })

    await expect(
      registerUser(
        'existing',
        'existing@example.com',
        'password123',
        '127.0.0.1',
      ),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Ce nom d’utilisateur est déjà utilisé.',
    })

    expect(prismaMocks.user.create).not.toHaveBeenCalled()
    expect(commonMocks.resetIpRateLimit).not.toHaveBeenCalledWith(
      'registration',
      '127.0.0.1',
    )
  })

  it('registers a new user and sends a verification email', async () => {
    prismaMocks.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    prismaMocks.user.create.mockResolvedValue({
      id: 'user_2',
      username: 'new-user',
      email: 'new-user@example.com',
      role: 'USER',
    })

    const result = await registerUser(
      'new-user',
      'new-user@example.com',
      'password123',
      '127.0.0.1',
    )

    expect(result).toEqual({
      requiresEmailVerification: true,
      email: 'new-user@example.com',
    })

    expect(commonMocks.bcryptHash).toHaveBeenCalledWith('password123', 10)
    expect(prismaMocks.user.create).toHaveBeenCalledWith({
      data: {
        username: 'new-user',
        email: 'new-user@example.com',
        emailVerifiedAt: null,
        emailVerificationToken: expect.any(String),
        emailVerificationTokenExpiresAt: expect.any(Date),
        passwordHash: 'hashed-password',
        role: 'USER',
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    })
    expect(commonMocks.sendVerificationEmail).toHaveBeenCalledWith(
      'new-user@example.com',
      'new-user',
      expect.any(String),
    )
    expect(commonMocks.resetIpRateLimit).toHaveBeenCalledWith(
      'registration',
      '127.0.0.1',
    )
  })

  it('verifies an email and returns an authenticated payload', async () => {
    const fakeTokenHash = 'a'.repeat(64)
    prismaMocks.user.findFirst.mockResolvedValue({
      id: 'user_3',
      username: 'new-user',
      email: 'new-user@example.com',
      role: 'USER',
      emailVerifiedAt: null,
      emailVerificationTokenExpiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ),
    })
    prismaMocks.user.update.mockResolvedValue({
      id: 'user_3',
      username: 'new-user',
      email: 'new-user@example.com',
      role: 'USER',
      tokenVersion: 0,
    })

    const result = await verifyRegistrationEmail('b'.repeat(48), '127.0.0.1')

    expect(result).toEqual({
      token: 'jwt-token',
      role: 'USER',
      user: {
        id: 'user_3',
        username: 'new-user',
        email: 'new-user@example.com',
        role: 'USER',
      },
    })
    expect(prismaMocks.user.update).toHaveBeenCalledWith({
      where: { id: 'user_3' },
      data: {
        emailVerifiedAt: expect.any(Date),
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        tokenVersion: true,
      },
    })
    expect(commonMocks.resetIpRateLimit).toHaveBeenCalledWith(
      'email-verification',
      '127.0.0.1',
    )
  })
})
