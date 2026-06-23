import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { Prisma } from '@prisma/client'
import { AppError } from '../lib/errors.js'
import { recordAdminAudit } from '../lib/adminAudit.js'
import { invalidateGameEntryCacheSafely } from '../lib/gameEntryCache.js'
import { syncBusinessMetrics } from '../lib/metrics.js'
import { decryptSensitiveText } from '../lib/encryption.js'

export const adminProposalsRouter = Router()

function publicProposal<T extends { photoCredit: string }>(proposal: T): T {
  return {
    ...proposal,
    photoCredit:
      decryptSensitiveText(proposal.photoCredit) ?? proposal.photoCredit,
  }
}

const approveProposalSchema = z
  .object({
    decision: z.enum(['ACCEPT', 'REJECT']),
    rejectionMessage: z
      .string()
      .min(10, 'Le message de refus doit contenir au moins 10 caractères.')
      .max(1000, 'Message trop long.')
      .trim()
      .optional(),
  })
  .refine(
    (data) =>
      data.decision !== 'REJECT' ||
      (data.rejectionMessage && data.rejectionMessage.length >= 10),
    {
      message: 'Un message de refus est obligatoire.',
      path: ['rejectionMessage'],
    },
  )

// Get all pending proposals
adminProposalsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined
    const userId = req.query.userId as string | undefined

    const where: Prisma.EntryProposalWhereInput = {}
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      where.status = status as any
    }
    if (userId) {
      where.userId = userId
    }

    const proposals = await prisma.entryProposal.findMany({
      where,
      include: {
        user: true,
        images: { orderBy: [{ position: 'asc' } as any, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    })

    return res.json(proposals.map((proposal) => publicProposal(proposal)))
  }),
)

// Accept or reject proposal
adminProposalsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const parsed = approveProposalSchema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Requête invalide.'
      throw new AppError(400, message)
    }

    const proposal = await prisma.entryProposal.findUnique({
      where: { id },
      include: { images: true, user: true },
    })

    if (!proposal) {
      throw new AppError(404, 'Proposition introuvable.')
    }

    if (parsed.data.decision === 'ACCEPT') {
      const createData: Prisma.ObservationEntryUncheckedCreateInput = {
        taxonLevel: proposal.taxonLevel,
        taxonValue: proposal.taxonValue,
        subfamily: proposal.subfamily,
        genus: proposal.genus,
        subgenus: proposal.subgenus,
        species: proposal.species,
        speciesGroup: proposal.speciesGroup,
        size: proposal.size,
        caste: proposal.caste,
        department: proposal.department,
        observedAt: proposal.observedAt,
        biotope: proposal.biotope,
        photoCredit:
          decryptSensitiveText(proposal.photoCredit) ?? proposal.photoCredit,
      }

      const created = await prisma.observationEntry.create({
        data: {
          ...createData,
          images: {
            create: proposal.images.map((img) => ({
              imageUrl: img.imageUrl,
              position: img.position,
            })),
          },
        },
        include: { images: true },
      })

      // Update proposal status
      await prisma.entryProposal.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          processedAt: new Date(),
        },
      })

      await recordAdminAudit(req, {
        action: "Proposition d'entrée acceptée",
        detail: `${created.subfamily} · ${created.genus ?? '-'} · ${created.species ?? '-'} (${created.department}) de ${proposal.user.username}`,
        tone: 'SUCCESS',
        entityType: 'entryProposal',
        entityId: id,
      })

      invalidateGameEntryCacheSafely('proposal accepted')
      void syncBusinessMetrics()

      return res.json({ status: 'ACCEPTED', entry: publicProposal(created) })
    } else {
      // Reject proposal
      const rejectionMessage =
        parsed.data.rejectionMessage || "Rejeté par l'administrateur."

      await prisma.entryProposal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionMessage,
          processedAt: new Date(),
        },
      })

      await recordAdminAudit(req, {
        action: "Proposition d'entrée rejetée",
        detail: `${proposal.subfamily} · ${proposal.genus ?? '-'} · ${proposal.species ?? '-'} (${proposal.department}) de ${proposal.user.username}`,
        tone: 'INFO',
        entityType: 'entryProposal',
        entityId: id,
      })

      return res.json({ status: 'REJECTED', rejectionMessage })
    }
  }),
)

adminProposalsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = req.params.id as string
    const proposal = await prisma.entryProposal.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!proposal) {
      throw new AppError(404, 'Proposition introuvable.')
    }

    if (proposal.status === 'PENDING') {
      throw new AppError(
        400,
        'Vous ne pouvez supprimer qu’une proposition déjà acceptée ou rejetée.',
      )
    }

    await prisma.entryProposal.delete({
      where: { id },
    })

    await recordAdminAudit(req, {
      action: 'Proposition d’entrée supprimée',
      detail: `${proposal.subfamily} · ${proposal.genus ?? '-'} · ${proposal.species ?? '-'} (${proposal.department})`,
      tone: 'INFO',
      entityType: 'entryProposal',
      entityId: id,
    })

    invalidateGameEntryCacheSafely('proposal rejected or deleted')
    void syncBusinessMetrics()

    return res.status(204).send()
  }),
)
