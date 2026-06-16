import { describe, expect, it, vi } from 'vitest'
import { createTestServer } from '../utils/testServer.js'

const mocks = vi.hoisted(() => ({
  listAdminHistoryEvents: vi.fn(),
}))

vi.mock('../../src/services/adminHistory.js', () => ({
  listAdminHistoryEvents: mocks.listAdminHistoryEvents,
}))

import { adminHistoryRouter } from '../../src/routes/adminHistory.js'

const { getBaseUrl } = createTestServer(
  '/api/admin/history',
  adminHistoryRouter,
)

describe('GET /api/admin/history', () => {
  it('returns history events', async () => {
    const events = [
      {
        id: 'e1',
        at: '2024-01-01T00:00:00.000Z',
        title: 'Action',
        detail: 'detail',
        tone: 'info',
      },
    ]
    mocks.listAdminHistoryEvents.mockResolvedValue(events)

    const res = await fetch(`${getBaseUrl()}/api/admin/history`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].title).toBe('Action')
    expect(mocks.listAdminHistoryEvents).toHaveBeenCalledWith(100)
  })
})
