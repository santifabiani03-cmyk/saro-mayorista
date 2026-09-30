import { NextResponse } from 'next/server'
import { toSlug } from '../../../utils/slug'
import { leerCatalogo } from '../../../utils/datos'

const BASE_URL = 'https://saro.com.ar'

export async function GET() {
  try {
    const data = await leerCatalogo()
    // Las paletas sólo se publican con precio minorista: sin él, la ficha
    // redirige a /paletas y no tiene sentido mandársela a Google.
    const visibleProducts = data.filter(p => p.visible !== false
      && (p.categoria !== 'paleta' || Number(p.precioMinorista) > 0))

    // Fecha más reciente de actualización de cualquier producto
    const latestDate = visibleProducts.reduce((max, p) => {
      const d = p.fechaActualizacion || p.fechaPublicacion
      return d && d > max ? d : max
    }, '')
    const homeLastmod = latestDate ? new Date(latestDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]

    const urls = [
      `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${homeLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      `  <url>
    <loc>${BASE_URL}/paletas</loc>
    <lastmod>${homeLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
      `  <url>
    <loc>${BASE_URL}/ropa-y-accesorios</loc>
    <lastmod>${homeLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
      `  <url>
    <loc>${BASE_URL}/ropa-y-accesorios/mayorista</loc>
    <lastmod>${homeLastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`,
      ...visibleProducts.map(
        p => {
          const lastmod = p.fechaActualizacion || p.fechaPublicacion
          return `  <url>
    <loc>${BASE_URL}/producto/${toSlug(p.nombre, p.id)}</loc>${lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
        }
      ),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control':
          'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse('Error generating sitemap', { status: 500 })
  }
}
