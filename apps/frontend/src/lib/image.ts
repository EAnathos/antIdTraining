import { backendOrigin } from './api'

const RESPONSIVE_IMAGE_WIDTHS = [480, 960, 1600] as const

type ResponsiveImageOptions = {
  sizes?: string
}

function resolveAbsoluteImageUrl(imageUrl: string) {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  return `${backendOrigin}${imageUrl}`
}

function getVariantImageUrl(imageUrl: string, width: number) {
  const absoluteUrl = resolveAbsoluteImageUrl(imageUrl)
  if (width === 1600) {
    return absoluteUrl
  }

  const queryIndex = absoluteUrl.indexOf('?')
  const baseUrl = queryIndex >= 0 ? absoluteUrl.slice(0, queryIndex) : absoluteUrl
  const query = queryIndex >= 0 ? absoluteUrl.slice(queryIndex) : ''
  const extensionIndex = baseUrl.lastIndexOf('.')
  if (extensionIndex < 0) {
    return `${baseUrl}-${width}${query}`
  }

  return `${baseUrl.slice(0, extensionIndex)}-${width}${baseUrl.slice(extensionIndex)}${query}`
}

export function getResponsiveImageProps(imageUrl: string, options: ResponsiveImageOptions = {}) {
  const src = resolveAbsoluteImageUrl(imageUrl)
  const srcSet = RESPONSIVE_IMAGE_WIDTHS.map((width) => `${getVariantImageUrl(imageUrl, width)} ${width}w`).join(', ')

  return {
    src,
    srcSet,
    sizes: options.sizes ?? '(max-width: 768px) 100vw, 70vw',
  }
}
