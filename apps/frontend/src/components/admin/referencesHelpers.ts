export function normalizeAuthors(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}
