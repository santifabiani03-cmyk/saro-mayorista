/**
 * Vercel serverless — GET /api/sitemap
 * Genera sitemap.xml dinámico con todas las rutas de productos.
 */
import fs   from 'node:fs'
import path from 'node:path'

const CATALOG_FILE = path.resolve('catalog/products.json')
const BASE_URL = 'https://saro-mayorista.vercel.app'

function toSlug(name, id) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  const suffix = (id || '').slice(-6)
  return `${base}-${suffix}`
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end('Method not allowed')
  }

  try {
    const data = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
    const visibleProducts = data.filter(p => p.visible !== false)

    const urls = [
      // Página principal
      `  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      // Páginas de producto
      ...visibleProducts.map(p => `  <url>
    <loc>${BASE_URL}/producto/${toSlug(p.nombre, p.id)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).send(xml)
  } catch {
    return res.status(500).end('Error generating sitemap')
  }
}
