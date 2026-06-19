import { collectDefaultMetrics, Counter, Registry } from 'prom-client'

export const register = new Registry()

collectDefaultMetrics({ register })

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['status_class'],
  registers: [register],
})
