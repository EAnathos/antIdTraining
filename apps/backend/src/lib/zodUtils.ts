import { z } from 'zod'
import { isCuid } from '@paralleldrive/cuid2'

/**
 * Zod schema for validating CUID IDs
 */
export const cuidSchema = z.string()
  .min(1, 'ID requis')
  .refine(isCuid, 'ID invalide')

/**
 * Creates a CUID validation schema with a custom error message
 */
export function cuidValidator(message: string = 'ID invalide') {
  return z.string()
    .min(1, 'ID requis')
    .refine(isCuid, message)
}

/**
 * Standard email validation with common constraints
 */
export const emailSchema = z.string()
  .email('Email invalide')
  .max(255, 'Email trop long')
  .toLowerCase()
  .trim()

/**
 * Standard URL validation
 */
export const urlSchema = z.string()
  .url('URL invalide')
  .max(2048, 'URL trop longue')
  .trim()
