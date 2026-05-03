import { Router } from 'express'
import { listAdminHistoryEvents } from '../services/adminHistory.js'

export const adminHistoryRouter = Router()

adminHistoryRouter.get('/', async (_req, res) => {
  try {
    const items = await listAdminHistoryEvents(100)
    return res.json(items)
  } catch (error) {
    console.error('Erreur lecture historique admin:', error)
    return res.json([])
  }
})
