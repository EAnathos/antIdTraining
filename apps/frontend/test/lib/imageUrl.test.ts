import { describe, expect, it, vi } from 'vitest'

vi.mock('../../src/lib/api', () => ({
  backendOrigin: 'https://api.example.com',
}))

describe('resolveImageUrl', () => {
  it('keeps absolute URLs untouched', async () => {
    const { resolveImageUrl } = await import('../../src/lib/imageUrl')

    expect(resolveImageUrl('https://cdn.example.com/avatar.webp')).toBe(
      'https://cdn.example.com/avatar.webp',
    )
  })

  it('prefixes relative URLs with the backend origin', async () => {
    const { resolveImageUrl } = await import('../../src/lib/imageUrl')

    expect(resolveImageUrl('/uploads/avatar.webp')).toBe(
      'https://api.example.com/uploads/avatar.webp',
    )
  })
})
