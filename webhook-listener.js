import http from 'http'
import { spawn } from 'child_process'
import crypto from 'crypto'

const GITHUB_SECRET = process.env.WEBHOOK_SECRET || 'your-secret-here'
const DEPLOY_SCRIPT = '/home/eanathos/antIdTraining/deploy.sh'

console.log(`Webhook listener starting on port 3001`)
console.log(`Deploy script: ${DEPLOY_SCRIPT}`)

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = ''
    
    req.on('data', chunk => {
      body += chunk.toString()
    })
    
    req.on('end', () => {
      try {
        const signature = req.headers['x-hub-signature-256']
        const hash = 'sha256=' + crypto.createHmac('sha256', GITHUB_SECRET).update(body).digest('hex')
        
        console.log(`[${new Date().toISOString()}] Deploy webhook received`)
        
        if (signature !== hash) {
          console.log(`[${new Date().toISOString()}] Unauthorized: signature mismatch`)
          res.writeHead(401)
          res.end('Unauthorized')
          return
        }
        
        const payload = JSON.parse(body)
        if (payload.ref !== 'refs/heads/main') {
          console.log(`[${new Date().toISOString()}] Ignored: not main branch (${payload.ref})`)
          res.writeHead(200)
          res.end('Ignored (not main branch)')
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
