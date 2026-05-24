import type { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * Wrapper pour les routes async qui capture les erreurs et les passe au middleware d'erreur.
 * Élimine le besoin de try-catch dans chaque route handler.
 *
 * Usage:
 * ```
 * router.post('/route', asyncHandler(async (req, res) => {
 *   // Code async sans try-catch
 *   const result = await someAsyncOperation()
 *   res.json(result)
 * }))
 * ```
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
