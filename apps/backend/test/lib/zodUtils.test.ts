import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'

import { cuidSchema, cuidValidator, emailSchema, urlSchema } from '../../src/lib/zodUtils.js'

describe('zod utils', () => {
  it('validates a valid cuid and rejects an invalid one', () => {
    const cuid = createId()

    expect(cuidSchema.parse(cuid)).toBe(cuid)
    expect(() => cuidSchema.parse('not-a-cuid')).toThrow('ID invalide')
  })

  it('supports custom message for cuid validator', () => {
    const validator = cuidValidator('Identifiant invalide')

    const result = validator.safeParse('invalid_identifier_value')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Identifiant invalide')
    }
  })

  it('normalizes valid email casing and validates URL', () => {
    expect(emailSchema.parse('TEST@Example.COM')).toBe('test@example.com')
    expect(urlSchema.parse('https://example.com/path')).toBe('https://example.com/path')
  })

  it('rejects non-trimmed values because validation happens before trim', () => {
    expect(() => emailSchema.parse('  TEST@Example.COM  ')).toThrow('Email invalide')
    expect(urlSchema.parse(' https://example.com/path ')).toBe('https://example.com/path')
  })
})
