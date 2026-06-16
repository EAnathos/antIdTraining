import { describe, expect, it } from 'vitest'
import {
  upload,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
} from '../../src/middleware/upload.js'

describe('upload middleware constants', () => {
  it('MAX_IMAGE_SIZE_BYTES is 8 MB', () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(8 * 1024 * 1024)
  })

  it('ALLOWED_IMAGE_MIME_TYPES contains expected types', () => {
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/jpeg')).toBe(true)
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/png')).toBe(true)
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/webp')).toBe(true)
    expect(ALLOWED_IMAGE_MIME_TYPES.has('image/gif')).toBe(true)
    expect(ALLOWED_IMAGE_MIME_TYPES.has('application/pdf')).toBe(false)
  })

  it('upload is a multer instance with an array method', () => {
    expect(typeof upload.array).toBe('function')
    expect(typeof upload.single).toBe('function')
  })
})

describe('upload fileFilter', () => {
  function callFileFilter(mimetype: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const handler = (upload as any).fileFilter as (
        req: unknown,
        file: { mimetype: string },
        cb: (err: Error | null, accept?: boolean) => void,
      ) => void

      handler({}, { mimetype }, (err, accept) => {
        if (err) reject(err)
        else resolve(accept ?? false)
      })
    })
  }

  it('accepts image/jpeg', async () => {
    expect(await callFileFilter('image/jpeg')).toBe(true)
  })

  it('accepts image/png', async () => {
    expect(await callFileFilter('image/png')).toBe(true)
  })

  it('rejects application/pdf with ONLY_IMAGE_FILES error', async () => {
    await expect(callFileFilter('application/pdf')).rejects.toThrow(
      'ONLY_IMAGE_FILES',
    )
  })

  it('rejects text/plain with ONLY_IMAGE_FILES error', async () => {
    await expect(callFileFilter('text/plain')).rejects.toThrow(
      'ONLY_IMAGE_FILES',
    )
  })
})
