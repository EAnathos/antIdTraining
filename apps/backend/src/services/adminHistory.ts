import { prisma } from '../prisma.js'

type AdminHistoryTone = 'SUCCESS' | 'ERROR' | 'INFO'

type CreateAdminHistoryEventInput = {
  action: string
  detail: string
  tone?: AdminHistoryTone
  actorUserId?: string | null
  actorUsername?: string | null
  entityType?: string | null
  entityId?: string | null
}

export async function createAdminHistoryEvent(input: CreateAdminHistoryEventInput) {
  return prisma.adminHistoryEvent.create({
    data: {
      action: input.action,
      detail: input.detail,
      tone: input.tone ?? 'INFO',
      actorUserId: input.actorUserId ?? null,
      actorUsername: input.actorUsername ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  })
}

export async function listAdminHistoryEvents(limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, limit))

  const events = await prisma.adminHistoryEvent.findMany({
    take: safeLimit,
    orderBy: { createdAt: 'desc' },
  })

  return events.map((event) => ({
    id: event.id,
    at: event.createdAt.toISOString(),
    title: event.action,
    detail: event.detail,
    tone: event.tone.toLowerCase() as 'success' | 'error' | 'info',
  }))
}
