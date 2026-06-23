import { prisma } from '../prisma.js'
import {
  registeredUsersTotal,
  observationEntriesTotal,
  entryImagesTotal,
  suggestionsTotal,
  entryProposalsTotal,
  gameSessionsTotal,
  referencesTotal,
  taxonsTotal,
} from './metrics.js'

export async function syncBusinessMetrics() {
  const [
    users,
    entries,
    images,
    suggestions,
    proposals,
    sessions,
    references,
    taxons,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.observationEntry.count(),
    prisma.entryImage.count(),
    prisma.suggestion.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.entryProposal.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.gameSession.groupBy({
      by: ['level', 'finalCorrect'],
      _count: { _all: true },
    }),
    prisma.reference.groupBy({ by: ['type'], _count: { _all: true } }),
    prisma.taxon.groupBy({
      by: ['subfamily', 'genus'],
      _count: { _all: true },
    }),
  ])

  registeredUsersTotal.set(users)
  observationEntriesTotal.set(entries)
  entryImagesTotal.set(images)

  for (const row of suggestions) {
    suggestionsTotal.set({ status: row.status.toLowerCase() }, row._count._all)
  }

  for (const row of proposals) {
    entryProposalsTotal.set(
      { status: row.status.toLowerCase() },
      row._count._all,
    )
  }

  for (const row of sessions) {
    const outcome =
      row.finalCorrect === true
        ? 'correct'
        : row.finalCorrect === false
          ? 'incorrect'
          : 'abandoned'
    gameSessionsTotal.set(
      { level: row.level.toLowerCase(), outcome },
      row._count._all,
    )
  }

  for (const row of references) {
    referencesTotal.set({ type: row.type.toLowerCase() }, row._count._all)
  }

  for (const row of taxons) {
    taxonsTotal.set(
      { subfamily: row.subfamily, genus: row.genus },
      row._count._all,
    )
  }
}
