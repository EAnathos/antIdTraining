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

export const gameRouter = Router()

gameRouter.get('/question', async (req, res) => {
  const level = String(req.query.level ?? 'easy')

  const entries = await prisma.observationEntry.findMany({
    include: { taxon: true, images: true },
  })

  if (!entries.length) {
    return res.status(404).json({ message: 'Aucune entrée disponible' })
  }

  const entry = randomPick(entries)
  const image = entry.images[0]?.imageUrl ?? null

  if (level === 'easy') {
    const choices = uniqueShuffled([
      entry.taxon.subfamily,
      ...EASY_SUBFAMILIES.filter((x) => x !== entry.taxon.subfamily).slice(0, 4),
    ]).slice(0, 5)

    return res.json({
      level,
      entryId: entry.id,
      image,
      prompt: 'Identifier la sous-famille',
      choices,
      answer: { subfamily: entry.taxon.subfamily },
    })
  }

  const allTaxons = await prisma.taxon.findMany()
  const allSubfamilies = uniqueShuffled(allTaxons.map((t) => t.subfamily)).slice(0, 5)
  const subfamilyChoices = uniqueShuffled([entry.taxon.subfamily, ...allSubfamilies]).slice(0, 5)

  const genusCandidates = uniqueShuffled(
    allTaxons
      .filter((t) => t.subfamily === entry.taxon.subfamily)
      .map((t) => t.genus),
  )

  const genusWrong = uniqueShuffled(
    allTaxons
      .filter((t) => t.subfamily !== entry.taxon.subfamily)
      .map((t) => t.genus),
  ).slice(0, 3)

  const genusChoices = uniqueShuffled([entry.taxon.genus, ...genusCandidates.slice(0, 2), ...genusWrong]).slice(0, 6)

  if (level === 'medium') {
    return res.json({
      level,
      entryId: entry.id,
      image,
      prompt: 'Identifier la sous-famille puis le genre',
      choices: {
        subfamily: subfamilyChoices,
        genus: genusChoices,
      },
      answer: {
        subfamily: entry.taxon.subfamily,
        genus: entry.taxon.genus,
      },
    })
  }

  const speciesCandidates = uniqueShuffled(
    allTaxons.filter((t) => t.genus === entry.taxon.genus).map((t) => t.species),
  )
  const speciesWrong = uniqueShuffled(
    allTaxons.filter((t) => t.genus !== entry.taxon.genus).map((t) => t.species),
  ).slice(0, 4)
  const speciesChoices = uniqueShuffled([entry.taxon.species, ...speciesCandidates.slice(0, 2), ...speciesWrong]).slice(0, 6)

  return res.json({
    level: 'hard',
    entryId: entry.id,
    image,
    prompt: "Identifier la sous-famille, le genre et l'espèce",
    choices: {
      subfamily: subfamilyChoices,
      genus: genusChoices,
      species: speciesChoices,
    },
    answer: {
      subfamily: entry.taxon.subfamily,
      genus: entry.taxon.genus,
      species: entry.taxon.species,
    },
  })
})

gameRouter.post('/validate', (req, res) => {
  const { level, selected, answer } = req.body as {
    level: 'easy' | 'medium' | 'hard'
    selected: { subfamily?: string; genus?: string; species?: string }
    answer: { subfamily?: string; genus?: string; species?: string }
  }

  const subfamilyOk = selected.subfamily === answer.subfamily
  if (!subfamilyOk) {
    return res.json({ correct: false, reason: 'Sous-famille incorrecte' })
  }

  if (level === 'easy') {
    return res.json({ correct: true })
  }

  const genusOk = selected.genus === answer.genus
  if (!genusOk) {
    return res.json({ correct: false, reason: 'Genre incorrect' })
  }

  if (level === 'medium') {
    return res.json({ correct: true })
  }

  const speciesOk = selected.species === answer.species
  if (!speciesOk) {
    return res.json({ correct: false, reason: 'Espèce incorrecte' })
  }

  return res.json({ correct: true })
})
