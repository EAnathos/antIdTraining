import { z } from 'zod'
import { prisma } from '../prisma.js'
import { getTaxonCatalog } from '../lib/taxonCatalog.js'
import { AppError } from '../lib/errors.js'
import { cuidSchema } from '../lib/zodUtils.js'
import { getTaxonLevelProfile, resolveTaxonWorkerSize } from '../lib/taxonLevelProfileCache.js'
import { getGameEntriesCache } from '../lib/gameEntryCache.js'

export type GameLevel = 'easy' | 'medium' | 'hard'
type GameEntry = Awaited<ReturnType<typeof getGameEntriesCache>>[number]

export const validateGameAnswerSchema = z.object({
  level: z.enum(['easy', 'medium', 'hard']),
  selected: z
    .object({
      subfamily: z.string().max(255, 'Trop long').trim().optional(),
      genus: z.string().max(255, 'Trop long').trim().optional(),
      species: z.string().max(255, 'Trop long').trim().optional(),
    })
    .default({}),
  answer: z
    .object({
      subfamily: z.string().max(255, 'Trop long').trim().optional(),
      genus: z.string().max(255, 'Trop long').trim().optional(),
      species: z.string().max(255, 'Trop long').trim().optional(),
    })
    .default({}),
  entryId: cuidSchema.optional(),
  sessionId: cuidSchema.optional(),
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
  return resolveTaxonWorkerSize(entry)
}

type GameQuestionDetails = {
  size: string | null
  department: string
  observedAt: string
  biotope: string
  photoCredit: string
}

type GameQuestionBase = {
  level: GameLevel
  entryId: string
  sessionId: string
  images: string[]
  prompt: string
  details: GameQuestionDetails
}

async function createGameSession(entryId: string, level: GameLevel, userId?: string | null) {
  return prisma.gameSession.create({
    data: {
      level: toDbGameDifficulty(level),
      entryId,
      ...(userId ? { userId } : {}),
    },
  })
}

function buildQuestionDetails(entry: { species?: string | null; genus?: string | null; subfamily: string; department: string; observedAt: Date; biotope: string; photoCredit: string }) {
  return {
    size: null as string | null,
    department: entry.department,
    observedAt: entry.observedAt.toISOString(),
    biotope: entry.biotope,
    photoCredit: entry.photoCredit,
  }
}

function buildTaxonChoices(entry: { subfamily: string; genus?: string | null; species?: string | null }, allTaxons: Array<{ subfamily: string; genus: string; species: string }>) {
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

  return { subfamilyChoices, genusChoices, speciesChoices }
}

const GAME_LEVEL_CONFIGS = {
  easy: {
    prompt: 'Identifier la sous-famille',
    selectEntry: (entries: GameEntry[]) => entries,
    buildResponse: async (entry: GameEntry, entries: GameEntry[], allTaxons: Array<{ subfamily: string }>, userId?: string | null): Promise<GameQuestionBase & { choices: string[]; answer: { subfamily: string } }> => {
      const availableSubfamilies = uniqueShuffled(allTaxons.map((t) => t.subfamily))
      const fallbackSubfamilies = uniqueShuffled(entries.map((item) => item.subfamily))
      const choices = buildChoices(entry.subfamily, availableSubfamilies.length ? availableSubfamilies : fallbackSubfamilies, 5)
      const session = await createGameSession(entry.id, 'easy', userId)

      return {
        level: 'easy',
        entryId: entry.id,
        sessionId: session.id,
        images: entry.images.map((item) => item.imageUrl),
        prompt: 'Identifier la sous-famille',
        details: { ...buildQuestionDetails(entry), size: await resolveEntrySize(entry) },
        choices,
        answer: { subfamily: entry.subfamily },
      }
    },
  },
  medium: {
    prompt: 'Identifier la sous-famille puis le genre',
    selectEntry: (entries: GameEntry[]) => entries.filter((entry) => !!entry.genus),
    buildResponse: async (entry: GameEntry, _entries: GameEntry[], allTaxons: Array<{ subfamily: string; genus: string; species: string }>, userId?: string | null): Promise<GameQuestionBase & { choices: { subfamily: string[]; genus: string[] }; answer: { subfamily: string; genus: string | null } }> => {
      const choices = buildTaxonChoices(entry, allTaxons)
      const session = await createGameSession(entry.id, 'medium', userId)

      return {
        level: 'medium',
        entryId: entry.id,
        sessionId: session.id,
        images: entry.images.map((item) => item.imageUrl),
        prompt: 'Identifier la sous-famille puis le genre',
        details: { ...buildQuestionDetails(entry), size: await resolveEntrySize(entry) },
        choices: {
          subfamily: choices.subfamilyChoices,
          genus: choices.genusChoices,
        },
        answer: {
          subfamily: entry.subfamily,
          genus: entry.genus,
        },
      }
    },
  },
  hard: {
    prompt: "Identifier la sous-famille, le genre et l'espèce",
    selectEntry: (entries: GameEntry[]) => entries.filter((entry) => entry.taxonLevel === 'SPECIES' && !!entry.genus && !!entry.species),
    buildResponse: async (entry: GameEntry, _entries: GameEntry[], allTaxons: Array<{ subfamily: string; genus: string; species: string }>, userId?: string | null): Promise<GameQuestionBase & { choices: { subfamily: string[]; genus: string[]; species: string[] }; answer: { subfamily: string; genus: string | null; species: string | null } }> => {
      const choices = buildTaxonChoices(entry, allTaxons)
      const session = await createGameSession(entry.id, 'hard', userId)

      return {
        level: 'hard',
        entryId: entry.id,
        sessionId: session.id,
        images: entry.images.map((item) => item.imageUrl),
        prompt: "Identifier la sous-famille, le genre et l'espèce",
        details: { ...buildQuestionDetails(entry), size: await resolveEntrySize(entry) },
        choices: {
          subfamily: choices.subfamilyChoices,
          genus: choices.genusChoices,
          species: choices.speciesChoices,
        },
        answer: {
          subfamily: entry.subfamily,
          genus: entry.genus,
          species: entry.species,
        },
      }
    },
  },
} satisfies Record<GameLevel, {
  prompt: string
  selectEntry: (entries: any[]) => any[]
  buildResponse: (...args: any[]) => Promise<any>
}>

export async function getGameQuestion(rawLevel: unknown, userId?: string | null) {
  const level = normalizeGameLevel(rawLevel)

  const entries = await getGameEntriesCache()

  if (!entries.length) {
    throw new AppError(404, 'Aucune entrée disponible.')
  }

  const taxonCatalog = await getTaxonCatalog()
  const allTaxons = taxonCatalog.items

  const config = GAME_LEVEL_CONFIGS[level]
  const availableEntries = config.selectEntry(entries)
  if (!availableEntries.length) {
    throw new AppError(404, `Aucune entrée disponible pour le niveau ${level}.`)
  }

  const entry = randomPick(availableEntries)
  return config.buildResponse(entry, entries, allTaxons, userId)
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
    ? await getTaxonLevelProfile('SUBFAMILY', resolvedAnswer.subfamily, null)
    : null

  const genusProfile = resolvedAnswer.genus
    ? await getTaxonLevelProfile('GENUS', resolvedAnswer.genus, null)
    : null

  const identification = {
    subfamily: {
      value: resolvedAnswer.subfamily ?? null,
      description: subfamilyProfile?.description ?? null,
      criteria: subfamilyProfile?.criteria ?? [],
    },
    genus: {
      value: resolvedAnswer.genus ?? null,
      description: genusProfile?.description ?? null,
      criteria: genusProfile?.criteria ?? [],
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
