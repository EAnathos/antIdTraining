import type { ReferenceItem } from '../types/models'

export function getReferenceHref(reference: ReferenceItem) {
  if (!reference.url) {
    return null
  }

  if (
    reference.type === 'MYRMECOLOGY' &&
    !/^https?:\/\//i.test(reference.url)
  ) {
    return `https://doi.org/${reference.url}`
  }

  return reference.url
}
