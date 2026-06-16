import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prismaMocks, resetSharedMocks } from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))

import {
  createAdminHistoryEvent,
  listAdminHistoryEvents,
} from '../../src/services/adminHistory.js'

// Extend prismaMocks with adminHistoryEvent mock
const adminHistoryMock = {
  create: vi.fn(),
  findMany: vi.fn(),
}
;(prismaMocks as any).adminHistoryEvent = adminHistoryMock

beforeEach(() => {
  resetSharedMocks()
  adminHistoryMock.create.mockReset()
  adminHistoryMock.findMany.mockReset()
})

describe('createAdminHistoryEvent', () => {
  it('creates an event with defaults', async () => {
    const event = {
      id: 'e1',
      action: 'Test action',
      detail: 'Test detail',
      tone: 'INFO',
      actorUserId: null,
      actorUsername: null,
      entityType: null,
      entityId: null,
      createdAt: new Date(),
    }
    adminHistoryMock.create.mockResolvedValue(event)

    const result = await createAdminHistoryEvent({
      action: 'Test action',
      detail: 'Test detail',
    })

    expect(adminHistoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'Test action',
          detail: 'Test detail',
          tone: 'INFO',
          actorUserId: null,
        }),
      }),
    )
    expect(result.id).toBe('e1')
  })

  it('passes explicit tone and actor info', async () => {
    adminHistoryMock.create.mockResolvedValue({
      id: 'e2',
      action: 'Delete',
      detail: 'something',
      tone: 'ERROR',
      actorUserId: 'u1',
      actorUsername: 'admin',
      entityType: 'entry',
      entityId: 'e1',
      createdAt: new Date(),
    })

    await createAdminHistoryEvent({
      action: 'Delete',
      detail: 'something',
      tone: 'ERROR',
      actorUserId: 'u1',
      actorUsername: 'admin',
      entityType: 'entry',
      entityId: 'e1',
    })

    expect(adminHistoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tone: 'ERROR',
          actorUserId: 'u1',
          actorUsername: 'admin',
        }),
      }),
    )
  })
})

describe('listAdminHistoryEvents', () => {
  it('returns mapped events in lowercase tone', async () => {
    adminHistoryMock.findMany.mockResolvedValue([
      {
        id: 'e1',
        action: 'Created',
        detail: 'detail',
        tone: 'SUCCESS',
        createdAt: new Date('2024-01-01'),
      },
    ])

    const result = await listAdminHistoryEvents(10)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'e1',
      title: 'Created',
      detail: 'detail',
      tone: 'success',
    })
    expect(result[0].at).toBe(new Date('2024-01-01').toISOString())
  })

  it('clamps limit between 1 and 200', async () => {
    adminHistoryMock.findMany.mockResolvedValue([])

    await listAdminHistoryEvents(999)
    expect(adminHistoryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    )

    await listAdminHistoryEvents(0)
    expect(adminHistoryMock.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 }),
    )
  })
})
