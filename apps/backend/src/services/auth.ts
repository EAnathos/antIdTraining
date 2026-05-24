import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { getRedis } from '../lib/redis.js'
import { UserRole } from '@prisma/client'

const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5

function normalizeIp(ip: string) {
  return ip.replace(/^::ffff:/, '').trim()
}

async function enforceRateLimit(
  namespace: string,
  ipInput: string | null | undefined,
  windowMs: number,
  maxAttempts: number,
  message: string,
) {
  if (!ipInput) {
    return
  }

  const redis = getRedis()
  const ip = normalizeIp(ipInput)
  const key = `${namespace}:${ip}`
  const ttl = Math.ceil(windowMs / 1000)

  const attempts = await redis.incr(key)
  if (attempts === 1) {
    await redis.expire(key, ttl)
  }

  if (attempts > maxAttempts) {
    throw new AppError(429, message)
  }
}

export async function loginAdmin(username: string, password: string, ip?: string | null) {
  await enforceRateLimit(
    'login',
    ip,
    LOGIN_WINDOW_MS,
    LOGIN_MAX_ATTEMPTS,
    'Trop de tentatives de connexion depuis cette adresse IP. Réessayez plus tard.',
  )

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    throw new AppError(401, 'Identifiants invalides.')
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    throw new AppError(401, 'Identifiants invalides.')
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  return {
    token,
    role: user.role,
  }
}

export async function registerUser(username: string, password: string, ip?: string | null) {
  await enforceRateLimit(
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

  return {
    token,
    role: user.role,
    user,
  }
}
