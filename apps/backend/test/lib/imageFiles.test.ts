import fs from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  RESPONSIVE_IMAGE_WIDTHS,
  getResponsiveUploadFileNames,
  getUploadBaseFileName,
  listUploadFileNames,
  resolveUploadFilePath,
  uploadsDir,
  deleteUploadFilesForImageUrl,
  ensureUploadsDir,
} from '../../src/lib/imageFiles.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('image file helpers', () => {
  it('extracts the base file name from an image URL', () => {
    expect(
      getUploadBaseFileName('https://example.com/uploads/queen.webp'),
    ).toBe('queen.webp')
  })

  it('builds responsive variant names from the uploaded file name', () => {
    const result = getResponsiveUploadFileNames('/uploads/queen.webp')

    expect(result.baseFileName).toBe('queen.webp')
    expect(result.variantFileNames).toEqual([
      'queen-480.webp',
      'queen-960.webp',
    ])
    expect(result.variantFileNames).toHaveLength(RESPONSIVE_IMAGE_WIDTHS.length)
  })

  it('resolves a file path under the uploads directory', () => {
    expect(resolveUploadFilePath('queen.webp')).toContain('/uploads/queen.webp')
  })

  it('uses .webp extension when the source file has none', () => {
    const result = getResponsiveUploadFileNames('/uploads/queen')

    expect(result.baseFileName).toBe('queen')
    expect(result.variantFileNames).toEqual([
      'queen-480.webp',
      'queen-960.webp',
    ])
  })

  it('creates uploads directory when missing', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false)
    const mkdirSpy = vi
      .spyOn(fs, 'mkdirSync')
      .mockImplementation(() => undefined)

    const result = ensureUploadsDir()

    expect(result).toBe(uploadsDir)
    expect(existsSpy).toHaveBeenCalledWith(uploadsDir)
    expect(mkdirSpy).toHaveBeenCalledWith(uploadsDir, { recursive: true })
  })

  it('lists only files in uploads directory', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true)
    vi.spyOn(fs, 'readdirSync').mockReturnValue([
      { isFile: () => true, name: 'queen.webp' },
      { isFile: () => false, name: 'nested' },
    ] as fs.Dirent[])

    expect(listUploadFileNames()).toEqual(['queen.webp'])
  })

  it('deletes base and responsive variants for an uploaded image', () => {
    const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => undefined)

    deleteUploadFilesForImageUrl('/uploads/queen.webp')

    expect(rmSpy).toHaveBeenCalledTimes(3)
    expect(rmSpy).toHaveBeenNthCalledWith(
      1,
      resolveUploadFilePath('queen.webp'),
      { force: true },
    )
    expect(rmSpy).toHaveBeenNthCalledWith(
      2,
      resolveUploadFilePath('queen-480.webp'),
      { force: true },
    )
    expect(rmSpy).toHaveBeenNthCalledWith(
      3,
      resolveUploadFilePath('queen-960.webp'),
      { force: true },
    )
  })
})
