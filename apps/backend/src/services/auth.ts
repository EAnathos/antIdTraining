import { randomInt, createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { enforceIpRateLimit, resetIpRateLimit } from '../lib/rateLimit.js'
import { UserRole } from '@prisma/client'
import { emailSchema } from '../lib/zodUtils.js'
import { logger } from '../lib/logger.js'
import { sendLoginNotificationEmail, sendVerificationEmail } from '../lib/mail.js'

const REGISTRATION_WINDOW_MS = 24 * 60 * 60 * 1000
const REGISTRATION_MAX_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const LOGIN_MAX_ATTEMPTS = 5
const VERIFICATION_WINDOW_MS = 15 * 60 * 1000
const VERIFICATION_MAX_ATTEMPTS = 10

function buildUserSummary(user: { id: string; username: string; email: string | null; role: UserRole }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  }
}

function generateVerificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

function hashVerificationCode(code: string) {
  return createHash('sha256').update(code).digest('hex')
}

export async function loginAdmin(email: string, password: string, ip?: string | null) {
  const normalizedEmail = emailSchema.parse(email)
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  })

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

  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'Veuillez valider votre adresse e-mail avant de vous connecter.')
  }

  await resetIpRateLimit('login', ip)

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  if (user.email && (config.sendLoginNotificationEmails ?? true)) {
    void Promise.resolve(sendLoginNotificationEmail(user.email, user.username)).catch((error) => {
      logger.warn({ err: error, userId: user.id, email: user.email }, 'Impossible d’envoyer le mail de connexion')
    })
  }

  return {
    token,
    role: user.role,
    user: buildUserSummary(user),
  }
}

export async function registerUser(username: string, email: string, password: string, ip?: string | null) {
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

  const normalizedEmail = emailSchema.parse(email)
  const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingEmail) {
    throw new AppError(409, 'Cette adresse e-mail est déjà utilisée.')
  }

  const verificationCode = generateVerificationCode()
  const verificationCodeHash = hashVerificationCode(verificationCode)
  const verificationCodeExpiresAt = new Date(Date.now() + VERIFICATION_WINDOW_MS)
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username,
      email: normalizedEmail,
      emailVerifiedAt: null,
      emailVerificationCodeHash: verificationCodeHash,
      emailVerificationCodeExpiresAt: verificationCodeExpiresAt,
      passwordHash,
      role: UserRole.USER,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  })

  try {
    await sendVerificationEmail(user.email ?? normalizedEmail, user.username, verificationCode)
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined)
    throw error
  }

  await resetIpRateLimit('registration', ip)

  return {
    requiresEmailVerification: true as const,
    email: user.email ?? normalizedEmail,
  }
}

export async function verifyRegistrationEmail(email: string, code: string, ip?: string | null) {
  await enforceIpRateLimit(
    'email-verification',
    ip,
    VERIFICATION_WINDOW_MS,
    VERIFICATION_MAX_ATTEMPTS,
    'Trop de tentatives de vérification depuis cette adresse IP. Réessayez plus tard.',
  )

  const normalizedEmail = emailSchema.parse(email)
  const normalizedCode = code.trim()
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      emailVerificationCodeHash: true,
      emailVerificationCodeExpiresAt: true,
    },
  })

  if (!user || !user.email || user.emailVerifiedAt || !user.emailVerificationCodeHash || !user.emailVerificationCodeExpiresAt) {
    throw new AppError(400, 'Code de vérification invalide ou expiré.')
  }

  if (user.emailVerificationCodeExpiresAt.getTime() < Date.now()) {
    throw new AppError(400, 'Code de vérification invalide ou expiré.')
  }

  if (hashVerificationCode(normalizedCode) !== user.emailVerificationCodeHash) {
    throw new AppError(400, 'Code de vérification invalide ou expiré.')
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationCodeHash: null,
      emailVerificationCodeExpiresAt: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  })

  await resetIpRateLimit('email-verification', ip)

  const token = jwt.sign({ userId: updatedUser.id, role: updatedUser.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  return {
    token,
    role: updatedUser.role,
    user: buildUserSummary(updatedUser),
  }
}
