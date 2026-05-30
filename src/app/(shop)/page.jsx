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

  // Contar productos por categoría para mostrar info útil al crawler
  const paletas = visible.filter(p => p.categoria === 'paleta')
  const padel   = visible.filter(p => p.categoria === 'padel')
  const ropa    = visible.filter(p => p.categoria === 'ropa')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <CatalogClient products={products} />

      {/* Sección SEO server-rendered — Google la ve, el usuario la ve como info útil al final */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800">
            Catalogo mayorista de padel y ropa deportiva
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-gray-500 leading-relaxed">
            {paletas.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Paletas de padel ({paletas.length})</h3>
                <p>
                  Paletas de padel y palas de padel para todos los niveles.
                  Modelos de control, potencia y polivalentes con materiales
                  de carbono, fibra de vidrio y goma EVA. Venta mayorista
                  con precios exclusivos por cantidad.
                </p>
              </div>
            )}
            {padel.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Accesorios de padel ({padel.length})</h3>
                <p>
                  Grips, cubre grips perforados, pelotas de padel, bolsos,
                  mochilas, protectores y accesorios deportivos para padel.
                  Todo lo que necesitas para equipar tu tienda o club
                  de padel al por mayor en Argentina.
                </p>
              </div>
            )}
            {ropa.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-700 mb-1">Ropa deportiva ({ropa.length})</h3>
                <p>
                  Indumentaria deportiva mayorista: remeras, buzos, shorts,
                  calzas, camperas y medias deportivas. Ropa de entrenamiento
                  y competicion para hombre y mujer con envios a toda Argentina.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
