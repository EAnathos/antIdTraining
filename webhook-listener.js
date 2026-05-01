const http = require('http')
const path = require('path')
const { spawn } = require('child_process')
const crypto = require('crypto')
require('dotenv').config({ path: path.resolve(__dirname, '.env'), override: true })

const GITHUB_SECRET = (process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || 'your-secret-here').trim()
const DEPLOY_SCRIPT = '/home/eanathos/antIdTraining/deploy.sh'

console.log(`Webhook listener starting on port 3001`)
console.log(`Deploy script: ${DEPLOY_SCRIPT}`)

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    const chunks = []
    
    req.on('data', chunk => {
      chunks.push(chunk)
    })
    
    req.on('end', () => {
      try {
        const bodyBuffer = Buffer.concat(chunks)
        const body = bodyBuffer.toString('utf8')
        const signature = req.headers['x-hub-signature-256']
        const hash = 'sha256=' + crypto.createHmac('sha256', GITHUB_SECRET).update(bodyBuffer).digest('hex')
        
        console.log(`[${new Date().toISOString()}] Deploy webhook received`)
        
        if (typeof signature !== 'string' || signature.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash))) {
          console.log(`[${new Date().toISOString()}] Unauthorized: signature mismatch`)
          console.log(`[${new Date().toISOString()}] Received signature: ${signature}`)
          console.log(`[${new Date().toISOString()}] Computed signature: ${hash}`)
          res.writeHead(401)
          res.end('Unauthorized')
          return
        }
        
        const payload = JSON.parse(body)
        if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') {
          console.log(`[${new Date().toISOString()}] Ignored: not a deploy branch (${payload.ref})`)
          res.writeHead(200)
          res.end('Ignored (not deploy branch)')
          return
        }
        
        console.log(`[${new Date().toISOString()}] Deploy started`)
        res.writeHead(200)
        res.end('Deploy started')
        
        const deploy = spawn('bash', [DEPLOY_SCRIPT], { stdio: 'inherit' })
        deploy.on('close', (code) => {
          console.log(`[${new Date().toISOString()}] Deploy finished with code ${code}`)
        })
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error:`, error.message)
        res.writeHead(500)
        res.end('Internal Server Error')
      }
    })
  } else {
    res.writeHead(404)
    res.end()
  }
})

server.listen(3001, () => {
  console.log(`[${new Date().toISOString()}] Webhook listener running on port 3001`)
})
