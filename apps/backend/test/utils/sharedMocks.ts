import { vi } from 'vitest'

export const prismaMocks = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  gameSession: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  observationEntry: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  entryImage: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}

export const commonMocks = {
  bcryptCompare: vi.fn(),
  bcryptHash: vi.fn(),
  jwtSign: vi.fn(),
  enforceIpRateLimit: vi.fn(),
  resetIpRateLimit: vi.fn(),
  getTaxonCatalog: vi.fn(),
  getTaxonLevelProfile: vi.fn(),
  resolveTaxonWorkerSize: vi.fn(),
  getGameEntriesCache: vi.fn(),
  loginAdmin: vi.fn(),
  registerUser: vi.fn(),
  getUserPoints: vi.fn(),
  getGameQuestion: vi.fn(),
  validateGameAnswer: vi.fn(),
  validateGameAnswerSchema: { safeParse: vi.fn() },
  sendLoginNotificationEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  verifyRegistrationEmail: vi.fn(),
}

export function resetSharedMocks() {
  const all = [prismaMocks, commonMocks]
  for (const group of all) {
    for (const key of Object.keys(group)) {
      const val = (group as any)[key]
      if (typeof val === 'function' && 'mockReset' in val) {
        val.mockReset()
      } else if (typeof val === 'object' && val !== null) {
        for (const subKey of Object.keys(val)) {
          const sub = (val as any)[subKey]
          if (sub && typeof sub.mockReset === 'function') sub.mockReset()
        }
      }
    }
  }
}
