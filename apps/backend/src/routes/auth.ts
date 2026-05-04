import { Router } from 'express'
import { z } from 'zod'
import { getAdminCookieOptions, optionalAuth } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { loginAdmin, registerUser } from '../services/auth.js'
import { prisma } from '../prisma.js'

const loginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(3),
})

const registerSchema = loginSchema

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    const auth = await loginAdmin(parsed.data.username, parsed.data.password)

    res.cookie('adminToken', auth.token, getAdminCookieOptions())

    return res.json({ token: auth.token, role: auth.role })
  } catch (e) {
    console.error('Erreur /api/auth/login:', e)
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message })
    }
    res.status(500).json({ message: 'Erreur serveur', error: e instanceof Error ? e.message : String(e) })
  }
})

authRouter.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    const auth = await registerUser(parsed.data.username, parsed.data.password)

    res.cookie('adminToken', auth.token, getAdminCookieOptions())

    return res.status(201).json({ token: auth.token, role: auth.role, user: auth.user })
  } catch (e) {
    console.error('Erreur /api/auth/register:', e)
    if (e instanceof AppError) {
      return res.status(e.status).json({ message: e.message })
    }
    res.status(500).json({ message: 'Erreur serveur', error: e instanceof Error ? e.message : String(e) })
  }
})

authRouter.post('/logout', (_req, res) => {
  res.clearCookie('adminToken', getAdminCookieOptions())
  return res.status(204).send()
})

authRouter.get('/me', optionalAuth, (req, res) => {
  if (!req.user) {
    throw new AppError(401, 'Non autorisé.')
  }

  return prisma.user
    .findUnique({ where: { id: req.user.userId }, select: { username: true } })
    .then((user) => {
      return res.json({
        userId: req.user!.userId,
        role: req.user!.role,
        username: user?.username ?? null,
      })
    })
})
