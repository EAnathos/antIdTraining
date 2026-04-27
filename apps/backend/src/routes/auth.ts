import { Router } from 'express'
import { z } from 'zod'
import { getAdminCookieOptions, optionalAuth } from '../middleware/auth.js'
import { AppError } from '../lib/errors.js'
import { loginAdmin } from '../services/auth.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
})

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    const auth = await loginAdmin(parsed.data.email, parsed.data.password)

    res.cookie('adminToken', auth.token, getAdminCookieOptions())

    return res.json({ token: auth.token, role: auth.role })
  } catch (e) {
    console.error('Erreur /api/auth/login:', e)
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

  return res.json({ userId: req.user.userId, role: req.user.role })
})
