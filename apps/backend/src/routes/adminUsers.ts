import { Router } from 'express'
import { z } from 'zod'
import { AppError } from '../lib/errors.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { prisma } from '../prisma.js'
import { recordAdminAudit } from '../lib/adminAudit.js'
import { buildUserPointRows } from '../services/stats.js'

const updatePointsSchema = z.object({
  points: z.number().int('Doit être un entier').gte(0, 'Doit être positif').lte(10000000, 'Valeur trop grande'),
})

export const adminUsersRouter = Router()

adminUsersRouter.get('/', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  })

  const pointRows = await buildUserPointRows(users.map((u) => u.id))

  const result = users.map((user) => {
    const pointRow = pointRows.find((p) => p.userId === user.id)
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      points: pointRow?.points ?? 0,
      createdAt: user.createdAt,
    }
  })

  return res.json(result)
}))

const GAME_POINTS_BY_LEVEL: Record<string, { correct: number; wrong: number }> = {
  EASY: { correct: 5, wrong: -2 },
  MEDIUM: { correct: 10, wrong: -5 },
  HARD: { correct: 15, wrong: -5 },
}

adminUsersRouter.put('/:id/points', asyncHandler(async (req, res) => {
  const parsed = updatePointsSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const user = await prisma.user.findUnique({
    where: { id: req.params.id as string },
    select: { id: true, username: true, role: true },
  })

  if (!user) {
    throw new AppError(404, 'Utilisateur introuvable.')
  }

  // Calculate game points for this user
  const grouped = await prisma.gameSession.groupBy({
    by: ['level', 'finalCorrect'],
    where: {
      userId: user.id,
      finalCorrect: { not: null },
    },
    _count: { _all: true },
  })

  let gamePointsTotal = 0
  grouped.forEach((group) => {
    const points = GAME_POINTS_BY_LEVEL[group.level]
    if (points) {
      gamePointsTotal += (group.finalCorrect === true ? points.correct : points.wrong) * group._count._all
    }
  })

  // Manual points = desired total - game points
  const manualPoints = parsed.data.points - gamePointsTotal

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { points: manualPoints },
  })

  await recordAdminAudit(req, {
    action: 'Mise à jour des points utilisateur',
    detail: `${user.username} a maintenant ${parsed.data.points} point(s).`,
    tone: 'SUCCESS',
    entityType: 'User',
    entityId: user.id,
  })

  return res.json({ id: updated.id, username: user.username, role: user.role, points: parsed.data.points })
}))