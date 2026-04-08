import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { createTaxon, deleteTaxon, listGenera, listSpecies, listSubfamilies, listTaxons, taxonSchema, updateTaxon } from '../services/taxons.js'

export const publicTaxonsRouter = Router()
export const adminTaxonsRouter = Router()

publicTaxonsRouter.get('/subfamilies', async (_req, res) => {
  const subfamilies = await listSubfamilies()
  return res.json(subfamilies)
})

publicTaxonsRouter.get('/genera', async (req, res) => {
  const genera = await listGenera(String(req.query.subfamily ?? ''))
  return res.json(genera)
})

publicTaxonsRouter.get('/species', async (req, res) => {
  const species = await listSpecies(String(req.query.genus ?? ''))
  return res.json(species)
})

publicTaxonsRouter.get('/', async (req, res) => {
  const result = await listTaxons({
    level: req.query.level,
    q: req.query.q,
    offset: req.query.offset,
  })
  return res.json(result)
})

adminTaxonsRouter.post('/', async (req, res) => {
  const parsed = taxonSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const created = await createTaxon(parsed.data)

  return res.status(201).json(created)
})

adminTaxonsRouter.put('/:id', async (req, res) => {
  const parsed = taxonSchema.safeParse(req.body)
  if (!parsed.success) {
    throw new AppError(400, 'Requête invalide.')
  }

  const updated = await updateTaxon(req.params.id, parsed.data)

  return res.json(updated)
})

adminTaxonsRouter.delete('/:id', async (req, res) => {
  await deleteTaxon(req.params.id)
  return res.status(204).send()
})
