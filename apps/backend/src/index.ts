import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'
import { config } from './config.js'
import { authRouter } from './routes/auth.js'
import { databaseRouter } from './routes/database.js'
import { entriesRouter } from './routes/entries.js'
import { gameRouter } from './routes/game.js'
import { openApiDocument } from './openapi.js'
import { adminReferencesRouter, publicReferencesRouter } from './routes/references.js'
import { statsRouter } from './routes/stats.js'
import { adminTaxonsRouter, publicTaxonsRouter } from './routes/taxons.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

function parseCorsOrigins(value: string | undefined) {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080']

  const rawOrigins = value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : []

  return rawOrigins.length > 0 ? rawOrigins : defaults
}

const app = express()
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
app.use(express.json())
app.use('/uploads', express.static(uploadsPath))

app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    const logEntry = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    }

    console.log(JSON.stringify(logEntry))
  })

  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

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
          value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  }),
)

app.use('/api/auth', authRouter)
app.use('/api/game', gameRouter)
app.use('/api/taxons', publicTaxonsRouter)
app.use('/api/references', publicReferencesRouter)

app.use('/api/admin/entries', requireAuth, requireAdmin, entriesRouter)
app.use('/api/admin/taxons', requireAuth, requireAdmin, adminTaxonsRouter)
app.use('/api/admin/references', requireAuth, requireAdmin, adminReferencesRouter)
app.use('/api/admin/stats', requireAuth, requireAdmin, statsRouter)
app.use('/api/admin/database', requireAuth, requireAdmin, databaseRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`API démarrée sur http://localhost:${config.port}`)
})
