import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

type JwtPayload = {
  userId: string
  role: 'ADMIN' | 'USER'
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non autorisé' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Token invalide' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès administrateur requis' })
  }
  next()
}
