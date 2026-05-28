import type { NextFunction, Request, Response } from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import { ZodError } from 'zod'
import { AppError, isErrorWithCode } from '../lib/errors.js'
import { logger } from '../lib/logger.js'

type PrismaUniqueConflictError = {
  code: string
  meta?: {
    target?: string | string[]
  }
}

function getUniqueConflictFields(error: unknown) {
  if (!isErrorWithCode(error) || error.code !== 'P2002') {
    return null
  }

  const prismaError = error as PrismaUniqueConflictError
  const { target } = prismaError.meta ?? {}

  if (Array.isArray(target)) {
    const fields = target.filter(
      (field): field is string => typeof field === 'string' && field.length > 0,
    )
    return fields.length > 0 ? fields : null
  }

  if (typeof target === 'string' && target.length > 0) {
    return [target]
  }

  return null
}

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ message: 'Route introuvable.' })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message })
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    (error as { type?: string }).type === 'entity.too.large'
  ) {
    return res.status(413).json({ message: 'Snapshot trop volumineux.' })
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Archive trop volumineuse.' })
    }

    return res.status(400).json({ message: 'Requête invalide.' })
  }

  if (error instanceof ZodError) {
    const flattened = error.flatten()
    return res.status(400).json({
      message: 'Requête invalide.',
      errors: flattened.fieldErrors,
      formErrors: flattened.formErrors,
    })
  }

  if (isErrorWithCode(error) && error.code === 'P2025') {
    return res.status(404).json({ message: 'Ressource introuvable.' })
  }

  if (isErrorWithCode(error) && error.code === 'P2002') {
    const fields = getUniqueConflictFields(error)
    return res.status(409).json({
      message:
        fields && fields.length > 0
          ? `La valeur pour "${fields.join('", "')}" existe déjà.`
          : 'Conflit : la ressource existe déjà.',
      field: fields?.[0] ?? null,
      fields: fields ?? undefined,
    })
  }

  const errorId = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
  logger.error(
    { err: error, errorId, method: _req.method, path: _req.originalUrl },
    'Unhandled error in request',
  )

  return res.status(500).json({
    message: 'Erreur interne du serveur.',
    errorId,
  })
}
