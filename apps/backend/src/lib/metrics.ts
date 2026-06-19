import { collectDefaultMetrics, Counter, Gauge, Registry } from 'prom-client'

export const register = new Registry()

collectDefaultMetrics({ register })

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['status_class'],
  registers: [register],
})

export const registeredUsersTotal = new Gauge({
  name: 'registered_users_total',
  help: 'Total number of registered users in the database',
  registers: [register],
})

export const observationEntriesTotal = new Gauge({
  name: 'observation_entries_total',
  help: 'Total number of observation entries in the database',
  registers: [register],
})

export const entryImagesTotal = new Gauge({
  name: 'entry_images_total',
  help: 'Total number of entry images in the database',
  registers: [register],
})

export const suggestionsTotal = new Gauge({
  name: 'suggestions_total',
  help: 'Total number of suggestions by status',
  labelNames: ['status'],
  registers: [register],
})

export const entryProposalsTotal = new Gauge({
  name: 'entry_proposals_total',
  help: 'Total number of entry proposals by status',
  labelNames: ['status'],
  registers: [register],
})

export const gameSessionsTotal = new Gauge({
  name: 'game_sessions_total',
  help: 'Total number of game sessions by level and outcome',
  labelNames: ['level', 'outcome'],
  registers: [register],
})
