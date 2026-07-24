import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata = {
  title: 'SARO Mayorista | Paletas de Padel, Ropa Deportiva y Accesorios al por Mayor',
  description:
    'SARO Mayorista: paletas de padel, palas de padel, accesorios de padel, grips, bolsos y ropa deportiva al por mayor en Argentina. Catalogo mayorista con precios exclusivos por cantidad. Envios a todo el pais.',
  keywords:
    'paletas de padel, palas de padel, paletas padel mayorista, accesorios de padel, grip padel, cubre grip, bolso padel, mochila padel, pelotas padel, ropa deportiva mayorista, indumentaria deportiva, ropa de entrenamiento, mayorista Argentina, SARO, buzos deportivos, remeras deportivas, shorts deportivos, calzas deportivas, camperas deportivas, medias deportivas',
  authors: [{ name: 'SARO' }],
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
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
    title: 'SARO Mayorista | Paletas de Padel y Ropa Deportiva al por Mayor',
    description:
      'Paletas de padel, accesorios de padel y ropa deportiva al por mayor. Catalogo mayorista con precios exclusivos. Envios a toda Argentina.',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
    url: 'https://saro.com.ar/',
    siteName: 'SARO Mayorista',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SARO Mayorista | Paletas de Padel y Ropa Deportiva',
    description:
      'Paletas de padel, palas de padel, accesorios y ropa deportiva al por mayor en Argentina. Precios mayoristas exclusivos.',
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
                'SARO: marca de paletas de padel, accesorios de padel y ropa deportiva. Venta mayorista en Argentina con envios a todo el pais.',
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
                'Catalogo mayorista de paletas de padel, accesorios de padel y ropa deportiva en Argentina',
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
          <h1>SARO Mayorista — Paletas de Padel y Ropa Deportiva al por Mayor</h1>
          <p>
            Paletas de padel, palas de padel, accesorios de padel, grips, bolsos,
            mochilas y ropa deportiva al por mayor en Argentina. Catalogo mayorista
            con precios exclusivos por cantidad y envios a todo el pais.
          </p>
        </noscript>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
