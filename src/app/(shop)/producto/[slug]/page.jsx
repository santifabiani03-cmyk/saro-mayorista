import fs from 'node:fs'
import path from 'node:path'
import { notFound, redirect } from 'next/navigation'
import { findBySlug } from '../../../../utils/slug'
import ProductClient from './ProductClient'

const CATALOG_FILE = path.resolve('catalog/products.json')

function getProducts() {
  return JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
}

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
  const products = getProducts()
  const product = findBySlug(products, slug)

  if (!product) {
    return { title: 'Producto no encontrado | SARO Mayorista' }
  }

  const imgs = getImages(product)
  const catLabel = product.categoria === 'paleta' ? 'Paleta de padel'
    : product.categoria === 'padel' ? 'Accesorio de padel'
    : 'Ropa deportiva'

  const description = product.descripcion
    ? `${product.nombre} — ${catLabel} al por mayor. ${product.descripcion.slice(0, 120)}`
    : product.categoria === 'paleta'
      ? `${product.nombre} — ${catLabel} SARO. Envios a toda Argentina.`
      : `${product.nombre} — ${catLabel} al por mayor en SARO Mayorista. Precio mayorista: $${product.precio.toLocaleString('es-AR')}. Envios a toda Argentina.`

  const imgUrl = imgs[0]
    ? (imgs[0].startsWith('http') ? imgs[0] : `https://saro.com.ar${imgs[0]}`)
    : undefined

  return {
    title: `${product.nombre} | ${catLabel} Mayorista | SARO`,
    description,
    openGraph: {
      title: `${product.nombre} | ${catLabel} al por Mayor`,
      description,
      images: imgUrl ? [imgUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.nombre} | ${catLabel} Mayorista`,
      description,
      images: imgUrl ? [imgUrl] : [],
    },
    alternates: {
      canonical: `https://saro.com.ar/producto/${slug}`,
    },
  }
}

// --- Página del producto (Server Component) ---
export default async function ProductoPage({ params, searchParams }) {
  const { slug } = await params
  const { modo } = (await searchParams) ?? {}
  const products = getProducts()
  const found = findBySlug(products, slug)

  if (!found) notFound()

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

  const catLabel = product.categoria === 'paleta' ? 'Paleta de padel'
    : product.categoria === 'padel' ? 'Accesorio de padel'
    : 'Ropa deportiva'

  const prodImgUrl = imgs[0]
    ? (imgs[0].startsWith('http') ? imgs[0] : `https://saro.com.ar${imgs[0]}`)
    : undefined

  // JSON-LD del producto (renderizado server-side para SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre,
    description:
      product.descripcion || `${product.nombre} — ${catLabel} al por mayor en SARO Mayorista`,
    image: prodImgUrl,
    brand: { '@type': 'Brand', name: 'SARO' },
    category: catLabel,
    offers: {
      '@type': 'Offer',
      price: product.precio,
      priceCurrency: 'ARS',
      availability: product.sinStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'SARO Mayorista' },
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient product={product} />
    </>
  )
}
