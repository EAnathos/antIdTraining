import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { enforceIpRateLimit, resetIpRateLimit } from '../lib/rateLimit.js'
import { UserRole } from '@prisma/client'

const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5

export async function loginAdmin(username: string, password: string, ip?: string | null) {
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    await enforceIpRateLimit(
      'login',
      ip,
      LOGIN_WINDOW_MS,
      LOGIN_MAX_ATTEMPTS,
      'Trop de tentatives de connexion depuis cette adresse IP. Réessayez plus tard.',
    )
    throw new AppError(401, 'Identifiants invalides.')
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    await enforceIpRateLimit(
      'login',
      ip,
      LOGIN_WINDOW_MS,
      LOGIN_MAX_ATTEMPTS,
      'Trop de tentatives de connexion depuis cette adresse IP. Réessayez plus tard.',
    )
    throw new AppError(401, 'Identifiants invalides.')
  }

  await resetIpRateLimit('login', ip)

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  return {
    token,
    role: user.role,
  }
}

export async function registerUser(username: string, password: string, ip?: string | null) {
  await enforceIpRateLimit(
    'registration',
    ip,
    REGISTRATION_WINDOW_MS,
    REGISTRATION_MAX_ATTEMPTS,
    'Trop de créations de compte depuis cette adresse IP. Réessayez plus tard.',
  )

  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) {
    throw new AppError(409, 'Ce nom d’utilisateur est déjà utilisé.')
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: UserRole.USER,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  })

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  await resetIpRateLimit('registration', ip)

  return {
    token,
    role: user.role,
    user,
  }
}
