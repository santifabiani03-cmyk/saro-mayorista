import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { SITE, armarFeed } from '../../utils/feed'

// Feed de productos para Meta (Catálogo de Commerce Manager) y Google Merchant
// Center. Los dos leen el mismo formato: RSS 2.0 con el espacio de nombres "g:".
// Se arma solo desde catalog/products.json: cada vez que el admin publica, Vercel
// reconstruye la web y el feed queda al día. Meta/Google lo vuelven a leer con
// la frecuencia que se configure allá (ver docs/PUBLICIDAD.md).

const CATALOG_FILE = path.resolve('catalog/products.json')

const esc = v =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function itemXml(item) {
  const lineas = Object.entries(item).flatMap(([k, v]) => {
    if (v == null || v === '') return []
    // Los campos que admiten varios valores se repiten (ej. fotos extra)
    if (Array.isArray(v)) return v.map(x => `      <g:${k}>${esc(x)}</g:${k}>`)
    return [`      <g:${k}>${esc(v)}</g:${k}>`]
  })
  return `    <item>\n${lineas.join('\n')}\n    </item>`
}

export async function GET() {
  try {
    const productos = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
    const { dentro } = armarFeed(productos)

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>SARO — Paletas de pádel, accesorios y ropa deportiva</title>
    <link>${SITE}</link>
    <description>Catálogo de productos SARO</description>
${dentro.map(d => itemXml(d.item)).join('\n')}
  </channel>
</rss>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
    })
  } catch {
    return new NextResponse('Error generando el feed', { status: 500 })
  }
}
