import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  recordAdminAudit: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import { adminStatsToolsRouter } from '../../src/routes/adminStatsTools.js'

const { getBaseUrl } = createTestServer(
  '/api/admin/stats-tools',
  adminStatsToolsRouter,
)

beforeEach(() => {
  resetSharedMocks()
  mocks.recordAdminAudit.mockReset()
})

describe('POST /api/admin/stats-tools/reset', () => {
  it('deletes all game sessions and returns 204', async () => {
    prismaMocks.gameSession.deleteMany = vi.fn().mockResolvedValue({ count: 5 })
    mocks.recordAdminAudit.mockResolvedValue(undefined)

    const res = await fetch(`${getBaseUrl()}/api/admin/stats-tools/reset`, {
      method: 'POST',
    })

    expect(res.status).toBe(204)
    expect(prismaMocks.gameSession.deleteMany).toHaveBeenCalledWith({})
    expect(mocks.recordAdminAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'Statistiques réinitialisées',
        detail: '5 sessions supprimées',
      }),
    )
  })
})
