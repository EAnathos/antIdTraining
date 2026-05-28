import type { Request } from 'express'
import { prisma } from '../prisma.js'
import { createAdminHistoryEvent } from '../services/adminHistory.js'

type AdminHistoryTone = 'SUCCESS' | 'ERROR' | 'INFO'

type RecordAdminAuditInput = {
  action: string
  detail: string
  tone?: AdminHistoryTone
  entityType?: string
  entityId?: string
}

export async function recordAdminAudit(
  req: Request,
  input: RecordAdminAuditInput,
) {
  const tokenUserId = req.user?.userId ?? null
  let actorUserId: string | null = null
  let actorUsername: string | null = null

  if (tokenUserId) {
    const actor = await prisma.user.findUnique({
      where: { id: tokenUserId },
      select: { username: true },
    })
    if (actor) {
      actorUserId = tokenUserId
      actorUsername = actor.username
    }
  }

  const actorLabel = actorUsername ?? tokenUserId ?? 'utilisateur inconnu'

  try {
    await createAdminHistoryEvent({
      action: input.action,
      detail: `${input.detail} (par ${actorLabel}).`,
      tone: input.tone ?? 'INFO',
      actorUserId,
      actorUsername,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })
  } catch (error) {
    console.error('Erreur enregistrement historique admin:', error)
  }
}
