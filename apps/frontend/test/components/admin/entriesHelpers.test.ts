import { describe, expect, it } from 'vitest'
import {
  normalizeDepartment,
  parseDepartmentInput,
} from '../../../src/components/admin/entriesHelpers'
import { resolveImageUrl } from '../../../src/components/admin/imageHelpers'

describe('Entries helpers', () => {
  it('normalizes department codes', () => {
    expect(normalizeDepartment('1')).toBe('01')
    expect(normalizeDepartment('75')).toBe('75')
    expect(normalizeDepartment('  2a ')).toBe('2A')
    expect(normalizeDepartment('971')).toBe('971')
    expect(normalizeDepartment('')).toBe('')
  })

  it('parses department inputs with labels', () => {
    expect(parseDepartmentInput('75 - Paris')).toBe('75')
    expect(parseDepartmentInput('2A - Corse-du-Sud')).toBe('2A')
    expect(parseDepartmentInput('  1')).toBe('01')
    expect(parseDepartmentInput('unknown')).toBe('unknown')
  })

  it('resolves image urls with backend origin', () => {
    expect(resolveImageUrl('http://example.com/img.jpg')).toBe(
      'http://example.com/img.jpg',
    )
    expect(resolveImageUrl('/uploads/1.jpg')).toContain('/uploads/1.jpg')
  })
})
