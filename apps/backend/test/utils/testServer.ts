import express, { Router } from 'express'
import { afterAll, beforeAll } from 'vitest'
import { errorHandler } from '../../src/middleware/error.js'

type Middleware = express.RequestHandler | express.ErrorRequestHandler

/**
 * Registers beforeAll/afterAll hooks that spin up a real Express server on an
 * ephemeral port. Returns a `getBaseUrl()` getter that is safe to call inside
 * `it()` blocks after server startup.
 */
export function createTestServer(
  mountPath: string,
  router: Router,
  extraMiddlewares: Middleware[] = [],
) {
  let server: ReturnType<express.Express['listen']>
  let baseUrl = ''

  beforeAll(
    async () =>
      new Promise<void>((resolve) => {
        const app = express()
        app.use(express.json())
        for (const mw of extraMiddlewares) app.use(mw as express.RequestHandler)
        app.use(mountPath, router)
        app.use(errorHandler)

        server = app.listen(0, () => {
          const address = server.address()
          if (address && typeof address === 'object') {
            baseUrl = `http://127.0.0.1:${address.port}`
          }
          resolve()
        })
      }),
  )

  afterAll(
    async () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  )

  return { getBaseUrl: () => baseUrl }
}
