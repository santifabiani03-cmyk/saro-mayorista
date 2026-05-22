/**
 * Vercel serverless — GET /api/catalog
 * Sirve el catálogo de productos desde catalog/products.json (fuera de public/).
 * El archivo no es accesible como URL estática; solo a través de este endpoint.
 */
import fs   from 'node:fs'
import path from 'node:path'

const CATALOG_FILE = path.resolve('catalog/products.json')

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = fs.readFileSync(CATALOG_FILE, 'utf-8')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // Cache de 60s en CDN, acepta datos hasta 5 min desactualizados mientras revalida
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).send(data)
  } catch {
    return res.status(500).json({ error: 'No se pudo leer el catálogo' })
  }
}
