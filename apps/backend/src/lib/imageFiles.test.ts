import { describe, expect, it } from 'vitest'

import {
  RESPONSIVE_IMAGE_WIDTHS,
  getResponsiveUploadFileNames,
  getUploadBaseFileName,
  resolveUploadFilePath,
} from './imageFiles.js'

describe('image file helpers', () => {
  it('extracts the base file name from an image URL', () => {
    expect(getUploadBaseFileName('https://example.com/uploads/queen.webp')).toBe('queen.webp')
  })

  it('builds responsive variant names from the uploaded file name', () => {
    const result = getResponsiveUploadFileNames('/uploads/queen.webp')

    expect(result.baseFileName).toBe('queen.webp')
    expect(result.variantFileNames).toEqual(['queen-480.webp', 'queen-960.webp'])
    expect(result.variantFileNames).toHaveLength(RESPONSIVE_IMAGE_WIDTHS.length)
  })

  it('resolves a file path under the uploads directory', () => {
    expect(resolveUploadFilePath('queen.webp')).toContain('/uploads/queen.webp')
  })
})