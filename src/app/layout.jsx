import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'SARO Mayorista | Ropa Deportiva y Accesorios de Padel al por Mayor',
  description:
    'SARO Mayorista: catalogo completo de ropa deportiva, indumentaria de entrenamiento, paletas de padel, bolsos y accesorios. Venta mayorista en Argentina con precios exclusivos por cantidad.',
  keywords:
    'ropa deportiva mayorista, SARO, padel, paletas de padel, accesorios de padel, indumentaria deportiva, ropa de entrenamiento, mayorista Argentina, buzos deportivos, remeras deportivas, shorts deportivos, bolsos deportivos',
  authors: [{ name: 'SARO' }],
  icons: {
    icon: [
      { url: '/assets/logo-icon.png', type: 'image/png' },
    ],
    apple: '/assets/logo-icon.png',
  },
  manifest: '/manifest.json',
  verification: {
    google: [
      '4K1evDt4misktUKPI7Kw_ykqqrezzmopC3Pw-zz0cpo',
      'iyXkTWesrq-mfJppjXserX-VglfRunBiv-V_QqTgedU',
    ],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://saro.com.ar/' },
  openGraph: {
    type: 'website',
    title: 'SARO Mayorista | Ropa Deportiva y Padel',
    description:
      'Catalogo mayorista de ropa deportiva, indumentaria de entrenamiento, paletas y accesorios de padel. Precios exclusivos por cantidad.',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
    url: 'https://saro.com.ar/',
    siteName: 'SARO Mayorista',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SARO Mayorista | Ropa Deportiva y Padel',
    description:
      'Catalogo mayorista de ropa deportiva, paletas y accesorios de padel. Venta al por mayor en Argentina.',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es-AR">
      <head>
        {/* Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'SARO',
              url: 'https://saro.com.ar',
              logo: 'https://saro.com.ar/assets/logo-horizontal.png',
              description:
                'Marca de indumentaria deportiva y accesorios de padel. Venta mayorista en Argentina.',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'sales',
                availableLanguage: 'Spanish',
              },
            }),
          }}
        />
        {/* Structured Data: WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'SARO Mayorista',
              url: 'https://saro.com.ar',
              description:
                'Catalogo mayorista de ropa deportiva y accesorios de padel',
              inLanguage: 'es-AR',
            }),
          }}
        />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Preload logos for fast LCP */}
        <link rel="preload" as="image" href="/assets/logo-icon.png" />
        <link
          rel="preload"
          as="image"
          href="/assets/logo-horizontal.png"
          media="(min-width: 640px)"
        />
      </head>
      <body>
        {/* Contenido para crawlers (visible antes de que cargue React) */}
        <noscript>
          <h1>SARO Mayorista</h1>
          <p>
            Ropa deportiva, indumentaria de entrenamiento, paletas de padel y
            accesorios. Venta mayorista en Argentina.
          </p>
        </noscript>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
