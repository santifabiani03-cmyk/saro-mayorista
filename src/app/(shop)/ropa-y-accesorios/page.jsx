import fs from 'node:fs'
import path from 'node:path'
import CatalogView from '../CatalogView'

const CATALOG_FILE = path.resolve('catalog/products.json')

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

export const metadata = {
  title: 'Ropa Deportiva y Accesorios de Padel | SARO',
  description:
    'Ropa deportiva y accesorios de padel SARO: remeras, buzos, calzas, shorts, camperas, medias, grips, cubre grips, pelotas, bolsos y mochilas. Directo de fabrica, con envios a toda Argentina.',
  alternates: { canonical: 'https://saro.com.ar/ropa-y-accesorios' },
  openGraph: {
    type: 'website',
    title: 'Ropa Deportiva y Accesorios de Padel | SARO',
    description:
      'Ropa deportiva y accesorios de padel: indumentaria, grips, pelotas, bolsos y mochilas. Directo de fabrica. Envios a toda Argentina.',
    url: 'https://saro.com.ar/ropa-y-accesorios',
    siteName: 'SARO',
    locale: 'es_AR',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
  },
}

// Catálogo minorista (público general): muestra el precio minorista.
export default function RopaYAccesoriosPage() {
  const all = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  const products = all.filter(p => p.categoria !== 'paleta')
  return <CatalogView products={products} kind="ropa" modo="minorista" />
}
