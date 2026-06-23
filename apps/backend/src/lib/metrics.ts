import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client'

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

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'status_class'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
})

export const rateLimitHitsTotal = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Number of rate limit rejections by endpoint',
  labelNames: ['endpoint'],
  registers: [register],
})

export const authEventsTotal = new Counter({
  name: 'auth_events_total',
  help: 'Authentication events by type and outcome',
  labelNames: ['type', 'outcome'],
  registers: [register],
})

export const referencesTotal = new Gauge({
  name: 'references_total',
  help: 'Total references by type',
  labelNames: ['type'],
  registers: [register],
})

export const taxonsTotal = new Gauge({
  name: 'taxons_total',
  help: 'Total taxons by subfamily and genus',
  labelNames: ['subfamily', 'genus'],
  registers: [register],
})
