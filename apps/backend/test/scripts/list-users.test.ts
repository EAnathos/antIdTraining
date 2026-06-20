import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn().mockReturnValue({}),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}))

import { main } from '../../scripts/list-users.js'

const mockFindMany = vi.fn()
const mockPrisma = { user: { findMany: mockFindMany } } as any

beforeEach(() => {
  mockFindMany.mockReset()
})

describe('list-users', () => {
  it('affiche les utilisateurs', async () => {
    const now = new Date('2026-01-01T00:00:00Z')
    mockFindMany.mockResolvedValue([
      {
        username: 'alice',
        email: 'alice@example.com',
        role: 'ADMIN',
        createdAt: now,
        updatedAt: now,
      },
      {
        username: 'bob',
        email: null,
        role: 'USER',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(mockPrisma)

    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'asc' },
      select: {
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    expect(consoleSpy).toHaveBeenCalledTimes(2)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('alice'))
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('bob'))

    consoleSpy.mockRestore()
  })

  it("affiche un message si aucun utilisateur n'existe", async () => {
    mockFindMany.mockResolvedValue([])

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(mockPrisma)

    expect(consoleSpy).toHaveBeenCalledWith('Aucun utilisateur trouvé.')

    consoleSpy.mockRestore()
  })

  it("remplace l'email null par un tiret", async () => {
    const now = new Date()
    mockFindMany.mockResolvedValue([
      {
        username: 'sans-email',
        email: null,
        role: 'USER',
        createdAt: now,
        updatedAt: now,
      },
    ])

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main(mockPrisma)

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('—'))

    consoleSpy.mockRestore()
  })
})
