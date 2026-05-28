import { Router } from 'express'
import { AppError } from '../lib/errors.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  createTaxon,
  deleteTaxon,
  getSpeciesMetadata,
  listGenera,
  listSpecies,
  listSubfamilies,
  listTaxons,
  listSubgenera,
  listSpeciesGroups,
  taxonSchema,
  updateTaxon,
} from '../services/taxons.js'
import { recordAdminAudit } from '../lib/adminAudit.js'

export const publicTaxonsRouter = Router()
export const adminTaxonsRouter = Router()

publicTaxonsRouter.get(
  '/subfamilies',
  asyncHandler(async (_req, res) => {
    const subfamilies = await listSubfamilies()
    return res.json(subfamilies)
  }),
)

publicTaxonsRouter.get(
  '/genera',
  asyncHandler(async (req, res) => {
    const genera = await listGenera(String(req.query.subfamily ?? ''))
    return res.json(genera)
  }),
)

publicTaxonsRouter.get(
  '/subgenera',
  asyncHandler(async (req, res) => {
    const subgenera = await listSubgenera(String(req.query.genus ?? ''))
    return res.json(subgenera)
  }),
)

publicTaxonsRouter.get(
  '/species-groups',
  asyncHandler(async (req, res) => {
    const groups = await listSpeciesGroups(String(req.query.genus ?? ''))
    return res.json(groups)
  }),
)

publicTaxonsRouter.get(
  '/species',
  asyncHandler(async (req, res) => {
    const species = await listSpecies(String(req.query.genus ?? ''))
    return res.json(species)
  }),
)

publicTaxonsRouter.get(
  '/species-metadata',
  asyncHandler(async (req, res) => {
    const metadata = await getSpeciesMetadata(
      String(req.query.genus ?? ''),
      String(req.query.species ?? ''),
    )
    return res.json(metadata)
  }),
)

publicTaxonsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const result = await listTaxons({
      level: req.query.level,
      q: req.query.q,
      offset: req.query.offset,
    })
    return res.json(result)
  }),
)

adminTaxonsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = taxonSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    const created = await createTaxon(parsed.data)
    const taxonLabel = [created.subfamily, created.genus, created.species]
      .filter(Boolean)
      .join(' · ')
    await recordAdminAudit(req, {
      action: 'Taxon créé',
      detail: taxonLabel,
      tone: 'SUCCESS',
      entityType: 'taxon',
      entityId: created.id,
    })

    return res.status(201).json(created)
  }),
)

adminTaxonsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const parsed = taxonSchema.safeParse(req.body)
    if (!parsed.success) {
      throw new AppError(400, 'Requête invalide.')
    }

    const updated = await updateTaxon(req.params.id as string, parsed.data)
    const taxonLabel = [updated.subfamily, updated.genus, updated.species]
      .filter(Boolean)
      .join(' · ')
    await recordAdminAudit(req, {
      action: 'Taxon modifié',
      detail: taxonLabel,
      tone: 'INFO',
      entityType: 'taxon',
      entityId: updated.id,
    })

    return res.json(updated)
  }),
)

adminTaxonsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const deletedTaxon = await deleteTaxon(req.params.id as string)

    const taxonLabel = [
      deletedTaxon.subfamily,
      deletedTaxon.genus,
      deletedTaxon.species,
    ]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(' · ')
    await recordAdminAudit(req, {
      action: 'Taxon supprimé',
      detail: taxonLabel,
      tone: 'ERROR',
      entityType: 'taxon',
      entityId: deletedTaxon.id,
    })

    return res.status(204).send()
  }),
)
