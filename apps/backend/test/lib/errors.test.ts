import { describe, expect, it } from 'vitest'

import { AppError, isErrorWithCode } from '../../src/lib/errors.js'

describe('errors helpers', () => {
  it('builds AppError with status, message and name', () => {
    const error = new AppError(409, 'Duplicate entry')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('AppError')
    expect(error.status).toBe(409)
    expect(error.message).toBe('Duplicate entry')
  })

  it('detects an error-like object with a string code', () => {
    expect(isErrorWithCode({ code: 'P2002' })).toBe(true)
  })

  it('returns false when code is missing or not a string', () => {
    expect(isErrorWithCode({})).toBe(false)
    expect(isErrorWithCode({ code: 404 })).toBe(false)
    expect(isErrorWithCode(null)).toBe(false)
    expect(isErrorWithCode('P2002')).toBe(false)
  })
})
