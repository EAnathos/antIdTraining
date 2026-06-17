import { describe, expect, it } from 'vitest'
import { getReferenceHref } from '../../src/lib/referenceUtils'

describe('getReferenceHref', () => {
  it('returns null when url is absent', () => {
    expect(
      getReferenceHref({ url: null, type: 'MYRMECOLOGY' } as any),
    ).toBeNull()
  })

  it('prefixes MYRMECOLOGY non-http urls with doi.org', () => {
    expect(
      getReferenceHref({ url: '10.1234/test', type: 'MYRMECOLOGY' } as any),
    ).toBe('https://doi.org/10.1234/test')
  })

  it('returns url as-is for MYRMECOLOGY with http', () => {
    expect(
      getReferenceHref({
        url: 'https://example.com',
        type: 'MYRMECOLOGY',
      } as any),
    ).toBe('https://example.com')
  })

  it('returns url as-is for non-MYRMECOLOGY types', () => {
    expect(
      getReferenceHref({ url: 'https://example.com', type: 'BOOK' } as any),
    ).toBe('https://example.com')
  })
})
