import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('encryption helpers', () => {
  it('encrypts and decrypts sensitive text when a key is configured', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATA_ENCRYPTION_KEY', 'integration-test-key')

    const { decryptSensitiveText, encryptSensitiveText } = await import('./encryption.js')

    const encrypted = encryptSensitiveText('hello ants')

    expect(encrypted).toMatch(/^enc:v1:/)
    expect(decryptSensitiveText(encrypted)).toBe('hello ants')
  })

  it('returns plaintext in non-production mode without a key', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('DATA_ENCRYPTION_KEY', '')
    vi.stubEnv('ENCRYPTION_KEY', '')

    const { decryptSensitiveText, encryptSensitiveText } = await import('./encryption.js')

    expect(encryptSensitiveText('plain text')).toBe('plain text')
    expect(decryptSensitiveText('plain text')).toBe('plain text')
  })
})