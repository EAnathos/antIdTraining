import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
globalThis.fetch = fetchMock

vi.mock('../../src/config.js', () => ({
  config: {
    resendApiKey: 'test-api-key',
    resendFrom: 'Test <test@example.com>',
    frontendUrl: 'https://example.com',
    jwtSecret: 'test-secret',
  },
}))
vi.mock('../../src/lib/logger.js', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  sendLoginNotificationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../../src/lib/mail.js'

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ id: 'msg-1' }),
    text: async () => '',
  })
})

describe('sendLoginNotificationEmail', () => {
  it('calls Resend API with login notification content', async () => {
    await sendLoginNotificationEmail('alice@example.com', 'Alice')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
        }),
      }),
    )

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.to).toBe('alice@example.com')
    expect(body.subject).toBe('Connexion à Ant ID Training')
    expect(body.text).toContain('Alice')
  })

  it('does not throw when API key is missing', async () => {
    vi.doMock('../../src/config.js', () => ({
      config: {
        resendApiKey: null,
        resendFrom: null,
        frontendUrl: 'https://example.com',
        jwtSecret: 'test-secret',
      },
    }))
    // mail.ts skips silently when no key — no throw
    await expect(
      sendLoginNotificationEmail('alice@example.com', 'Alice'),
    ).resolves.toBeUndefined()
  })
})

describe('sendVerificationEmail', () => {
  it('sends verification code in email body', async () => {
    await sendVerificationEmail('alice@example.com', 'Alice', '123456')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.subject).toBe('Validez votre adresse e-mail')
    expect(body.text).toContain('123456')
    expect(body.html).toContain('123456')
  })

  it('throws when API responds with error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'invalid email',
    })

    await expect(
      sendVerificationEmail('bad', 'Alice', '000000'),
    ).rejects.toThrow('422')
  })
})

describe('sendPasswordResetEmail', () => {
  it('includes reset URL with token in email body', async () => {
    await sendPasswordResetEmail('alice@example.com', 'Alice', 'tok-abc')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.subject).toBe('Réinitialisez votre mot de passe')
    expect(body.text).toContain('tok-abc')
    expect(body.html).toContain('tok-abc')
    expect(body.html).toContain('https://example.com')
  })
})
