import dotenv from 'dotenv'

dotenv.config()

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} manquant dans les variables d'environnement`)
  }

  return value
}

function requiredProductionEnv(name: string) {
  const value = process.env[name]
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`${name} doit être défini en production`)
  }

  return value ?? null
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: requiredEnv('JWT_SECRET'),
  dataEncryptionKey: requiredProductionEnv('DATA_ENCRYPTION_KEY') ?? process.env.ENCRYPTION_KEY ?? null,
  resendApiKey: process.env.RESEND_API_KEY ?? null,
  resendFrom: process.env.RESEND_FROM ?? null,
  // Set to 'false' to disable sending login notification emails
  sendLoginNotificationEmails: (process.env.SEND_LOGIN_NOTIFICATION_EMAILS ?? 'true') !== 'false',
}
