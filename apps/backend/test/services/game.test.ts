import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  prismaMocks,
  commonMocks,
  resetSharedMocks,
} from '../utils/sharedMocks'

vi.mock('../../src/prisma.js', () => ({ prisma: prismaMocks }))
vi.mock('../../src/lib/taxonCatalog.js', () => ({
  getTaxonCatalog: commonMocks.getTaxonCatalog,
}))
vi.mock('../../src/lib/taxonLevelProfileCache.js', () => ({
  getTaxonLevelProfile: commonMocks.getTaxonLevelProfile,
  resolveTaxonWorkerSize: commonMocks.resolveTaxonWorkerSize,
}))
vi.mock('../../src/lib/gameEntryCache.js', () => ({
  getGameEntriesCache: commonMocks.getGameEntriesCache,
}))

import { getGameQuestion, validateGameAnswer } from '../../src/services/game.js'

const baseEntry = {
  id: 'entry_1',
  subfamily: 'Formicinae',
  genus: 'Formica',
  species: 'rufa',
  taxonLevel: 'SPECIES',
  department: '75',
  observedAt: new Date('2026-05-01T00:00:00.000Z'),
  biotope: 'Forêt',
  photoCredit: 'Alice',
  images: [{ imageUrl: '/uploads/queen.webp' }],
  swarmingStartMonth: 3,
  swarmingEndMonth: 5,
}

describe('game service', () => {
  beforeEach(() => {
    resetSharedMocks()
    commonMocks.getTaxonCatalog.mockResolvedValue({
      items: [
        { subfamily: 'Formicinae', genus: 'Formica', species: 'rufa' },
        { subfamily: 'Myrmicinae', genus: 'Myrmica', species: 'rubra' },
      ],
    })
    commonMocks.resolveTaxonWorkerSize.mockResolvedValue('4-6 mm')
    commonMocks.getTaxonLevelProfile.mockResolvedValue(null)
    prismaMocks.gameSession.create.mockResolvedValue({ id: 'session_1' })
    prismaMocks.gameSession.updateMany.mockResolvedValue({ count: 1 })
  })

  it('throws 404 when no game entries are available', async () => {
    commonMocks.getGameEntriesCache.mockResolvedValue([])

    await expect(getGameQuestion('easy')).rejects.toMatchObject({
      status: 404,
      message: 'Aucune entrée disponible.',
    })
  })

  it('returns an easy question and creates a session', async () => {
    commonMocks.getGameEntriesCache.mockResolvedValue([baseEntry])

    const result = await getGameQuestion('easy', 'user_1')

    expect(result.level).toBe('easy')
    expect(result.entryId).toBe('entry_1')
    expect(result.sessionId).toBe('session_1')
    expect(result.images).toEqual(['/uploads/queen.webp'])
    expect(result.choices).toContain('Formicinae')
    expect(prismaMocks.gameSession.create).toHaveBeenCalledWith({
      data: {
        level: 'EASY',
        entryId: 'entry_1',
        userId: 'user_1',
      },
    })
  })

  it('throws 404 when filters remove all available entries', async () => {
    commonMocks.getGameEntriesCache.mockResolvedValue([baseEntry])

    await expect(
      getGameQuestion('easy', null, {
        departments: ['13'],
        swarmingMonths: [1],
      }),
    ).rejects.toMatchObject({
      status: 404,
      message:
        'Aucune entrée disponible pour le niveau easy avec les filtres sélectionnés.',
    })
  })

  it('returns incorrect result when selected subfamily is wrong and persists final result', async () => {
    prismaMocks.gameSession.findUnique.mockResolvedValue({
      id: 'session_1',
      level: 'EASY',
    })

    const result = await validateGameAnswer({
      level: 'easy',
      sessionId: 'session_1',
      selected: {
        subfamily: 'Myrmicinae',
      },
      answer: {
        subfamily: 'Formicinae',
      },
    })

    expect(result).toMatchObject({
      correct: false,
      reason: 'Sous-famille incorrecte',
      identification: {
        subfamily: {
          value: 'Formicinae',
        },
        size: '4-6 mm',
      },
    })
    expect(prismaMocks.gameSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session_1',
        finalCorrect: null,
      },
      data: {
        finalCorrect: false,
        validatedAt: expect.any(Date),
      },
    })
  })

  it('returns correct result when easy answer matches and persists success', async () => {
    prismaMocks.gameSession.findUnique.mockResolvedValue({
      id: 'session_1',
      level: 'EASY',
    })

    const result = await validateGameAnswer({
      level: 'easy',
      sessionId: 'session_1',
      selected: {
        subfamily: 'Formicinae',
      },
      answer: {
        subfamily: 'Formicinae',
      },
    })

    expect(result).toMatchObject({
      correct: true,
      identification: {
        subfamily: {
          value: 'Formicinae',
        },
        size: '4-6 mm',
      },
    })
    expect(prismaMocks.gameSession.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'session_1',
        finalCorrect: null,
      },
      data: {
        finalCorrect: true,
        validatedAt: expect.any(Date),
      },
    })
  })
})
