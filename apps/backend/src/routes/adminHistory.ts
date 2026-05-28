import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { listAdminHistoryEvents } from '../services/adminHistory.js'

export const adminHistoryRouter = Router()

adminHistoryRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await listAdminHistoryEvents(100)
    return res.json(items)
  }),
)
