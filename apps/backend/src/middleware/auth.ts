import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

type JwtPayload = {
  userId: string
  role: 'ADMIN' | 'USER'
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

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getAuthToken(req)
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé.' })
  }

  try {
    const payload = getJwtPayload(token)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ message: 'Jeton invalide.' })
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = getAuthToken(req)
  if (!token) {
    return next()
  }

  try {
    req.user = getJwtPayload(token)
  } catch {
    // Ignore invalid tokens for optional auth.
  }

  return next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Accès administrateur requis.' })
  }
  next()
}
