import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { UserRole } from '@prisma/client'

const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_MAX_ATTEMPTS = 5

const registrationAttemptsByIp = new Map<string, number[]>()

function normalizeIp(ip: string) {
  return ip.replace(/^::ffff:/, '').trim()
}

function enforceRegistrationRateLimit(ipInput?: string | null) {
  if (!ipInput) {
    return
  }

  const ip = normalizeIp(ipInput)
  const now = Date.now()
  const attempts = (registrationAttemptsByIp.get(ip) ?? []).filter((timestamp) => now - timestamp < REGISTRATION_WINDOW_MS)

  if (attempts.length >= REGISTRATION_MAX_ATTEMPTS) {
    throw new AppError(429, 'Trop de créations de compte depuis cette adresse IP. Réessayez plus tard.')
  }

  attempts.push(now)
  registrationAttemptsByIp.set(ip, attempts)
}

export async function loginAdmin(username: string, password: string) {
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
  enforceRegistrationRateLimit(ip)

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
