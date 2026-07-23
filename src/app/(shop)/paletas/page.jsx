import fs from 'node:fs'
import path from 'node:path'
import CatalogView from '../CatalogView'

const CATALOG_FILE = path.resolve('catalog/products.json')

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

export const metadata = {
  title: 'Paletas de Padel al por Mayor | Catalogo SARO Mayorista',
  description:
    'Catalogo mayorista de paletas de padel y palas de padel SARO: modelos de control, potencia y polivalentes con tecnologia carbono, fibra de vidrio y goma EVA. Precios exclusivos por cantidad y envios a toda Argentina.',
  alternates: { canonical: 'https://saro.com.ar/paletas' },
  openGraph: {
    type: 'website',
    title: 'Paletas de Padel al por Mayor | SARO',
    description:
      'Paletas de padel de control, potencia y polivalentes al por mayor. Precios mayoristas exclusivos. Envios a toda Argentina.',
    url: 'https://saro.com.ar/paletas',
    siteName: 'SARO Mayorista',
    locale: 'es_AR',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
  },
}

export default function PaletasPage() {
  const all = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  const products = all.filter(p => p.categoria === 'paleta')
  return <CatalogView products={products} kind="paletas" />
}
