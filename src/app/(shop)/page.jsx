import fs from 'node:fs'
import path from 'node:path'
import Landing from './Landing'

const CATALOG_FILE = path.resolve('catalog/products.json')
const CONFIG_FILE = path.resolve('public/config.json')

// Revalidar cada 60 segundos (ISR) — los contadores siguen al catálogo
export const revalidate = 60

// Metadata de marca para la landing. Canonical a la raíz.
export const metadata = {
  title: 'SARO Mayorista | Paletas de Padel, Accesorios y Ropa Deportiva al por Mayor',
  description:
    'SARO: marca argentina de paletas de padel, accesorios de padel y ropa deportiva. Venta mayorista con precios exclusivos por cantidad, promos y envios a todo el pais. Entra al catalogo y arma tu pedido por WhatsApp.',
  alternates: { canonical: 'https://saro.com.ar/' },
}

export default function HomePage() {
  const products = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
  const visible = products.filter(p => p.visible !== false)

  const paletas = visible.filter(p => p.categoria === 'paleta').length
  const stats = {
    total: visible.length,
    paletas,
    // Ropa + accesorios = todo lo que no es paleta (incluye 'padel', 'ropa' y sin categoría).
    ropaAcc: visible.length - paletas,
  }

  const minPurchase = config.suggestedMinPurchase ?? config.minPurchase

  return (
    <>
      {/* Precarga del modelo 3D: empieza a bajar en paralelo, así la paleta aparece antes */}
      <link rel="preload" href="/models/paleta-opt.glb" as="fetch" crossOrigin="anonymous" />
      <Landing stats={stats} whatsappNumber={config.whatsappNumber} minPurchase={minPurchase} />
    </>
  )
}
