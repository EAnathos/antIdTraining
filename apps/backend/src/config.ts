import dotenv from 'dotenv'

dotenv.config()

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} manquant dans les variables d'environnement`)
  }

  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: requiredEnv('JWT_SECRET'),
}
