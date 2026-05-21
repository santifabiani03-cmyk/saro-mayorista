import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const PRODUCTS_FILE = path.resolve('public/products.json')
const ASSETS_DIR    = path.resolve('public/assets')

function adminApiPlugin() {
  return {
    name: 'admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()

        // Parsear body JSON
        const body = await new Promise(resolve => {
          let raw = ''
          req.on('data', c => (raw += c))
          req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')) }
            catch { resolve({}) }
          })
        })

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')

        // GET /api/products
        if (req.url === '/api/products' && req.method === 'GET') {
          const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8')
          return res.end(data)
        }

        // POST /api/products  →  guarda el array completo
        if (req.url === '/api/products' && req.method === 'POST') {
          fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(body, null, 2))
          return res.end(JSON.stringify({ ok: true }))
        }

        // POST /api/upload  →  { name: "slug.jpg", data: "<base64>" }
        if (req.url === '/api/upload' && req.method === 'POST') {
          const { name, data } = body
          if (!name || !data) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Faltan name/data' }))
          }
          const safe   = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
          const buffer = Buffer.from(data, 'base64')
          fs.writeFileSync(path.join(ASSETS_DIR, safe), buffer)
          return res.end(JSON.stringify({ ok: true, path: `/assets/${safe}` }))
        }

        // POST /api/publish  →  guarda products.json localmente (en dev, equivale al serverless)
        if (req.url === '/api/publish' && req.method === 'POST') {
          const { products } = body
          if (!Array.isArray(products)) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Body debe tener { products: [...] }' }))
          }
          fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2))
          return res.end(JSON.stringify({ ok: true }))
        }

        // POST /api/deploy  →  vercel --prod (deploy directo desde la PC)
        if (req.url === '/api/deploy' && req.method === 'POST') {
          try {
            const projectDir = path.resolve('.')
            // Buscar vercel en PATH de Windows (npm global)
            const vercelCmd = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
            execSync(`${vercelCmd} --prod --yes`, {
              cwd: projectDir,
              env: { ...process.env },
              timeout: 120000,
            })
            return res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            res.statusCode = 500
            return res.end(JSON.stringify({ error: err.message?.slice(0, 300) ?? 'Error desconocido' }))
          }
        }

        res.statusCode = 404
        res.end(JSON.stringify({ error: 'Not found' }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), adminApiPlugin()],
})
