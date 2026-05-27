import fs from 'node:fs'
import path from 'node:path'
import CatalogClient from './CatalogClient'

const CATALOG_FILE = path.resolve('catalog/products.json')

// Revalidar cada 60 segundos (ISR)
export const revalidate = 60

export default function HomePage() {
  const products = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  return <CatalogClient products={products} />
}
