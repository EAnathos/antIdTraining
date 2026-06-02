export function normalizeDepartment(value: string) {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '')
  if (!cleaned) return ''
  if (cleaned === '2A' || cleaned === '2B') return cleaned
  if (/^\d{1,3}$/.test(cleaned)) {
    if (cleaned.length <= 2) return cleaned.padStart(2, '0')
    return cleaned
  }
  return value.trim()
}

export function parseDepartmentInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  const matchCodeWithLabel = trimmed.match(/^(\d{1,3}|2A|2B)\s*[-–—]/i)
  if (matchCodeWithLabel) {
    return normalizeDepartment(matchCodeWithLabel[1])
  }

  if (/^(\d{1,3}|2A|2B)$/i.test(trimmed)) {
    return normalizeDepartment(trimmed)
  }

  return trimmed
}
