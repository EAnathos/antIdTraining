import { randomBytes, createHash } from 'node:crypto'

export function generateToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('hex')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
