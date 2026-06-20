import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { prisma } from '../prisma.js'

type JwtPayload = {
  userId: string
  role: 'ADMIN' | 'USER'
  tokenVersion: number
}

const ADMIN_SESSION_COOKIE = 'adminToken'

declare module 'express-serve-static-core' {
  interface Request {
    user?: JwtPayload
  }
}

function readCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) {
    return null
  }

  for (const cookie of cookieHeader.split(';')) {
    const trimmedCookie = cookie.trim()
    if (!trimmedCookie) {
      continue
    }

    const separatorIndex = trimmedCookie.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const rawName = trimmedCookie.slice(0, separatorIndex).trim()
    const rawValue = trimmedCookie.slice(separatorIndex + 1).trim()

    let decodedName: string
    let decodedValue: string

    try {
      decodedName = decodeURIComponent(rawName)
      decodedValue = decodeURIComponent(rawValue)
    } catch {
      continue
    }

    if (decodedName !== cookieName && rawName !== cookieName) {
      continue
    }

    return decodedValue
  }

  return null
}

export function getAuthToken(req: Request) {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length)
  }

  return readCookieValue(req.headers.cookie, ADMIN_SESSION_COOKIE)
}

export function getJwtPayload(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

export function getAdminCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  const sameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax'

  return {
    httpOnly: true,
    sameSite,
    secure: isProduction,
    path: '/',
    maxAge: 12 * 60 * 60 * 1000,
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = getAuthToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' })
  }

  let payload: JwtPayload
  try {
    payload = getJwtPayload(token)
  } catch {
    return res.status(401).json({ message: 'Jeton invalide.' })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, tokenVersion: true },
    })
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({ message: 'Session expirée.' })
    }
    req.user = {
      userId: payload.userId,
      role: user.role,
      tokenVersion: user.tokenVersion,
    }
    return next()
  } catch {
    return res.status(500).json({ message: 'Erreur interne.' })
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = getAuthToken(req)
  if (!token) {
    return next()
  }

  let payload: JwtPayload
  try {
    payload = getJwtPayload(token)
  } catch {
    // Ignore invalid tokens for optional auth.
    return next()
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, tokenVersion: true },
    })
    if (user && user.tokenVersion === payload.tokenVersion) {
      req.user = {
        userId: payload.userId,
        role: user.role,
        tokenVersion: user.tokenVersion,
      }
    }
  } catch {
    // DB error: proceed without auth rather than blocking the request.
  }

  return next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès administrateur requis.' })
  }
  next()
}
