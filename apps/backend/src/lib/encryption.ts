import crypto from 'node:crypto'
import { config } from '../config.js'
import { logger } from './logger.js'

const ENCRYPTION_PREFIX = 'enc:v1:'

function getKeyMaterial() {
  const key = config.dataEncryptionKey
  if (!key) {
    return null
  }

  return crypto.createHash('sha256').update(key).digest()
}

function isEncrypted(value: string) {
  return value.startsWith(ENCRYPTION_PREFIX)
}

export function encryptSensitiveText(value: string | null | undefined) {
  if (value == null) return value ?? null

  const key = getKeyMaterial()
  if (!key) {
    throw new Error(
      'DATA_ENCRYPTION_KEY is required to encrypt sensitive data. Configure this environment variable.',
    )
  }

  if (isEncrypted(value)) return value

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptSensitiveText(value: string | null | undefined) {
  if (value == null) return value ?? null

  if (!isEncrypted(value)) return value

  const key = getKeyMaterial()
  if (!key) {
    throw new Error(
      'Cannot decrypt encrypted value without DATA_ENCRYPTION_KEY',
    )
  }

  const payload = value.slice(ENCRYPTION_PREFIX.length)
  const [ivHex, authTagHex, encryptedHex] = payload.split(':')

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid encrypted payload')
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivHex, 'hex'),
  )
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
