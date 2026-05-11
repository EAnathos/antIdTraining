import { z } from 'zod'
import { prisma } from '../prisma.js'
import { getTaxonCatalog } from '../lib/taxonCatalog.js'
import { AppError } from '../lib/errors.js'

export type GameLevel = 'easy' | 'medium' | 'hard'

export const validateGameAnswerSchema = z.object({
  level: z.enum(['easy', 'medium', 'hard']),
  selected: z
    .object({
      subfamily: z.string().optional(),
      genus: z.string().optional(),
      species: z.string().optional(),
    })
    .default({}),
  answer: z
    .object({
      subfamily: z.string().optional(),
      genus: z.string().optional(),
      species: z.string().optional(),
    })
    .default({}),
  entryId: z.string().optional(),
  sessionId: z.string().optional(),
})

function normalizeGameLevel(value: unknown): GameLevel {
  const level = String(value ?? 'easy').toLowerCase()
  if (level === 'medium' || level === 'hard') {
    return level
  }

  return 'easy'
}

function toDbGameDifficulty(level: GameLevel): 'EASY' | 'MEDIUM' | 'HARD' {
  if (level === 'medium') return 'MEDIUM'
  if (level === 'hard') return 'HARD'
  return 'EASY'
}

function randomPick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]) {
  const result = [...arr]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

function uniqueShuffled<T>(arr: T[]) {
  return shuffle(Array.from(new Set(arr)))
}

function buildChoices<T>(answer: T, candidates: T[], maxChoices: number) {
  const wrongChoices = uniqueShuffled(candidates.filter((candidate) => candidate !== answer)).slice(0, Math.max(maxChoices - 1, 0))
  return uniqueShuffled([answer, ...wrongChoices])
}

async function resolveEntrySize(entry: { species?: string | null; genus?: string | null; subfamily: string; }) {
  // Try most specific profile first: SPECIES, then GENUS, then SUBFAMILY
  // Return worker size since it's the most common caste
  if (entry.species && entry.genus) {
    const p = await prisma.taxonLevelProfile.findUnique({
      where: { level_value_genusValue: { level: 'SPECIES', value: entry.species, genusValue: entry.genus } },
      include: { criteria: { orderBy: { position: 'asc' } } },
    })
    if (p?.sizeWorker) return p.sizeWorker

    const shared = await prisma.taxonLevelProfile.findFirst({ where: { level: 'SPECIES', value: entry.species, genusValue: null } })
    if (shared?.sizeWorker) return shared.sizeWorker
  }

  if (entry.genus) {
    const p = await prisma.taxonLevelProfile.findFirst({
      where: { level: 'GENUS', value: entry.genus, genusValue: null },
      include: { criteria: { orderBy: { position: 'asc' } } },
    })
    if (p?.sizeWorker) return p.sizeWorker
  }

  if (entry.subfamily) {
    const p = await prisma.taxonLevelProfile.findFirst({
      where: { level: 'SUBFAMILY', value: entry.subfamily, genusValue: null },
      include: { criteria: { orderBy: { position: 'asc' } } },
    })
    if (p?.sizeWorker) return p.sizeWorker
  }

  return null
}

export async function getGameQuestion(rawLevel: unknown, userId?: string | null) {
  const level = normalizeGameLevel(rawLevel)

  const entries = await prisma.observationEntry.findMany({
    select: {
      id: true,
      taxonLevel: true,
      subfamily: true,
      genus: true,
      species: true,
      size: true,
      department: true,
      observedAt: true,
      biotope: true,
      photoCredit: true,
      images: {
        select: { imageUrl: true },
      },
    },
  })

  if (!entries.length) {
    throw new AppError(404, 'Aucune entrée disponible.')
  }

  if (level === 'easy') {
    const entry = randomPick(entries)
    const images = entry.images.map((item) => item.imageUrl)

    const taxonCatalog = await getTaxonCatalog()
    const availableSubfamilies = taxonCatalog.subfamilies
    const fallbackSubfamilies = uniqueShuffled(entries.map((item) => item.subfamily))
    const choices = buildChoices(entry.subfamily, availableSubfamilies.length ? availableSubfamilies : fallbackSubfamilies, 5)

    const session = await prisma.gameSession.create({
      data: {
        level: toDbGameDifficulty(level),
        entryId: entry.id,
        ...(userId ? { userId } : {}),
      },
    })

    return {
      level,
      entryId: entry.id,
      sessionId: session.id,
      images,
      prompt: 'Identifier la sous-famille',
      details: {
        size: await resolveEntrySize(entry),
        department: entry.department,
        observedAt: entry.observedAt.toISOString(),
        biotope: entry.biotope,
        photoCredit: entry.photoCredit,
      },
      choices,
      answer: { subfamily: entry.subfamily },
    }
  }

  const taxonCatalog = await getTaxonCatalog()
  const allTaxons = taxonCatalog.items

  if (level === 'medium') {
    const mediumEntries = entries.filter((entry) => !!entry.genus)
    if (!mediumEntries.length) {
      throw new AppError(404, 'Aucune entrée disponible pour le niveau moyen.')
    }

    const entry = randomPick(mediumEntries)
    const images = entry.images.map((item) => item.imageUrl)

    const subfamilyChoices = buildChoices(entry.subfamily, uniqueShuffled(allTaxons.map((t) => t.subfamily)).slice(0, 5), 5)

    const genusCandidates = uniqueShuffled(
      allTaxons
        .filter((t) => t.subfamily === entry.subfamily)
        .map((t) => t.genus),
    )

    const genusWrong = uniqueShuffled(
      allTaxons
        .filter((t) => t.subfamily !== entry.subfamily)
        .map((t) => t.genus),
    ).slice(0, 3)

    const genusChoices = buildChoices(entry.genus!, [...genusCandidates.slice(0, 2), ...genusWrong], 6)

    const session = await prisma.gameSession.create({
      data: {
        level: toDbGameDifficulty(level),
        entryId: entry.id,
        ...(userId ? { userId } : {}),
      },
    })

    return {
      level,
      entryId: entry.id,
      sessionId: session.id,
      images,
      prompt: 'Identifier la sous-famille puis le genre',
      details: {
        size: await resolveEntrySize(entry),
        department: entry.department,
        observedAt: entry.observedAt.toISOString(),
        biotope: entry.biotope,
        photoCredit: entry.photoCredit,
      },
      choices: {
        subfamily: subfamilyChoices,
        genus: genusChoices,
      },
      answer: {
        subfamily: entry.subfamily,
        genus: entry.genus,
      },
    }
  }

  const hardEntries = entries.filter((entry) => entry.taxonLevel === 'SPECIES' && !!entry.genus && !!entry.species)
  if (!hardEntries.length) {
    throw new AppError(404, 'Aucune entrée disponible pour le niveau difficile.')
  }

  const entry = randomPick(hardEntries)
  const images = entry.images.map((item) => item.imageUrl)

  const subfamilyChoices = buildChoices(entry.subfamily, uniqueShuffled(allTaxons.map((t) => t.subfamily)).slice(0, 5), 5)

  const genusCandidates = uniqueShuffled(
    allTaxons
      .filter((t) => t.subfamily === entry.subfamily)
      .map((t) => t.genus),
  )

  const genusWrong = uniqueShuffled(
    allTaxons
      .filter((t) => t.subfamily !== entry.subfamily)
      .map((t) => t.genus),
  ).slice(0, 3)

  const genusChoices = buildChoices(entry.genus!, [...genusCandidates.slice(0, 2), ...genusWrong], 6)

  const speciesCandidates = uniqueShuffled(
    allTaxons.filter((t) => t.genus === entry.genus).map((t) => t.species),
  )
  const speciesWrong = uniqueShuffled(
    allTaxons.filter((t) => t.genus !== entry.genus).map((t) => t.species),
  ).slice(0, 4)
  const speciesChoices = buildChoices(entry.species!, [...speciesCandidates.slice(0, 2), ...speciesWrong], 6)

  const session = await prisma.gameSession.create({
    data: {
      level: toDbGameDifficulty(level),
      entryId: entry.id,
      ...(userId ? { userId } : {}),
    },
  })

  return {
    level: 'hard',
    entryId: entry.id,
    sessionId: session.id,
    images,
    prompt: "Identifier la sous-famille, le genre et l'espèce",
    details: {
      size: await resolveEntrySize(entry),
      department: entry.department,
      observedAt: entry.observedAt.toISOString(),
      biotope: entry.biotope,
      photoCredit: entry.photoCredit,
    },
    choices: {
      subfamily: subfamilyChoices,
      genus: genusChoices,
      species: speciesChoices,
    },
    answer: {
      subfamily: entry.subfamily,
      genus: entry.genus,
      species: entry.species,
    },
  }
}

export async function validateGameAnswer(input: z.infer<typeof validateGameAnswerSchema>) {
  const { level, selected, answer, entryId, sessionId } = input

  if (!entryId && !answer?.subfamily) {
    throw new AppError(400, 'Le champ entryId est requis pour valider la réponse.')
  }

  const entry = entryId
    ? await prisma.observationEntry.findUnique({
        where: { id: entryId },
      })
    : null

  if (entryId && !entry) {
    throw new AppError(404, 'Entrée introuvable pour cette question.')
  }

  const session = sessionId
    ? await prisma.gameSession.findUnique({
        where: { id: sessionId },
      })
    : null

  if (sessionId && !session) {
    throw new AppError(404, 'Session de jeu introuvable.')
  }

  const requestedLevel = normalizeGameLevel(level)
  const shouldPersistFinalResult = !!session && session.level === toDbGameDifficulty(requestedLevel)

  async function persistFinalResult(correct: boolean) {
    if (!shouldPersistFinalResult || !session) {
      return
    }

    await prisma.gameSession.updateMany({
      where: {
        id: session.id,
        finalCorrect: null,
      },
      data: {
        finalCorrect: correct,
        validatedAt: new Date(),
      },
    })
  }

  const resolvedAnswer = {
    subfamily: entry?.subfamily ?? answer?.subfamily,
    genus: entry?.genus ?? answer?.genus,
    species: entry?.species ?? answer?.species,
  }

  const subfamilyProfile = resolvedAnswer.subfamily
    ? await prisma.taxonLevelProfile.findFirst({
        where: {
          level: 'SUBFAMILY',
          value: resolvedAnswer.subfamily,
          genusValue: null,
        },
        include: {
          criteria: {
            orderBy: { position: 'asc' },
          },
        },
      })
    : null

  const genusProfile = resolvedAnswer.genus
    ? await prisma.taxonLevelProfile.findFirst({
        where: {
          level: 'GENUS',
          value: resolvedAnswer.genus,
          genusValue: null,
        },
        include: {
          criteria: {
            orderBy: { position: 'asc' },
          },
        },
      })
    : null

  const identification = {
    subfamily: {
      value: resolvedAnswer.subfamily ?? null,
      description: subfamilyProfile?.description ?? null,
      criteria: (subfamilyProfile?.criteria ?? []).map((criterion) => criterion.label),
    },
    genus: {
      value: resolvedAnswer.genus ?? null,
      description: genusProfile?.description ?? null,
      criteria: (genusProfile?.criteria ?? []).map((criterion) => criterion.label),
    },
  }

  const identificationSize = await resolveEntrySize({ species: resolvedAnswer.species ?? null, genus: resolvedAnswer.genus ?? null, subfamily: resolvedAnswer.subfamily ?? '' })

  const subfamilyOk = selected.subfamily === resolvedAnswer.subfamily
  if (!subfamilyOk) {
    await persistFinalResult(false)
    return {
      correct: false,
      reason: 'Sous-famille incorrecte',
      identification: {
        ...identification,
        size: identificationSize ?? null,
      },
    }
  }

  if (level === 'easy') {
    await persistFinalResult(true)
    return {
      correct: true,
      identification: {
        ...identification,
        size: identificationSize ?? null,
      },
    }
  }

  const genusOk = selected.genus === resolvedAnswer.genus
  if (!genusOk) {
    await persistFinalResult(false)
    return {
      correct: false,
      reason: 'Genre incorrect',
      identification: {
        ...identification,
        size: identificationSize ?? null,
      },
    }
  }

  if (level === 'medium') {
    await persistFinalResult(true)
    return {
      correct: true,
      identification: {
        ...identification,
        size: identificationSize ?? null,
      },
    }
  }

  const speciesOk = selected.species === resolvedAnswer.species
  if (!speciesOk) {
    await persistFinalResult(false)
    return {
      correct: false,
      reason: 'Espèce incorrecte',
      identification: {
        ...identification,
        size: identificationSize ?? null,
      },
    }
  }

  await persistFinalResult(true)
  return {
    correct: true,
    identification: {
      ...identification,
      size: identificationSize ?? null,
    },
  }
}
