import fs from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
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

// --- Metadata dinámica para SEO (se renderiza en el server) ---
export async function generateMetadata({ params }) {
  const { slug } = await params
  const products = getProducts()
  const product = findBySlug(products, slug)

  if (!product) {
    return { title: 'Producto no encontrado | SARO Mayorista' }
  }

  const imgs = getImages(product)
  const description = product.descripcion
    ? `${product.nombre} - ${product.descripcion.slice(0, 140)}`
    : `${product.nombre} - Compra al por mayor en SARO Mayorista. ${product.categoria}, ${product.genero}. Precio: $${product.precio}`

  return {
    title: `${product.nombre} | SARO Mayorista`,
    description,
    openGraph: {
      title: `${product.nombre} | SARO Mayorista`,
      description,
      images: imgs[0] ? [`https://saro.com.ar${imgs[0]}`] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.nombre} | SARO Mayorista`,
      description,
      images: imgs[0] ? [`https://saro.com.ar${imgs[0]}`] : [],
    },
  }
}

// --- Página del producto (Server Component) ---
export default async function ProductoPage({ params }) {
  const { slug } = await params
  const products = getProducts()
  const product = findBySlug(products, slug)

  if (!product) notFound()

  const imgs = getImages(product)

  // JSON-LD del producto (renderizado server-side para SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre,
    description:
      product.descripcion || `${product.nombre} - ${product.categoria}`,
    image: imgs[0] ? `https://saro.com.ar${imgs[0]}` : undefined,
    brand: { '@type': 'Brand', name: 'SARO' },
    offers: {
      '@type': 'Offer',
      price: product.precio,
      priceCurrency: 'ARS',
      availability: product.sinStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
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
