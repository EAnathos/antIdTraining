import { Router } from 'express'
import { z } from 'zod'
import { getAdminCookieOptions, optionalAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { AppError } from '../lib/errors.js'
import { loginAdmin, registerUser, verifyRegistrationEmail } from '../services/auth.js'
import { prisma } from '../prisma.js'
import { getUserPoints } from '../services/stats.js'
import { emailSchema } from '../lib/zodUtils.js'
import { upload } from '../middleware/upload.js'
import crypto from 'node:crypto'
import { resolveUploadFilePath, deleteUploadFilesForImageUrl, ensureUploadsDir, RESPONSIVE_IMAGE_WIDTHS } from '../lib/imageFiles.js'
import sharp from 'sharp'
import fs from 'node:fs'

const usernameSchema = z.string()
  .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
  .max(32, 'Le nom d\'utilisateur doit contenir au maximum 32 caractères')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur doit contenir uniquement des caractères alphanumériques, tirets ou underscores')

const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(256, 'Le mot de passe est trop long')

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

const verifyEmailSchema = z.object({
  email: emailSchema,
  code: z.string().trim().min(6, 'Le code de vérification est requis').max(6, 'Le code de vérification est invalide'),
})

const avatarSchema = z.union([
  z.string().url('Avatar doit être une URL valide'),
  z.string().regex(/^\/.*/, 'Avatar doit être une URL valide ou un chemin relatif'),
]).nullable().optional()

const updateProfileSchema = z.object({
  avatar: avatarSchema,
  bio: z.string().max(500, 'La biographie doit contenir au maximum 500 caractères').nullable().optional(),
})

const passwordResetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export const authRouter = Router()

authRouter.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    throw parsed.error
  }

  const auth = await loginAdmin(parsed.data.email, parsed.data.password, req.ip)

  res.cookie('adminToken', auth.token, getAdminCookieOptions())

  return res.json({ token: auth.token, role: auth.role, user: auth.user })
}))

authRouter.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw parsed.error
  }

  const result = await registerUser(parsed.data.username, parsed.data.email, parsed.data.password, req.ip)

  return res.status(201).json(result)
}))

authRouter.post('/verify-email', asyncHandler(async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    throw parsed.error
  }

  const auth = await verifyRegistrationEmail(parsed.data.email, parsed.data.code, req.ip)

  res.cookie('adminToken', auth.token, getAdminCookieOptions())

  return res.json({ token: auth.token, role: auth.role, user: auth.user })
}))

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken', getAdminCookieOptions())
  return res.status(204).send()
})

authRouter.get('/me', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { username: true, email: true, avatar: true, bio: true } })
  const points = await getUserPoints(req.user.userId)

  return res.json({
    userId: req.user.userId,
    role: req.user.role,
    username: user?.username ?? null,
    email: user?.email ?? null,
    avatar: user?.avatar ?? null,
    bio: user?.bio ?? null,
    points,
  })
}))

authRouter.patch('/profile', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  // normalize incoming body to be more permissive: treat empty strings as null
  const incoming = {
    ...(typeof req.body === 'object' && req.body !== null ? req.body : {}),
    avatar: req.body && req.body.avatar === '' ? null : req.body?.avatar,
    bio: req.body && typeof req.body.bio === 'string' && req.body.bio === '' ? null : req.body?.bio,
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
    select: { username: true, email: true, avatar: true, bio: true },
  })
  const points = await getUserPoints(req.user.userId)

  return res.json({
    userId: req.user.userId,
    role: req.user.role,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    points,
  })
}))

authRouter.post('/delete-account', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  await prisma.user.delete({ where: { id: req.user.userId } })

  res.clearCookie('adminToken', getAdminCookieOptions())
  return res.status(204).send()
}))

authRouter.post('/password-reset-request', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { passwordResetRequestedAt: true },
  })

  if (user?.passwordResetRequestedAt) {
    const timeSinceLastReset = Date.now() - user.passwordResetRequestedAt.getTime()
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000
    if (timeSinceLastReset < oneWeekMs) {
      throw new AppError(429, 'Vous pouvez demander une réinitialisation de mot de passe une fois par semaine.')
    }
  }

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { passwordResetRequestedAt: new Date() },
  })

  return res.status(200).json({ message: 'Demande de réinitialisation enregistrée.' })
}))

// Upload avatar
authRouter.post('/avatar', optionalAuth, asyncHandler(async (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      throw new AppError(400, 'Erreur lors de l’upload de l’avatar.')
    }

    if (!req.user) {
      throw new AppError(401, 'Non autorisé.')
    }

    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      throw new AppError(400, 'Fichier avatar manquant (champ avatar).')
    }

    ensureUploadsDir()

    // Validate and convert to webp with responsive variants
    const VALID_IMAGE_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    if (!VALID_IMAGE_MIMETYPES.has(file.mimetype)) {
      throw new AppError(400, 'Format d’image non accepté pour l’avatar.')
    }

    const safeStem = file.originalname.replace(/\.[^.]+$/, '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'avatar'
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
        const outputFileName = width === widths[0] ? baseFileName : `${fileId}-${width}.webp`
        const outputPath = resolveUploadFilePath(outputFileName)

        await image
          .clone()
          .resize({ width, height: width, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 78, effort: 6 })
          .toFile(outputPath)

        savedPaths.push(outputPath)
      }
    } catch (error) {
      for (const p of savedPaths) { try { await fs.promises.unlink(p) } catch { } }
      throw new AppError(400, 'Erreur lors du traitement de l’avatar.')
    }

    // remove old avatar files
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { avatar: true } })
    if (user?.avatar) {
      try { deleteUploadFilesForImageUrl(user.avatar) } catch { }
    }

    const imageUrl = `/uploads/${baseFileName}`
    const updated = await prisma.user.update({ where: { id: req.user.userId }, data: { avatar: imageUrl }, select: { username: true, email: true, avatar: true, bio: true } })

    return res.json({ username: updated.username, email: updated.email, avatar: updated.avatar, bio: updated.bio })
  })
}))

authRouter.get('/users/:username', asyncHandler(async (req, res) => {
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
}))
