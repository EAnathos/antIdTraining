import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'change-me',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@antid.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'admin123',
}
