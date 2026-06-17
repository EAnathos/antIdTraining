import type { ReferenceItem } from '../types/models'

export function getReferenceHref(reference: ReferenceItem) {
  if (!reference.url) {
    return null
  }

  if (
    reference.type === 'MYRMECOLOGY' &&
    !reference.url.startsWith('http://') &&
    !reference.url.startsWith('https://')
  ) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}
