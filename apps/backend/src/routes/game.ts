import { Router } from 'express'
import { prisma } from '../prisma.js'

const EASY_SUBFAMILIES = [
  'Formicinae',
  'Dolichoderinae',
  'Myrmicinae',
  'Ponerinae',
  'Leptanillinae',
]

function randomPick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function uniqueShuffled<T>(arr: T[]) {
  return Array.from(new Set(arr)).sort(() => Math.random() - 0.5)
}

function buildChoices<T>(answer: T, candidates: T[], maxChoices: number) {
  const wrongChoices = uniqueShuffled(candidates.filter((candidate) => candidate !== answer)).slice(0, Math.max(maxChoices - 1, 0))
  return uniqueShuffled([answer, ...wrongChoices])
}

export const gameRouter = Router()

gameRouter.get('/question', async (req, res) => {
  const level = String(req.query.level ?? 'easy')

  const entries = await prisma.observationEntry.findMany({
    include: { images: true },
  })

  if (!entries.length) {
    return res.status(404).json({ message: 'Aucune entrée disponible' })
  }

  if (level === 'easy') {
    const entry = randomPick(entries)
    const images = entry.images.map((item) => item.imageUrl)

    const availableSubfamilies = uniqueShuffled(entries.map((item) => item.subfamily))
    const fallbackWrongChoices = EASY_SUBFAMILIES.filter((item) => item !== entry.subfamily)
    const choices = buildChoices(entry.subfamily, [...availableSubfamilies, ...fallbackWrongChoices], 5)

    return res.json({
      level,
      entryId: entry.id,
      images,
      prompt: 'Identifier la sous-famille',
      details: {
        department: entry.department,
        observedAt: entry.observedAt.toISOString(),
        biotope: entry.biotope,
        photoCredit: entry.photoCredit,
      },
      choices,
      answer: { subfamily: entry.subfamily },
    })
  }

  const allTaxons = await prisma.taxon.findMany()

  if (level === 'medium') {
    const mediumEntries = entries.filter((entry) => entry.taxonLevel === 'GENUS' && !!entry.genus)
    if (!mediumEntries.length) {
      return res.status(404).json({ message: 'Aucune entrée disponible pour le niveau moyen.' })
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

    return res.json({
      level,
      entryId: entry.id,
      images,
      prompt: 'Identifier la sous-famille puis le genre',
      details: {
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
    })
  }

  const hardEntries = entries.filter((entry) => entry.taxonLevel === 'SPECIES' && !!entry.genus && !!entry.species)
  if (!hardEntries.length) {
    return res.status(404).json({ message: 'Aucune entrée disponible pour le niveau difficile.' })
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

  return res.json({
    level: 'hard',
    entryId: entry.id,
    images,
    prompt: "Identifier la sous-famille, le genre et l'espèce",
    details: {
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
  })
})

gameRouter.post('/validate', async (req, res) => {
  const { level, selected, answer, entryId } = req.body as {
    level: 'easy' | 'medium' | 'hard'
    selected: { subfamily?: string; genus?: string; species?: string }
    answer: { subfamily?: string; genus?: string; species?: string }
    entryId?: string
  }

  if (!entryId && !answer?.subfamily) {
    return res.status(400).json({ message: 'entryId manquant pour valider la réponse.' })
  }

  const entry = entryId
    ? await prisma.observationEntry.findUnique({
        where: { id: entryId },
      })
    : null

  if (entryId && !entry) {
    return res.status(404).json({ message: 'Entrée introuvable pour cette question.' })
  }

  const resolvedAnswer = {
    subfamily: entry?.subfamily ?? answer?.subfamily,
    genus: entry?.genus ?? answer?.genus,
    species: entry?.species ?? answer?.species,
  }

  const subfamilyProfile = resolvedAnswer.subfamily
    ? await prisma.taxonLevelProfile.findUnique({
        where: {
          level_value: {
            level: 'SUBFAMILY',
            value: resolvedAnswer.subfamily,
          },
        },
        include: {
          criteria: {
            orderBy: { position: 'asc' },
          },
        },
      })
    : null

  const identification = {
    subfamily: resolvedAnswer.subfamily ?? null,
    description: subfamilyProfile?.description ?? null,
    criteria: (subfamilyProfile?.criteria ?? []).map((criterion) => criterion.label),
  }

  const subfamilyOk = selected.subfamily === resolvedAnswer.subfamily
  if (!subfamilyOk) {
    return res.json({
      correct: false,
      reason: 'Sous-famille incorrecte',
      identification,
    })
  }

  if (level === 'easy') {
    return res.json({
      correct: true,
      identification,
    })
  }

  const genusOk = selected.genus === resolvedAnswer.genus
  if (!genusOk) {
    return res.json({
      correct: false,
      reason: 'Genre incorrect',
      identification,
    })
  }

  if (level === 'medium') {
    return res.json({
      correct: true,
      identification,
    })
  }

  const speciesOk = selected.species === resolvedAnswer.species
  if (!speciesOk) {
    return res.json({
      correct: false,
      reason: 'Espèce incorrecte',
      identification,
    })
  }

  return res.json({
    correct: true,
    identification,
  })
})
