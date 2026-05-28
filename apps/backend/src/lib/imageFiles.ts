import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const uploadsDir = path.resolve(currentDir, '../../uploads')

export const RESPONSIVE_IMAGE_WIDTHS = [480, 960] as const

export function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  return uploadsDir
}

export function resolveUploadFilePath(fileName: string) {
  return path.join(uploadsDir, fileName)
}

export function getUploadBaseFileName(imageUrl: string) {
  return path.basename(imageUrl)
}

export function getResponsiveUploadFileNames(imageUrl: string) {
  const baseFileName = getUploadBaseFileName(imageUrl)
  const originalExtension = path.extname(baseFileName)
  const extension = originalExtension || '.webp'
  const stem = originalExtension
    ? baseFileName.slice(0, -originalExtension.length)
    : baseFileName

  return {
    baseFileName,
    variantFileNames: RESPONSIVE_IMAGE_WIDTHS.map(
      (width) => `${stem}-${width}${extension}`,
    ),
  }
}

export function deleteUploadFilesForImageUrl(imageUrl: string) {
  const { baseFileName, variantFileNames } =
    getResponsiveUploadFileNames(imageUrl)
  const fileNames = [baseFileName, ...variantFileNames]

  for (const fileName of fileNames) {
    fs.rmSync(resolveUploadFilePath(fileName), { force: true })
  }
}

export function listUploadFileNames() {
  ensureUploadsDir()

  return fs
    .readdirSync(uploadsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
}
