import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'
import dotenv from 'dotenv'
import { createPrisma } from './_prisma.js'

dotenv.config()

export async function main(prisma = createPrisma()) {
  const username = process.env.USERNAME_TO_CREATE?.trim()
  const email = process.env.EMAIL_TO_CREATE?.trim()
  const password = process.env.PASSWORD_TO_CREATE?.trim()
  const roleInput = process.env.ROLE_TO_CREATE?.trim().toUpperCase()

  if (!username || !email || !password) {
    throw new Error(
      'USERNAME_TO_CREATE, EMAIL_TO_CREATE et PASSWORD_TO_CREATE sont requis',
    )
  }

  const role: UserRole = roleInput === 'ADMIN' ? UserRole.ADMIN : UserRole.USER

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      email,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      passwordHash,
      role,
    },
    create: {
      username,
      email,
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationTokenExpiresAt: null,
      passwordHash,
      role,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
    },
  })

  console.log(
    `Utilisateur prêt: ${user.username} <${user.email}> (${user.role})`,
  )
}

if (process.env.NODE_ENV !== 'test') {
  const prisma = createPrisma()
  main(prisma)
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (error) => {
      console.error(error)
      await prisma.$disconnect()
      process.exit(1)
    })
}
