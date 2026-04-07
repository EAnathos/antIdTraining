import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { config } from '../config.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
})

export const authRouter = Router()

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide' })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides' })
  }

  const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!isValid) {
    return res.status(401).json({ message: 'Identifiants invalides' })
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: '12h',
  })

  return res.json({ token, role: user.role })
})
