import express from 'express'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret'

import {
  getAuthToken,
  getJwtPayload,
  requireAuth,
  requireAdmin,
  optionalAuth,
  getAdminCookieOptions,
} from '../../src/middleware/auth.js'
import type { Request, Response, NextFunction } from 'express'

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request
}

function makeRes(): Response & { statusCode: number; body: unknown } {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('getAuthToken', () => {
  it('extracts Bearer token from Authorization header', () => {
    const req = makeReq({ headers: { authorization: 'Bearer mytoken' } })
    expect(getAuthToken(req)).toBe('mytoken')
  })

  it('extracts adminToken from cookie header', () => {
    const req = makeReq({ headers: { cookie: 'adminToken=cookietoken' } })
    expect(getAuthToken(req)).toBe('cookietoken')
  })

  it('returns null when no auth present', () => {
    const req = makeReq()
    expect(getAuthToken(req)).toBeNull()
  })

  it('prefers Bearer over cookie', () => {
    const req = makeReq({
      headers: {
        authorization: 'Bearer bearertoken',
        cookie: 'adminToken=cookietoken',
      },
    })
    expect(getAuthToken(req)).toBe('bearertoken')
  })

  it('returns null if Authorization header does not start with Bearer', () => {
    const req = makeReq({ headers: { authorization: 'Basic abc123' } })
    expect(getAuthToken(req)).toBeNull()
  })
})

describe('getJwtPayload', () => {
  it('returns payload for valid token', () => {
    const token = jwt.sign({ userId: 'u1', role: 'USER' }, JWT_SECRET)
    const payload = getJwtPayload(token)
    expect(payload.userId).toBe('u1')
    expect(payload.role).toBe('USER')
  })

  it('throws for invalid token', () => {
    expect(() => getJwtPayload('invalid.token.here')).toThrow()
  })
})

describe('requireAuth middleware', () => {
  it('calls next with user set when token is valid', () => {
    const token = jwt.sign({ userId: 'u1', role: 'USER' }, JWT_SECRET)
    const req = makeReq({
      headers: { authorization: `Bearer ${token}` },
    }) as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res as any, next)

    expect(next).toHaveBeenCalledWith()
    expect(req.user).toMatchObject({ userId: 'u1', role: 'USER' })
  })

  it('returns 401 when no token', () => {
    const req = makeReq() as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', () => {
    const req = makeReq({
      headers: { authorization: 'Bearer bad.token' },
    }) as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAuth(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })
})

describe('requireAdmin middleware', () => {
  it('calls next when user is ADMIN', () => {
    const req = makeReq() as any
    req.user = { userId: 'u1', role: 'ADMIN' }
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAdmin(req, res as any, next)

    expect(next).toHaveBeenCalled()
  })

  it('returns 403 when user is USER role', () => {
    const req = makeReq() as any
    req.user = { userId: 'u1', role: 'USER' }
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAdmin(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 403 when no user set', () => {
    const req = makeReq() as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    requireAdmin(req, res as any, next)

    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('optionalAuth middleware', () => {
  it('calls next without user when no token', () => {
    const req = makeReq() as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    optionalAuth(req, res as any, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })

  it('sets user when valid token present', () => {
    const token = jwt.sign({ userId: 'u2', role: 'USER' }, JWT_SECRET)
    const req = makeReq({
      headers: { authorization: `Bearer ${token}` },
    }) as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    optionalAuth(req, res as any, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toMatchObject({ userId: 'u2' })
  })

  it('calls next without user when token is invalid', () => {
    const req = makeReq({
      headers: { authorization: 'Bearer bad.token' },
    }) as any
    const res = makeRes()
    const next = vi.fn() as unknown as NextFunction

    optionalAuth(req, res as any, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toBeUndefined()
  })
})

describe('getAdminCookieOptions', () => {
  it('returns lax sameSite in non-production', () => {
    const options = getAdminCookieOptions()
    expect(options.sameSite).toBe('lax')
    expect(options.secure).toBe(false)
    expect(options.httpOnly).toBe(true)
  })
})
