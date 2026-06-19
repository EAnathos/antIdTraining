export function getErrorMessage(
  err: unknown,
  fallback = 'Une erreur est survenue',
): string {
  return err instanceof Error && err.message ? err.message : fallback
}
