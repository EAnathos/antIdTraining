import cors from 'cors'
import express from 'express'
import compression from 'compression'
import helmet from 'helmet'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'
import { config } from './config.js'
import { logger } from './lib/logger.js'
import { recordHttpRequest } from './lib/monitoring.js'
import {
  register,
  registeredUsersTotal,
  observationEntriesTotal,
  entryImagesTotal,
  suggestionsTotal,
  entryProposalsTotal,
  gameSessionsTotal,
} from './lib/metrics.js'
import { prisma } from './prisma.js'
import { closeRedis } from './lib/redis.js'
import { authRouter } from './routes/auth.js'
import { healthRouter } from './routes/health.js'
import { databaseRouter } from './routes/database.js'
import { entriesRouter } from './routes/entries.js'
import { gameRouter } from './routes/game.js'
import { openApiDocument } from './openapi.js'
import {
  adminReferencesRouter,
  publicReferencesRouter,
} from './routes/references.js'
import { publicStatsRouter } from './routes/publicStats.js'
import { statsRouter } from './routes/stats.js'
import { adminTaxonsRouter, publicTaxonsRouter } from './routes/taxons.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { adminHistoryRouter } from './routes/adminHistory.js'
import { adminUsersRouter } from './routes/adminUsers.js'

function parseCorsOrigins(value: string | undefined) {
  // Production defaults - should be set via CORS_ORIGINS env var
  if (process.env.NODE_ENV === 'production') {
    if (!value) {
      throw new Error(
        'CORS_ORIGINS environment variable must be set in production',
      )
    }
    return value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  }

  // Development defaults
  const devDefaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
  ]

  const rawOrigins = value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []

  return rawOrigins.length > 0 ? rawOrigins : devDefaults
}

const app = express()
app.set('trust proxy', config.trustProxy)

// Security headers
// The frontend and uploads are served from sibling subdomains in production,
// so allow same-site resource embedding for images.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
  }),
)

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadsPath = path.resolve(currentDir, '../uploads')
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(null, false)
    },
    credentials: true,
  }),
)
app.use(compression({ threshold: 1024, level: 6 }))
app.use(express.json({ limit: '25mb' }))
app.use(
  '/uploads',
  express.static(uploadsPath, {
    maxAge: '1y',
    immutable: true,
  }),
)

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info'

    logger[logLevel](
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        userId: req.user?.userId,
        contentLength: res.get('content-length'),
        userAgent: req.headers['user-agent'],
      },
      'HTTP request completed',
    )

    recordHttpRequest(res.statusCode)
  })

  next()
})

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})

app.use('/api/health', healthRouter)

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiDocument)
  })

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      swaggerOptions: {
        persistAuthorization: true,
        authAction: {
          bearerAuth: {
            name: 'bearerAuth',
            schema: {
              type: 'http',
              in: 'header',
              name: 'Authorization',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
            value: '', // Laisser vide - l'utilisateur doit entrer son token
          },
        },
      },
    }),
  )
}

app.use('/api/auth', authRouter)
app.use('/api/game', gameRouter)
app.use('/api/taxons', publicTaxonsRouter)
app.use('/api/references', publicReferencesRouter)
app.use('/api/stats', publicStatsRouter)

import { adminStatsToolsRouter } from './routes/adminStatsTools.js'
app.use('/api/admin/entries', requireAuth, requireAdmin, entriesRouter)
app.use('/api/admin/taxons', requireAuth, requireAdmin, adminTaxonsRouter)
app.use(
  '/api/admin/references',
  requireAuth,
  requireAdmin,
  adminReferencesRouter,
)
app.use('/api/admin/stats', requireAuth, requireAdmin, statsRouter)
app.use(
  '/api/admin/stats-tools',
  requireAuth,
  requireAdmin,
  adminStatsToolsRouter,
)
app.use('/api/admin/database', requireAuth, requireAdmin, databaseRouter)
app.use('/api/admin/history', requireAuth, requireAdmin, adminHistoryRouter)
app.use('/api/admin/users', requireAuth, requireAdmin, adminUsersRouter)
import { suggestionsRouter } from './routes/suggestions.js'
import { adminSuggestionsRouter } from './routes/adminSuggestions.js'
import { entryProposalsRouter } from './routes/entryProposals.js'
import { adminProposalsRouter } from './routes/adminProposals.js'

app.use('/api/suggestions', suggestionsRouter)
app.use(
  '/api/admin/suggestions',
  requireAuth,
  requireAdmin,
  adminSuggestionsRouter,
)
app.use('/api/entry-proposals', requireAuth, entryProposalsRouter)
app.use(
  '/api/admin/entry-proposals',
  requireAuth,
  requireAdmin,
  adminProposalsRouter,
)

app.use(notFoundHandler)
app.use(errorHandler)

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'API démarrée')
})

async function syncBusinessMetrics() {
  const [users, entries, images, suggestions, proposals, sessions] =
    await Promise.all([
      prisma.user.count(),
      prisma.observationEntry.count(),
      prisma.entryImage.count(),
      prisma.suggestion.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.entryProposal.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.gameSession.groupBy({
        by: ['level', 'finalCorrect'],
        _count: { _all: true },
      }),
    ])

  registeredUsersTotal.set(users)
  observationEntriesTotal.set(entries)
  entryImagesTotal.set(images)

  for (const row of suggestions) {
    suggestionsTotal.set({ status: row.status.toLowerCase() }, row._count._all)
  }

  for (const row of proposals) {
    entryProposalsTotal.set(
      { status: row.status.toLowerCase() },
      row._count._all,
    )
  }

  for (const row of sessions) {
    const outcome =
      row.finalCorrect === true
        ? 'correct'
        : row.finalCorrect === false
          ? 'incorrect'
          : 'abandoned'
    gameSessionsTotal.set(
      { level: row.level.toLowerCase(), outcome },
      row._count._all,
    )
  }
}

void syncBusinessMetrics()
setInterval(() => void syncBusinessMetrics(), 60_000)

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ signal }, 'Arrêt gracieux')
  server.close(async () => {
    await closeRedis()
    logger.info('Serveur et connexions fermés')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
