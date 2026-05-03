import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { AppError } from '../lib/errors.js'

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
