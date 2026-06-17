import { decryptSensitiveText } from './encryption.js'

export const MAX_SUGGESTIONS_PER_USER = 10

function dec(value: string | null): string | null {
  return value ? (decryptSensitiveText(value) ?? value) : value
}

export function publicSuggestion<
  T extends { name: string | null; email: string | null },
>(suggestion: T): T {
  return {
    ...suggestion,
    name: dec(suggestion.name),
    email: dec(suggestion.email),
  }
}
