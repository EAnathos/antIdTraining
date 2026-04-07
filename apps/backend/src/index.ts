import cors from 'cors'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerUi from 'swagger-ui-express'
import { config } from './config.js'
import { authRouter } from './routes/auth.js'
import { entriesRouter } from './routes/entries.js'
import { gameRouter } from './routes/game.js'
import { openApiDocument } from './openapi.js'
import { referencesRouter } from './routes/references.js'
import { taxonsRouter } from './routes/taxons.js'
import { requireAdmin, requireAuth } from './middleware/auth.js'

const app = express()
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const uploadsPath = path.resolve(currentDir, '../uploads')

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsPath))

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
app.use('/api/taxons', taxonsRouter)
app.use('/api/references', referencesRouter)

app.use('/api/admin/entries', requireAuth, requireAdmin, entriesRouter)
app.use('/api/admin/taxons', requireAuth, requireAdmin, taxonsRouter)
app.use('/api/admin/references', requireAuth, requireAdmin, referencesRouter)

app.listen(config.port, () => {
  console.log(`API démarrée sur http://localhost:${config.port}`)
})
