import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn().mockReturnValue({}),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}))

import { main } from '../../scripts/delete-user.js'

const mockFindUnique = vi.fn()
const mockDelete = vi.fn()
const mockPrisma = {
  user: { findUnique: mockFindUnique, delete: mockDelete },
} as any

beforeEach(() => {
  mockFindUnique.mockReset()
  mockDelete.mockReset()
  delete process.env.USERNAME_TO_DELETE
})

describe('delete-user', () => {
  it('supprime un utilisateur existant', async () => {
    process.env.USERNAME_TO_DELETE = 'alice'

    mockFindUnique.mockResolvedValue({
      id: 'u1',
      username: 'alice',
      role: 'USER',
    })
    mockDelete.mockResolvedValue(undefined)

    await main(mockPrisma)

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { username: 'alice' },
      select: { id: true, username: true, role: true },
    })
    expect(mockDelete).toHaveBeenCalledWith({ where: { username: 'alice' } })
  })

  it('lève une erreur si USERNAME_TO_DELETE est absent', async () => {
    await expect(main(mockPrisma)).rejects.toThrow(
      'USERNAME_TO_DELETE est requis',
    )
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it("lève une erreur si l'utilisateur est introuvable", async () => {
    process.env.USERNAME_TO_DELETE = 'inconnu'
    mockFindUnique.mockResolvedValue(null)

    await expect(main(mockPrisma)).rejects.toThrow(
      'Utilisateur introuvable: inconnu',
    )
    expect(mockDelete).not.toHaveBeenCalled()
  })
})
