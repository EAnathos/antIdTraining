import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

const mocks = vi.hoisted(() => ({
  createAdminHistoryEvent: vi.fn(),
}))

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/services/adminHistory.js', () => ({
  createAdminHistoryEvent: mocks.createAdminHistoryEvent,
}))

import { recordAdminAudit } from '../../src/lib/adminAudit.js'
import type { Request } from 'express'

function makeReq(userId?: string): Request {
  return { user: userId ? { userId, role: 'ADMIN' } : undefined } as any
}

beforeEach(() => {
  resetSharedMocks()
  mocks.createAdminHistoryEvent.mockReset()
})

describe('recordAdminAudit', () => {
  it('creates event with actor info when user is found', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ username: 'admin' })
    mocks.createAdminHistoryEvent.mockResolvedValue(undefined)

    await recordAdminAudit(makeReq('u1'), {
      action: 'Test',
      detail: 'some detail',
      tone: 'SUCCESS',
    })

    expect(mocks.createAdminHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Test',
        actorUserId: 'u1',
        actorUsername: 'admin',
        tone: 'SUCCESS',
      }),
    )
  })

  it('uses unknown actor label when no user on request', async () => {
    mocks.createAdminHistoryEvent.mockResolvedValue(undefined)

    await recordAdminAudit(makeReq(), {
      action: 'Test',
      detail: 'detail',
    })

    expect(mocks.createAdminHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining('utilisateur inconnu'),
        actorUserId: null,
        actorUsername: null,
      }),
    )
  })

  it('uses userId as label when user record not found in DB', async () => {
    prismaMocks.user.findUnique.mockResolvedValue(null)
    mocks.createAdminHistoryEvent.mockResolvedValue(undefined)

    await recordAdminAudit(makeReq('u-unknown'), {
      action: 'Test',
      detail: 'detail',
    })

    expect(mocks.createAdminHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining('u-unknown'),
        actorUserId: null,
        actorUsername: null,
      }),
    )
  })

  it('swallows errors from createAdminHistoryEvent', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ username: 'admin' })
    mocks.createAdminHistoryEvent.mockRejectedValue(new Error('DB down'))

    await expect(
      recordAdminAudit(makeReq('u1'), { action: 'Test', detail: 'detail' }),
    ).resolves.toBeUndefined()
  })

  it('passes entityType and entityId through', async () => {
    prismaMocks.user.findUnique.mockResolvedValue({ username: 'admin' })
    mocks.createAdminHistoryEvent.mockResolvedValue(undefined)

    await recordAdminAudit(makeReq('u1'), {
      action: 'Delete',
      detail: 'entry removed',
      entityType: 'entry',
      entityId: 'e1',
    })

    expect(mocks.createAdminHistoryEvent).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'entry', entityId: 'e1' }),
    )
  })
})
