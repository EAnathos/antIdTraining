import { decryptSensitiveText } from './encryption.js'

export const MAX_SUGGESTIONS_PER_USER = 10

export function publicSuggestion<
  T extends { name: string | null; email: string | null },
>(suggestion: T): T {
  return {
    ...suggestion,
    name: suggestion.name
      ? (decryptSensitiveText(suggestion.name) ?? suggestion.name)
      : suggestion.name,
    email: suggestion.email
      ? (decryptSensitiveText(suggestion.email) ?? suggestion.email)
      : suggestion.email,
  }
}
