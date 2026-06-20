import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'
import { enforceIpRateLimit, resetIpRateLimit } from '../lib/rateLimit.js'
import { generateToken, hashToken } from '../lib/token.js'
import { UserRole } from '@prisma/client'
import { emailSchema } from '../lib/zodUtils.js'
import { logger } from '../lib/logger.js'
import {
  sendLoginNotificationEmail,
  sendVerificationEmail,
} from '../lib/mail.js'
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } from '../lib/rateLimitConfig.js'

function buildUserSummary(user: {
  id: string
  username: string
  email: string | null
  role: UserRole
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  }
}

const ACTIVATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

export async function loginAdmin(
  email: string,
  password: string,
  ip?: string | null,
) {
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
      tokenVersion: true,
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
    throw new AppError(
      403,
      'Veuillez valider votre adresse e-mail avant de vous connecter.',
    )
  }

  await resetIpRateLimit('login', ip)

  const token = jwt.sign(
    { userId: user.id, role: user.role, tokenVersion: user.tokenVersion },
    config.jwtSecret,
    {
      expiresIn: '12h',
    },
  )

  if (user.email && (config.sendLoginNotificationEmails ?? true)) {
    void Promise.resolve(
      sendLoginNotificationEmail(user.email, user.username),
    ).catch((error) => {
      logger.warn(
        { err: error, userId: user.id, email: user.email },
        'Impossible d’envoyer le mail de connexion',
      )
    })
  }

  return {
    token,
    role: user.role,
    user: buildUserSummary(user),
  }
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
  ip?: string | null,
) {
  const existingUser = await prisma.user.findUnique({ where: { username } })
  if (existingUser) {
    throw new AppError(409, 'Ce nom d’utilisateur est déjà utilisé.')
  }

  const normalizedEmail = emailSchema.parse(email)
  const existingEmail = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })
  if (existingEmail) {
    throw new AppError(409, 'Cette adresse e-mail est déjà utilisée.')
  }

  const activationToken = generateToken()
  const activationTokenHash = hashToken(activationToken)
  const activationTokenExpiresAt = new Date(
    Date.now() + ACTIVATION_TOKEN_EXPIRY_MS,
  )
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      username,
      email: normalizedEmail,
      emailVerifiedAt: null,
      emailVerificationToken: activationTokenHash,
      emailVerificationTokenExpiresAt: activationTokenExpiresAt,
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
    await sendVerificationEmail(normalizedEmail, user.username, activationToken)
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined)
    throw error
  }

  await resetIpRateLimit('registration', ip)

  return {
    requiresEmailVerification: true as const,
    email: normalizedEmail,
  }
}

export async function verifyRegistrationEmail(
  activationToken: string,
  ip?: string | null,
) {
  const tokenHash = hashToken(activationToken)
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: tokenHash },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      emailVerifiedAt: true,
      emailVerificationTokenExpiresAt: true,
    },
  })

  if (
    !user ||
    !user.email ||
    user.emailVerifiedAt ||
    !user.emailVerificationTokenExpiresAt ||
    user.emailVerificationTokenExpiresAt.getTime() < Date.now()
  ) {
    throw new AppError(400, "Lien d'activation invalide ou expiré.")
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
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

  await resetIpRateLimit('email-verification', ip)

  const token = jwt.sign(
    {
      userId: updatedUser.id,
      role: updatedUser.role,
      tokenVersion: updatedUser.tokenVersion,
    },
    config.jwtSecret,
    {
      expiresIn: '12h',
    },
  )

  return {
    token,
    role: updatedUser.role,
    user: buildUserSummary(updatedUser),
  }
}
