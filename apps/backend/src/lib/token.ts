import { randomBytes, createHash } from 'node:crypto'

export const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

export function generateToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateAndHashToken(byteLength = 24): {
  token: string
  hash: string
} {
  const token = generateToken(byteLength)
  return { token, hash: hashToken(token) }
}

export function calculateTokenExpiry(ttlMs = TOKEN_EXPIRY_MS): Date {
  return new Date(Date.now() + ttlMs)
}

export function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  return !expiresAt || expiresAt.getTime() < Date.now()
}
