import { backendOrigin } from '../../lib/api'

export function resolveImageUrl(imageUrl: string) {
  if (!imageUrl) {
    return imageUrl
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }

  return `${backendOrigin}${imageUrl}`
}
