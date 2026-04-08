import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import { ZodError } from 'zod'
import { AppError, isErrorWithCode } from '../lib/errors.js'

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({ message: 'Route introuvable.' })
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message })
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Archive trop volumineuse.' })
    }

    return res.status(400).json({ message: 'Requête invalide.' })
  }

  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Requête invalide.' })
  }

  if (isErrorWithCode(error) && error.code === 'P2025') {
    return res.status(404).json({ message: 'Ressource introuvable.' })
  }

  if (isErrorWithCode(error) && error.code === 'P2002') {
    return res.status(409).json({ message: 'Conflit : la ressource existe déjà.' })
  }

  return res.status(500).json({ message: 'Erreur interne du serveur.' })
}
