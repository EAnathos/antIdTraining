import { Router } from 'express'
import { z } from 'zod'
import { getAdminCookieOptions, optionalAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { AppError } from '../lib/errors.js'
import { loginAdmin, registerUser } from '../services/auth.js'
import { prisma } from '../prisma.js'
import { getUserPoints } from '../services/stats.js'

const usernameSchema = z.string()
  .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
  .max(32, 'Le nom d\'utilisateur doit contenir au maximum 32 caractères')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur doit contenir uniquement des caractères alphanumériques, tirets ou underscores')

const passwordSchema = z.string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(256, 'Le mot de passe est trop long')

const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

const registerSchema = loginSchema.extend({
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

  const auth = await loginAdmin(parsed.data.username, parsed.data.password, req.ip)

  res.cookie('adminToken', auth.token, getAdminCookieOptions())

  return res.json({ token: auth.token, role: auth.role })
}))

authRouter.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    throw parsed.error
  }

  const auth = await registerUser(parsed.data.username, parsed.data.password, req.ip)

  res.cookie('adminToken', auth.token, getAdminCookieOptions())

  return res.status(201).json({ token: auth.token, role: auth.role, user: auth.user })
}))

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken', getAdminCookieOptions())
  return res.status(204).send()
})

authRouter.get('/me', optionalAuth, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { username: true } })
  const points = await getUserPoints(req.user.userId)

  return res.json({
    userId: req.user.userId,
    role: req.user.role,
    username: user?.username ?? null,
    points,
  })
}))
