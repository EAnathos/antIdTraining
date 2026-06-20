import { Router } from 'express'
import { z } from 'zod'
import { getAdminCookieOptions, optionalAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { AppError } from '../lib/errors.js'
import { enforceIpRateLimit } from '../lib/rateLimit.js'
import {
  loginAdmin,
  registerUser,
  verifyRegistrationEmail,
} from '../services/auth.js'
import { prisma } from '../prisma.js'
import { logger } from '../lib/logger.js'
import { getUserPoints } from '../services/stats.js'
import { emailSchema } from '../lib/zodUtils.js'
import {
  PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
  PASSWORD_RESET_REQUEST_WINDOW_MS,
  PASSWORD_RESET_MAX_ATTEMPTS,
  PASSWORD_RESET_WINDOW_MS,
  REGISTRATION_MAX_ATTEMPTS,
  REGISTRATION_WINDOW_MS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
  VERIFICATION_MAX_ATTEMPTS,
  VERIFICATION_WINDOW_MS,
} from '../lib/rateLimitConfig.js'
import { upload } from '../middleware/upload.js'
import crypto from 'node:crypto'
import { hashToken } from '../lib/token.js'
import bcrypt from 'bcryptjs'
import { sendPasswordResetEmail } from '../lib/mail.js'
import {
  resolveUploadFilePath,
  deleteUploadFilesForImageUrl,
  ensureUploadsDir,
  RESPONSIVE_IMAGE_WIDTHS,
} from '../lib/imageFiles.js'
import sharp from 'sharp'
import fs from 'node:fs'

const usernameSchema = z
  .string()
  .min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères")
  .max(32, "Le nom d'utilisateur doit contenir au maximum 32 caractères")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Le nom d'utilisateur doit contenir uniquement des caractères alphanumériques, tirets ou underscores",
  )

const loginPasswordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(256, 'Le mot de passe est trop long')

const passwordSchema = loginPasswordSchema.regex(
  /[^A-Za-z0-9\s]/,
  'Le mot de passe doit contenir au moins un caractère spécial',
)

const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
})

const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

const verifyEmailSchema = z.object({
  token: z.string().trim().length(48, "Lien d'activation invalide"),
})

const avatarSchema = z
  .string()
  .regex(/^\/uploads\/[\w.\-/]+$/, "Chemin d'avatar invalide")
  .nullable()
  .optional()

const updateProfileSchema = z.object({
  avatar: avatarSchema,
  bio: z
    .string()
    .max(500, 'La biographie doit contenir au maximum 500 caractères')
    // eslint-disable-next-line no-control-regex
    .refine((v) => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v), {
      message: 'La biographie contient des caractères non autorisés',
    })
    .nullable()
    .optional(),
})

const passwordResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

const passwordResetRequestSchema = z.object({
  email: emailSchema.optional(),
})

const publicPasswordResetMessage =
  "Si un compte existe pour cette adresse et qu'aucune autre demande n'a été faite dans la semaine, un e-mail de réinitialisation a été envoyé."

export const authRouter = Router()

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'login',
      req.ip,
      LOGIN_WINDOW_MS,
      LOGIN_MAX_ATTEMPTS,
      'Trop de tentatives de connexion depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw parsed.error
    }

    const auth = await loginAdmin(
      parsed.data.email,
      parsed.data.password,
      req.ip,
    )

    res.cookie('adminToken', auth.token, getAdminCookieOptions())

    return res.json({ token: auth.token, role: auth.role, user: auth.user })
  }),
)

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'registration',
      req.ip,
      REGISTRATION_WINDOW_MS,
      REGISTRATION_MAX_ATTEMPTS,
      'Trop de créations de compte depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      const passwordIssues = parsed.error.issues.filter((i) =>
        i.path.some((segment) => String(segment).includes('password')),
      )
      if (passwordIssues.length > 0) {
        logger.warn(
          { ip: req.ip, issues: passwordIssues.map((i) => i.message) },
          "Tentative d'inscription avec un mot de passe non conforme",
        )
      }
      throw parsed.error
    }

    const result = await registerUser(
      parsed.data.username,
      parsed.data.email,
      parsed.data.password,
      req.ip,
    )

    return res.status(201).json(result)
  }),
)

authRouter.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'email-verification',
      req.ip,
      VERIFICATION_WINDOW_MS,
      VERIFICATION_MAX_ATTEMPTS,
      'Trop de tentatives de vérification depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = verifyEmailSchema.safeParse(req.body)
    if (!parsed.success) {
      throw parsed.error
    }

    const auth = await verifyRegistrationEmail(parsed.data.token, req.ip)

    res.cookie('adminToken', auth.token, getAdminCookieOptions())

    return res.json({ token: auth.token, role: auth.role, user: auth.user })
  }),
)

authRouter.post(
  '/logout',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.userId
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      })
    }
    res.clearCookie('adminToken', getAdminCookieOptions())
    return res.status(204).send()
  }),
)

authRouter.get(
  '/me',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })
    const points = await getUserPoints(req.user.userId)

    return res.json({
      userId: req.user.userId,
      role: req.user.role,
      username: user?.username ?? null,
      email: user?.email ?? null,
      avatar: user?.avatar ?? null,
      bio: user?.bio ?? null,
      createdAt: user?.createdAt?.toISOString() ?? null,
      points,
    })
  }),
)

authRouter.patch(
  '/profile',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const body = (
      typeof req.body === 'object' && req.body !== null ? req.body : {}
    ) as Record<string, unknown>

    // only extract the two allowed fields — no spread of req.body to prevent mass-assignment
    const incoming = {
      avatar: body.avatar === '' ? null : body.avatar,
      bio: typeof body.bio === 'string' && body.bio === '' ? null : body.bio,
    }

    const parsed = updateProfileSchema.safeParse(incoming)
    if (!parsed.success) {
      throw parsed.error
    }

    const updateData: { avatar?: string | null; bio?: string | null } = {}
    if ('avatar' in parsed.data && parsed.data.avatar !== undefined) {
      updateData.avatar = parsed.data.avatar
    }
    if ('bio' in parsed.data && parsed.data.bio !== undefined) {
      updateData.bio = parsed.data.bio
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData,
      select: {
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })
    const points = await getUserPoints(req.user.userId)

    return res.json({
      userId: req.user.userId,
      role: req.user.role,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt.toISOString(),
      points,
    })
  }),
)

authRouter.post(
  '/delete-account',
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    await prisma.user.delete({ where: { id: req.user.userId } })

    res.clearCookie('adminToken', getAdminCookieOptions())
    return res.status(204).send()
  }),
)

authRouter.post(
  '/password-reset-request',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = passwordResetRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      throw parsed.error
    }

    await enforceIpRateLimit(
      'password-reset-request',
      req.ip,
      PASSWORD_RESET_REQUEST_WINDOW_MS,
      PASSWORD_RESET_REQUEST_MAX_ATTEMPTS,
      'Trop de demandes de réinitialisation depuis cette adresse IP. Réessayez plus tard.',
    )

    const isAuthenticated = Boolean(req.user)
    const authenticatedUserId = req.user?.userId ?? null
    const requestedEmail = parsed.data.email?.trim() ?? null

    if (!isAuthenticated && !requestedEmail) {
      throw new AppError(400, 'Adresse e-mail requise.')
    }

    if (isAuthenticated && !authenticatedUserId) {
      throw new AppError(401, 'Non autorisé.')
    }

    const user = isAuthenticated
      ? await prisma.user.findUnique({
          where: { id: authenticatedUserId! },
          select: {
            id: true,
            passwordResetRequestedAt: true,
            email: true,
            username: true,
          },
        })
      : await prisma.user.findUnique({
          where: { email: requestedEmail! },
          select: {
            id: true,
            passwordResetRequestedAt: true,
            email: true,
            username: true,
          },
        })

    if (!user) {
      return res.status(200).json({
        message: publicPasswordResetMessage,
      })
    }

    if (isAuthenticated && user.passwordResetRequestedAt) {
      const timeSinceLastReset =
        Date.now() - user.passwordResetRequestedAt.getTime()
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000
      if (timeSinceLastReset < oneWeekMs) {
        throw new AppError(
          429,
          'Vous pouvez demander une réinitialisation de mot de passe une fois par semaine.',
        )
      }
    }

    if (!isAuthenticated && user.passwordResetRequestedAt) {
      const timeSinceLastReset =
        Date.now() - user.passwordResetRequestedAt.getTime()
      const oneWeekMs = 7 * 24 * 60 * 60 * 1000
      if (timeSinceLastReset < oneWeekMs) {
        return res.status(200).json({
          message: publicPasswordResetMessage,
        })
      }
    }

    // generate a token and expiry (valid 24 hours)
    const token = crypto.randomBytes(24).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // store hashed token — never the raw token — to limit exposure in case of DB breach
    await prisma.user.update({
      where: { id: authenticatedUserId ?? user.id },
      data: {
        passwordResetRequestedAt: new Date(),
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    })

    // send email if possible
    try {
      if (user?.email) {
        await sendPasswordResetEmail(
          user.email,
          user.username ?? user.email,
          token,
        )
      }
    } catch (error) {
      // rollback token on failure
      await prisma.user.update({
        where: { id: authenticatedUserId ?? user.id },
        data: {
          passwordResetToken: null,
          passwordResetTokenExpiresAt: null,
        },
      })
      throw new AppError(
        500,
        "Impossible d'envoyer l'email de réinitialisation.",
      )
    }

    return res.status(200).json({
      message: isAuthenticated
        ? 'Demande de réinitialisation enregistrée.'
        : publicPasswordResetMessage,
    })
  }),
)

authRouter.post(
  '/password-reset',
  asyncHandler(async (req, res) => {
    await enforceIpRateLimit(
      'password-reset',
      req.ip,
      PASSWORD_RESET_WINDOW_MS,
      PASSWORD_RESET_MAX_ATTEMPTS,
      'Trop de tentatives de réinitialisation depuis cette adresse IP. Réessayez plus tard.',
    )

    const parsed = z
      .object({
        token: z.string().length(48, 'Token invalide'),
        password: passwordSchema,
        confirmPassword: z.string(),
      })
      .refine((data) => data.password === data.confirmPassword, {
        message: 'Les mots de passe ne correspondent pas',
        path: ['confirmPassword'],
      })
      .safeParse(req.body)

    if (!parsed.success) {
      throw parsed.error
    }

    const { token, password } = parsed.data

    const user = await prisma.user.findFirst({
      where: { passwordResetToken: hashToken(token) },
      select: {
        id: true,
        passwordResetTokenExpiresAt: true,
      },
    })

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new AppError(400, 'Token de réinitialisation invalide ou expiré.')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        passwordResetRequestedAt: null,
        tokenVersion: { increment: 1 },
      },
    })

    return res.status(200).json({ message: 'Mot de passe réinitialisé.' })
  }),
)

const VALID_AVATAR_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function runAvatarUpload(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('avatar')(req, res, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}

// Upload avatar
authRouter.post(
  '/avatar',
  optionalAuth,
  asyncHandler(async (req, res) => {
    await runAvatarUpload(req, res).catch(() => {
      throw new AppError(400, "Erreur lors de l'upload de l'avatar.")
    })

    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw new AppError(400, 'Fichier avatar manquant (champ avatar).')
    }

    if (!VALID_AVATAR_MIMETYPES.has(file.mimetype)) {
      throw new AppError(400, "Format d'image non accepté pour l'avatar.")
    }

    ensureUploadsDir()

    const safeStem =
      file.originalname
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'avatar'
    const fileId = `${Date.now()}-${safeStem}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
    const baseFileName = `${fileId}.webp`
    const widths = Array.from(RESPONSIVE_IMAGE_WIDTHS)
    const savedPaths: string[] = []

    try {
      const image = sharp(file.buffer, { animated: false }).rotate()
      const metadata = await image.metadata()
      if (!metadata.width || !metadata.height) {
        throw new AppError(400, 'Image invalide.')
      }

      for (const width of widths) {
        const outputFileName =
          width === widths[0] ? baseFileName : `${fileId}-${width}.webp`
        const outputPath = resolveUploadFilePath(outputFileName)

        await image
          .clone()
          .resize({
            width,
            height: width,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 78, effort: 6 })
          .toFile(outputPath)

        savedPaths.push(outputPath)
      }
    } catch (error) {
      await Promise.allSettled(savedPaths.map((p) => fs.promises.unlink(p)))
      if (error instanceof AppError) throw error
      throw new AppError(400, "Erreur lors du traitement de l'avatar.")
    }

    // remove old avatar files
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { avatar: true },
    })
    if (user?.avatar) {
      deleteUploadFilesForImageUrl(user.avatar)
    }

    const imageUrl = `/uploads/${baseFileName}`
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatar: imageUrl },
      select: {
        username: true,
        email: true,
        avatar: true,
        bio: true,
        createdAt: true,
      },
    })

    return res.json({
      username: updated.username,
      email: updated.email,
      avatar: updated.avatar,
      bio: updated.bio,
      createdAt: updated.createdAt.toISOString(),
    })
  }),
)

authRouter.get(
  '/users/:username',
  asyncHandler(async (req, res) => {
    const username = req.params.username as string

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, avatar: true, bio: true },
    })

    if (!user) {
      throw new AppError(404, 'Utilisateur introuvable.')
    }

    const points = await getUserPoints(user.id)

    return res.json({
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      points,
    })
  }),
)
