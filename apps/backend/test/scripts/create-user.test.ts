import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed_password') },
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn().mockReturnValue({}),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
  UserRole: { ADMIN: 'ADMIN', USER: 'USER' },
}))

import { main } from '../../scripts/create-user.js'

const mockUpsert = vi.fn()
const mockPrisma = { user: { upsert: mockUpsert } } as any

beforeEach(() => {
  mockUpsert.mockReset()
  delete process.env.USERNAME_TO_CREATE
  delete process.env.EMAIL_TO_CREATE
  delete process.env.PASSWORD_TO_CREATE
  delete process.env.ROLE_TO_CREATE
})

describe('create-user', () => {
  it('crée un utilisateur admin', async () => {
    process.env.USERNAME_TO_CREATE = 'admin'
    process.env.EMAIL_TO_CREATE = 'admin@example.com'
    process.env.PASSWORD_TO_CREATE = 'secret'
    process.env.ROLE_TO_CREATE = 'ADMIN'

    mockUpsert.mockResolvedValue({
      id: 'c1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'ADMIN',
    })

    await main(mockPrisma)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { username: 'admin' },
        create: expect.objectContaining({
          username: 'admin',
          email: 'admin@example.com',
          role: 'ADMIN',
          passwordHash: 'hashed_password',
        }),
        update: expect.objectContaining({
          email: 'admin@example.com',
          role: 'ADMIN',
          passwordHash: 'hashed_password',
        }),
      }),
    )
  })

  it("crée un utilisateur USER par défaut si ROLE_TO_CREATE n'est pas ADMIN", async () => {
    process.env.USERNAME_TO_CREATE = 'joueur'
    process.env.EMAIL_TO_CREATE = 'joueur@example.com'
    process.env.PASSWORD_TO_CREATE = 'secret'
    process.env.ROLE_TO_CREATE = 'USER'

    mockUpsert.mockResolvedValue({
      id: 'c2',
      username: 'joueur',
      email: 'joueur@example.com',
      role: 'USER',
    })

    await main(mockPrisma)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ role: 'USER' }),
      }),
    )
  })

  it('lève une erreur si les variables obligatoires sont absentes', async () => {
    await expect(main(mockPrisma)).rejects.toThrow(
      'USERNAME_TO_CREATE, EMAIL_TO_CREATE et PASSWORD_TO_CREATE sont requis',
    )
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('lève une erreur si EMAIL_TO_CREATE est absent', async () => {
    process.env.USERNAME_TO_CREATE = 'admin'
    process.env.PASSWORD_TO_CREATE = 'secret'

    await expect(main(mockPrisma)).rejects.toThrow(
      'USERNAME_TO_CREATE, EMAIL_TO_CREATE et PASSWORD_TO_CREATE sont requis',
    )
  })
})
