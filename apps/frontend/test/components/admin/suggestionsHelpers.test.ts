import { describe, expect, it } from 'vitest'
import { resolveImageUrl } from '../../../src/components/admin/imageHelpers'

describe('Suggestions helpers', () => {
  it('resolves image urls correctly', () => {
    expect(resolveImageUrl('http://cdn/test.jpg')).toBe('http://cdn/test.jpg')
    expect(resolveImageUrl('/uploads/a.png')).toContain('/uploads/a.png')
    expect(resolveImageUrl('')).toBe('')
  })
})
