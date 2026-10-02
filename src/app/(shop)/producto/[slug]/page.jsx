import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { findBySlug, toSlug } from '../../../../utils/slug'
import ProductClient from './ProductClient'
import { leerCatalogo } from '../../../../utils/datos'

// JSON para <script type="application/ld+json">: sin "<" literal, así un texto
// cargado en el admin nunca puede cerrar la etiqueta antes de tiempo.
const jsonLdHtml = o => JSON.stringify(o).replace(/</g, '\\u003c')

const getImages = p =>
  p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

// Las páginas de producto se generan on-demand via ISR (revalidate=60).
// generateStaticParams fue removido porque algunos productos causan errores
// de pre-render que bloquean todo el build de Vercel.
// El sitemap dinámico (/api/sitemap) ya lista todas las URLs para Google.

// --- Metadata dinámica para SEO (se renderiza en el server) ---
export async function generateMetadata({ params }) {
  const { slug } = await params
  const products = await leerCatalogo()
  const product = findBySlug(products, slug)

  if (!product) {
    return { title: 'Producto no encontrado | SARO' }
  }

  const imgs = getImages(product)
  const catLabel = product.categoria === 'paleta' ? 'Paleta de pádel'
    : product.categoria === 'padel' ? 'Accesorio de pádel'
    : 'Ropa deportiva'

  // Con precio minorista (y las paletas, que sólo se publican con él) la ficha
  // es de la tienda: no se anuncia el mayorista. Es lo que muestran Google y la
  // vista previa del link, y tiene que coincidir con la ficha y los anuncios.
  // El resto sólo se vende por mayor.
  const minorista = product.categoria === 'paleta' || Number(product.precioMinorista) > 0
  const nombre = product.nombre.trim()
  const description = minorista
    ? product.descripcion
      ? `${nombre} — ${catLabel} SARO. ${product.descripcion.slice(0, 120)}`
      : `${nombre} — ${catLabel} SARO. Envíos a todo el país.`
    : product.descripcion
      ? `${nombre} — ${catLabel} al por mayor. ${product.descripcion.slice(0, 120)}`
      : `${nombre} — ${catLabel} al por mayor en SARO. Precio mayorista: $${product.precio.toLocaleString('es-AR')}. Envíos a todo el país.`
  const titulo = minorista ? `${nombre} | ${catLabel}` : `${nombre} | ${catLabel} por mayor`

  const imgUrl = imgs[0]
    ? (imgs[0].startsWith('http') ? imgs[0] : `https://saro.com.ar${imgs[0]}`)
    : undefined

  return {
    title: `${titulo} | SARO`,
    description,
    openGraph: {
      title: titulo,
      description,
      images: imgUrl ? [imgUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description,
      images: imgUrl ? [imgUrl] : [],
    },
    alternates: {
      canonical: `https://saro.com.ar/producto/${toSlug(product.nombre, product.id)}`,
    },
  }
}

// --- Página del producto (Server Component) ---
export default async function ProductoPage({ params, searchParams }) {
  const { slug } = await params
  const { modo } = (await searchParams) ?? {}
  const products = await leerCatalogo()
  const found = findBySlug(products, slug)

  if (!found) notFound()

  // Link viejo (el producto se renombró): 301 a la URL actual.
  const actual = toSlug(found.nombre, found.id)
  if (slug !== actual) {
    permanentRedirect(`/producto/${actual}${modo === 'mayorista' ? '?modo=mayorista' : ''}`)
  }

  // Las paletas se venden al público: la ficha muestra el precio minorista.
  // Sin precio minorista cargado no se publican (igual que en /paletas).
  // El resto también muestra el minorista si lo tiene, salvo que se entre desde
  // el catálogo mayorista (?modo=mayorista). Así el precio de la ficha coincide
  // con el del catálogo público y con el de los anuncios (/feed.xml): si no
  // coinciden, Meta y Google rechazan el producto.
  let product = found
  const tieneMinorista = Number(found.precioMinorista) > 0
  if (found.categoria === 'paleta') {
    if (!tieneMinorista) redirect('/paletas')
    product = { ...found, precio: Number(found.precioMinorista), promos: [], modo: 'minorista' }
  } else if (tieneMinorista && modo !== 'mayorista') {
    product = { ...found, precio: Number(found.precioMinorista), promos: [], modo: 'minorista' }
  } else {
    product = { ...found, modo: 'mayorista' }
  }

  const imgs = getImages(product)

  const catLabel = product.categoria === 'paleta' ? 'Paleta de pádel'
    : product.categoria === 'padel' ? 'Accesorio de pádel'
    : 'Ropa deportiva'

  const imgUrls = imgs.map(u => (u.startsWith('http') ? u : `https://saro.com.ar${u}`))
  const url = `https://saro.com.ar/producto/${actual}`

  // Catálogo al que pertenece (para la "miga de pan" de Google)
  const catalogo = product.categoria === 'paleta'
    ? { name: 'Paletas de pádel', item: 'https://saro.com.ar/paletas' }
    : tieneMinorista
      ? { name: 'Ropa y accesorios', item: 'https://saro.com.ar/ropa-y-accesorios' }
      : { name: 'Ropa y accesorios por mayor', item: 'https://saro.com.ar/ropa-y-accesorios/mayorista' }

  // JSON-LD del producto (renderizado server-side para SEO). Con esto Google
  // puede mostrar precio y stock directamente en el resultado de búsqueda.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre.trim(),
    description:
      product.descripcion || `${product.nombre.trim()} — ${catLabel} SARO`,
    image: imgUrls.length ? imgUrls : undefined,
    url,
    sku: product.id,
    brand: { '@type': 'Brand', name: 'SARO' },
    category: catLabel,
    offers: {
      '@type': 'Offer',
      url,
      price: product.precio,
      priceCurrency: 'ARS',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.sinStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'SARO' },
    },
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://saro.com.ar/' },
      { '@type': 'ListItem', position: 2, ...catalogo },
      { '@type': 'ListItem', position: 3, name: product.nombre.trim(), item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbLd) }}
      />
      <ProductClient product={product} />
    </>
  )
}
