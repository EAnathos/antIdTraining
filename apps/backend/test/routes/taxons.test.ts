import express from 'express'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const mocks = vi.hoisted(() => ({
  listSubfamilies: vi.fn(),
  listGenera: vi.fn(),
  listSubgenera: vi.fn(),
  listSpeciesGroups: vi.fn(),
  listSpecies: vi.fn(),
  getSpeciesMetadata: vi.fn(),
  listTaxons: vi.fn(),
  createTaxon: vi.fn(),
  updateTaxon: vi.fn(),
  deleteTaxon: vi.fn(),
  recordAdminAudit: vi.fn(),
  taxonSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('../../src/services/taxons.js', () => ({
  listSubfamilies: mocks.listSubfamilies,
  listGenera: mocks.listGenera,
  listSubgenera: mocks.listSubgenera,
  listSpeciesGroups: mocks.listSpeciesGroups,
  listSpecies: mocks.listSpecies,
  getSpeciesMetadata: mocks.getSpeciesMetadata,
  listTaxons: mocks.listTaxons,
  taxonSchema: mocks.taxonSchema,
  createTaxon: mocks.createTaxon,
  updateTaxon: mocks.updateTaxon,
  deleteTaxon: mocks.deleteTaxon,
}))
vi.mock('../../src/lib/adminAudit.js', () => ({
  recordAdminAudit: mocks.recordAdminAudit,
}))

import { errorHandler } from '../../src/middleware/error.js'
import {
  adminTaxonsRouter,
  publicTaxonsRouter,
} from '../../src/routes/taxons.js'

let server: ReturnType<express.Express['listen']>
let baseUrl = ''

beforeAll(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/taxons', publicTaxonsRouter)
  app.use('/api/admin/taxons', adminTaxonsRouter)
  app.use(errorHandler)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`
      }
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

async function get(path: string) {
  const response = await fetch(`${baseUrl}${path}`)
  const text = await response.text()
  return { response, json: text ? JSON.parse(text) : null }
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  return { response, json: text ? JSON.parse(text) : null }
}

describe('publicTaxonsRouter', () => {
  it('lists subfamilies', async () => {
    mocks.listSubfamilies.mockResolvedValue(['Formicinae', 'Myrmicinae'])

    const { response, json } = await get('/api/taxons/subfamilies')

    expect(response.status).toBe(200)
    expect(json).toEqual(['Formicinae', 'Myrmicinae'])
    expect(mocks.listSubfamilies).toHaveBeenCalledTimes(1)
  })

  it('lists genera for a subfamily', async () => {
    mocks.listGenera.mockResolvedValue(['Formica', 'Camponotus'])

    const { response, json } = await get(
      '/api/taxons/genera?subfamily=Formicinae',
    )

    expect(response.status).toBe(200)
    expect(json).toEqual(['Formica', 'Camponotus'])
    expect(mocks.listGenera).toHaveBeenCalledWith('Formicinae')
  })

  it('lists subgenera for a genus', async () => {
    mocks.listSubgenera.mockResolvedValue(['Serviformica', 'Raptiformica'])

    const { response, json } = await get('/api/taxons/subgenera?genus=Formica')

    expect(response.status).toBe(200)
    expect(json).toEqual(['Serviformica', 'Raptiformica'])
    expect(mocks.listSubgenera).toHaveBeenCalledWith('Formica')
  })

  it('lists species groups for a genus', async () => {
    mocks.listSpeciesGroups.mockResolvedValue(['group-a', 'group-b'])

    const { response, json } = await get(
      '/api/taxons/species-groups?genus=Formica',
    )

    expect(response.status).toBe(200)
    expect(json).toEqual(['group-a', 'group-b'])
    expect(mocks.listSpeciesGroups).toHaveBeenCalledWith('Formica')
  })

  it('lists species for a genus', async () => {
    mocks.listSpecies.mockResolvedValue(['rufibarbis', 'fusca'])

    const { response, json } = await get('/api/taxons/species?genus=Formica')

    expect(response.status).toBe(200)
    expect(json).toEqual(['rufibarbis', 'fusca'])
    expect(mocks.listSpecies).toHaveBeenCalledWith('Formica')
  })

  it('lists species metadata', async () => {
    mocks.getSpeciesMetadata.mockResolvedValue({
      genus: 'Formica',
      species: 'rufibarbis',
    })

    const { response, json } = await get(
      '/api/taxons/species-metadata?genus=Formica&species=rufibarbis',
    )

    expect(response.status).toBe(200)
    expect(json).toEqual({ genus: 'Formica', species: 'rufibarbis' })
  })

  it('lists taxons with filters', async () => {
    mocks.listTaxons.mockResolvedValue({
      items: [{ id: 'dw5agfvayj927h26bzemp7zc' }],
      pagination: { page: 1 },
    })

    const { response, json } = await get(
      '/api/taxons?level=SPECIES&q=Formica&offset=10',
    )

    expect(response.status).toBe(200)
    expect(json).toEqual({
      items: [{ id: 'dw5agfvayj927h26bzemp7zc' }],
      pagination: { page: 1 },
    })
    expect(mocks.listTaxons).toHaveBeenCalledWith({
      level: 'SPECIES',
      q: 'Formica',
      offset: '10',
    })
  })
})

describe('adminTaxonsRouter', () => {
  it('returns 400 for invalid create payload', async () => {
    mocks.taxonSchema.safeParse.mockReturnValue({ success: false })

    const { response, json } = await post('/api/admin/taxons', {
      invalid: true,
    })

    expect(response.status).toBe(400)
    expect(json.message).toBe('Requête invalide.')
  })

  it('creates a taxon and records audit log', async () => {
    mocks.taxonSchema.safeParse.mockReturnValue({
      success: true,
      data: {
        subfamily: 'Formicinae',
        genus: 'Formica',
        species: 'rufibarbis',
      },
    })
    mocks.createTaxon.mockResolvedValue({
      id: 'dw5agfvayj927h26bzemp7zc',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufibarbis',
    })

    const { response } = await post('/api/admin/taxons', {
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufibarbis',
    })

    expect(response.status).toBe(201)
    expect(mocks.createTaxon).toHaveBeenCalledTimes(1)
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
  })

  it('updates a taxon and records audit log', async () => {
    mocks.taxonSchema.safeParse.mockReturnValue({
      success: true,
      data: { subfamily: 'Formicinae', genus: 'Formica', species: 'fusca' },
    })
    mocks.updateTaxon.mockResolvedValue({
      id: 'dw5agfvayj927h26bzemp7zc',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'fusca',
    })

    const response = await fetch(
      `${baseUrl}/api/admin/taxons/dw5agfvayj927h26bzemp7zc`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subfamily: 'Formicinae',
          genus: 'Formica',
          species: 'fusca',
        }),
      },
    )

    expect(response.status).toBe(200)
    expect(mocks.updateTaxon).toHaveBeenCalledWith('dw5agfvayj927h26bzemp7zc', {
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'fusca',
    })
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
  })

  it('deletes a taxon and records audit log', async () => {
    mocks.deleteTaxon.mockResolvedValue({
      id: 'dw5agfvayj927h26bzemp7zc',
      subfamily: 'Formicinae',
      genus: 'Formica',
      species: 'rufibarbis',
    })

    const response = await fetch(
      `${baseUrl}/api/admin/taxons/dw5agfvayj927h26bzemp7zc`,
      {
        method: 'DELETE',
      },
    )

    expect(response.status).toBe(204)
    expect(mocks.deleteTaxon).toHaveBeenCalledWith('dw5agfvayj927h26bzemp7zc')
    expect(mocks.recordAdminAudit).toHaveBeenCalledTimes(1)
  })
})
