import fs from 'node:fs'
import path from 'node:path'
import CatalogView from '../CatalogView'

const CATALOG_FILE = path.resolve('catalog/products.json')

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

export const metadata = {
  title: 'Paletas de Pádel | Tienda Oficial SARO',
  description:
    'Paletas de pádel SARO para todos los niveles: modelos de control, potencia y polivalentes con tecnología de carbono, fibra de vidrio y goma EVA. Envíos a todo el país.',
  alternates: { canonical: 'https://saro.com.ar/paletas' },
  openGraph: {
    type: 'website',
    title: 'Paletas de Pádel | Tienda Oficial SARO',
    description:
      'Paletas de pádel SARO de control, potencia y polivalentes. Envíos a todo el país.',
    url: 'https://saro.com.ar/paletas',
    siteName: 'SARO',
    locale: 'es_AR',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
  },
}

export default function PaletasPage() {
  const all = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  const products = all.filter(p => p.categoria === 'paleta')
  // Público general: precio minorista, sin compra mínima.
  return <CatalogView products={products} kind="paletas" modo="minorista" />
}
