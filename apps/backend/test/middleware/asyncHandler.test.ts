import { describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { asyncHandler } from '../../src/middleware/asyncHandler.js'

function makeReqRes() {
  const req = {} as Request
  const res = {} as Response
  const next: NextFunction = vi.fn()
  return { req, res, next }
}

describe('asyncHandler', () => {
  it('calls the handler and does not call next on success', async () => {
    const { req, res, next } = makeReqRes()
    const handler = vi.fn().mockResolvedValue(undefined)

    await asyncHandler(handler)(req, res, next)

    expect(handler).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('passes async errors to next', async () => {
    const { req, res, next } = makeReqRes()
    const error = new Error('async failure')
    const handler = vi.fn().mockRejectedValue(error)

    await asyncHandler(handler)(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })

  it('propagates sync thrown errors (not caught by asyncHandler)', () => {
    const { req, res, next } = makeReqRes()
    const error = new Error('sync failure')
    const handler = vi.fn().mockImplementation(() => {
      throw error
    })

    // asyncHandler uses Promise.resolve(fn(...)).catch(next) — sync throws
    // are not caught and propagate to the caller.
    expect(() => asyncHandler(handler)(req, res, next)).toThrow('sync failure')
    expect(next).not.toHaveBeenCalled()
  })
})
