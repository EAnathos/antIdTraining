import { describe, expect, it } from 'vitest'

import { getResponsiveImageProps } from '../../src/lib/image'

describe('responsive image helpers', () => {
  it('builds responsive props for a relative URL', () => {
    const result = getResponsiveImageProps('/uploads/queen.webp')

    expect(result.src).toBe('/uploads/queen.webp')
    expect(result.srcSet).toBe(
      '/uploads/queen-480.webp 480w, /uploads/queen-960.webp 960w, /uploads/queen.webp 1600w',
    )
    expect(result.sizes).toBe('(max-width: 768px) 100vw, 70vw')
  })

  it('keeps query params when building responsive variants', () => {
    const result = getResponsiveImageProps('/uploads/queen.webp?v=2')

    expect(result.srcSet).toContain('/uploads/queen-480.webp?v=2 480w')
    expect(result.srcSet).toContain('/uploads/queen-960.webp?v=2 960w')
    expect(result.srcSet).toContain('/uploads/queen.webp?v=2 1600w')
  })

  it('supports URLs without extension and custom sizes', () => {
    const result = getResponsiveImageProps('/uploads/queen', { sizes: '100vw' })

    expect(result.srcSet).toBe('/uploads/queen-480 480w, /uploads/queen-960 960w, /uploads/queen 1600w')
    expect(result.sizes).toBe('100vw')
  })

  it('keeps absolute URLs unchanged for src while creating variants', () => {
    const result = getResponsiveImageProps('https://cdn.example.com/queen.webp')

    expect(result.src).toBe('https://cdn.example.com/queen.webp')
    expect(result.srcSet).toContain('https://cdn.example.com/queen-480.webp 480w')
    expect(result.srcSet).toContain('https://cdn.example.com/queen-960.webp 960w')
    expect(result.srcSet).toContain('https://cdn.example.com/queen.webp 1600w')
  })
})
