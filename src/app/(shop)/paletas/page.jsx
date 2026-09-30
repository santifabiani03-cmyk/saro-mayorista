import CatalogView from '../CatalogView'
import { leerCatalogo } from '../../../utils/datos'

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

export default async function PaletasPage() {
  const all = await leerCatalogo()
  const products = all.filter(p => p.categoria === 'paleta')
  // Público general: precio minorista, sin compra mínima.
  return <CatalogView products={products} kind="paletas" modo="minorista" />
}
