import fs from 'node:fs'
import path from 'node:path'
import CatalogClient from './CatalogClient'

const CATALOG_FILE = path.resolve('catalog/products.json')

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

export default function HomePage() {
  const products = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  const visible = products.filter(p => p.visible !== false)

  // Schema.org ItemList — Google muestra como carrusel de productos
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catalogo SARO Mayorista — Paletas de Padel y Ropa Deportiva',
    numberOfItems: visible.length,
    itemListElement: visible.slice(0, 30).map((p, i) => {
      const imgs = getImages(p)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.nombre,
          image: imgs[0] ? (imgs[0].startsWith('http') ? imgs[0] : `https://saro.com.ar${imgs[0]}`) : undefined,
          brand: { '@type': 'Brand', name: 'SARO' },
          offers: {
            '@type': 'Offer',
            price: p.precio,
            priceCurrency: 'ARS',
            availability: p.sinStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
          },
        },
      }
    }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <CatalogClient products={products} />
    </>
  )
}
