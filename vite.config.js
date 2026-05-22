import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

const PRODUCTS_FILE = path.resolve('catalog/products.json')
const ASSETS_DIR    = path.resolve('public/assets')

// Leer ADMIN_PIN del .env.local para el servidor de desarrollo
const _envLocal = (() => {
  try {
    return Object.fromEntries(
      fs.readFileSync('.env.local', 'utf-8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
    )
  } catch { return {} }
})()
const DEV_ADMIN_PIN = process.env.ADMIN_PIN
  ?? _envLocal.ADMIN_PIN
  ?? _envLocal.VITE_ADMIN_PIN
  ?? 'saro2025'

const DEV_GEMINI_KEY = process.env.GEMINI_API_KEY
  ?? _envLocal.GEMINI_API_KEY
  ?? ''

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

        // GET /api/catalog  →  sirve el catálogo (mismo comportamiento que el serverless de prod)
        if (req.url === '/api/catalog' && req.method === 'GET') {
          const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          return res.end(data)
        }

        // GET /api/products  →  alias legacy para el admin (dev only)
        if (req.url === '/api/products' && req.method === 'GET') {
          const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8')
          return res.end(data)
        }

        // POST /api/products  →  guarda el array completo (dev only)
        if (req.url === '/api/products' && req.method === 'POST') {
          fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(body, null, 2))
          return res.end(JSON.stringify({ ok: true }))
        }

        // POST /api/upload  →  { name: "slug.jpg", data: "<base64>", pin }  (legacy, dev only)
        // POST /api/upload-image  →  mismo comportamiento (usado en prod también)
        if ((req.url === '/api/upload' || req.url === '/api/upload-image') && req.method === 'POST') {
          const { name, data, pin } = body
          if (typeof pin !== 'string' || pin !== DEV_ADMIN_PIN) {
            res.statusCode = 401
            return res.end(JSON.stringify({ error: 'No autorizado' }))
          }
          if (!name || !data) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Faltan name/data' }))
          }
          const safe   = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
          const buffer = Buffer.from(data, 'base64')
          fs.writeFileSync(path.join(ASSETS_DIR, safe), buffer)
          return res.end(JSON.stringify({ ok: true, path: `/assets/${safe}` }))
        }

        // POST /api/verify-pin  →  valida el PIN del admin (en dev, lee del .env.local)
        if (req.url === '/api/verify-pin' && req.method === 'POST') {
          const { pin } = body
          return res.end(JSON.stringify({ ok: typeof pin === 'string' && pin === DEV_ADMIN_PIN }))
        }

        // POST /api/publish  →  guarda products.json localmente (en dev, equivale al serverless)
        if (req.url === '/api/publish' && req.method === 'POST') {
          const { products, pin } = body
          if (typeof pin !== 'string' || pin !== DEV_ADMIN_PIN) {
            res.statusCode = 401
            return res.end(JSON.stringify({ error: 'No autorizado' }))
          }
          if (!Array.isArray(products)) {
            res.statusCode = 400
            return res.end(JSON.stringify({ error: 'Body debe tener { products: [...] }' }))
          }
          fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2))
          return res.end(JSON.stringify({ ok: true }))
        }

        // POST /api/generate-description  →  proxy a Gemini API
        if (req.url === '/api/generate-description' && req.method === 'POST') {
          if (!DEV_GEMINI_KEY) {
            res.statusCode = 500
            return res.end(JSON.stringify({ error: 'GEMINI_API_KEY no configurada en .env.local' }))
          }
          const { nombre, keywords, precio } = body
          const info = keywords?.trim() ? `${nombre} — ${keywords}` : nombre
          const prompt = `Escribí una descripción corta de producto para una tienda online mayorista de indumentaria deportiva y pádel en Argentina.

REGLAS ESTRICTAS:
- Entre 2 y 4 oraciones, máximo 80 palabras en total.
- Hablá en tercera persona describiendo el producto, NUNCA uses "ofrezca", "sus clientes", "usted" ni te dirijas al lector.
- Describí qué ES el producto y por qué es bueno. Ejemplo: "Remera de entrenamiento con tejido dry-fit que mantiene el cuerpo fresco. Ideal para pádel y running."
- Usá un tono confiable y profesional, sin exageraciones.
- No uses emojis, hashtags ni signos de exclamación.
- Si no tenés info suficiente, describí el producto de forma genérica basándote en su nombre.
- Respondé ÚNICAMENTE con el texto de la descripción, nada más.

Producto: ${info}`

          try {
            const geminiRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${DEV_GEMINI_KEY}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.8, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
                }),
              }
            )
            const geminiData = await geminiRes.json()
            console.log('[Gemini response]', JSON.stringify(geminiData, null, 2))
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
            if (text) {
              return res.end(JSON.stringify({ ok: true, descripcion: text }))
            }
            res.statusCode = 502
            const errDetail = geminiData.error?.message || JSON.stringify(geminiData)
            return res.end(JSON.stringify({ error: 'Gemini no devolvió texto: ' + errDetail }))
          } catch (e) {
            res.statusCode = 500
            return res.end(JSON.stringify({ error: 'Error al conectar con Gemini: ' + (e.message ?? '') }))
          }
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
