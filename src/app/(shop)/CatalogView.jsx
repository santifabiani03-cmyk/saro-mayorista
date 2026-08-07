import CatalogClient from './CatalogClient'
import GuiaPaletas from '../../components/GuiaPaletas'

const getImages = p => (p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : [])

// Contenido SEO por catálogo. `kind` = 'paletas' | 'ropa'.
const SEO = {
  paletas: {
    listName: 'Catalogo de Paletas de Padel — SARO Mayorista',
    heading: 'Paletas de pádel',
    seoTitle: 'Paletas de padel al por mayor',
    blocks: [
      {
        h: 'Paletas de padel',
        p: 'Paletas de padel y palas de padel para todos los niveles. Modelos de control, potencia y polivalentes con materiales de carbono, fibra de vidrio y goma EVA. Venta mayorista con precios exclusivos por cantidad.',
      },
    ],
  },
  ropa: {
    listName: 'Catalogo de Ropa Deportiva y Accesorios de Padel — SARO Mayorista',
    heading: 'Ropa y accesorios',
    seoTitle: 'Ropa deportiva y accesorios de padel al por mayor',
    blocks: [
      {
        h: 'Accesorios de padel',
        p: 'Grips, cubre grips perforados, pelotas de padel, bolsos, mochilas, protectores y accesorios deportivos para padel. Todo para equipar tu tienda o club de padel al por mayor en Argentina.',
      },
      {
        h: 'Ropa deportiva',
        p: 'Indumentaria deportiva mayorista: remeras, buzos, shorts, calzas, camperas y medias deportivas. Ropa de entrenamiento y competicion para hombre y mujer con envios a toda Argentina.',
      },
    ],
  },
}

export default function CatalogView({ products, kind }) {
  const meta = SEO[kind]
  const visible = products.filter(p => p.visible !== false)

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: meta.listName,
    numberOfItems: visible.length,
    itemListElement: visible.slice(0, 30).map((p, i) => {
      const imgs = getImages(p)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: p.nombre,
          image: imgs[0]
            ? imgs[0].startsWith('http')
              ? imgs[0]
              : `https://saro.com.ar${imgs[0]}`
            : undefined,
          brand: { '@type': 'Brand', name: 'SARO' },
          offers: {
            '@type': 'Offer',
            price: p.precio,
            priceCurrency: 'ARS',
            availability: p.sinStock
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
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
      <CatalogClient products={products} heading={meta.heading} showFilters={kind !== 'paletas'} />

      {/* Guía de compra (sólo en el catálogo de paletas) */}
      {kind === 'paletas' && <GuiaPaletas />}

      {/* Sección SEO server-rendered */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-card p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">{meta.seoTitle}</h2>
          <div
            className={`grid gap-4 text-sm text-gray-500 leading-relaxed ${
              meta.blocks.length > 1 ? 'sm:grid-cols-2' : ''
            }`}
          >
            {meta.blocks.map((b, i) => (
              <div key={i}>
                <h3 className="font-semibold text-gray-700 mb-1">{b.h}</h3>
                <p>{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
