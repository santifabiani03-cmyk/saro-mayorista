import './globals.css'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import MetaPixel from '../components/MetaPixel'
import GoogleAnalytics from '../components/GoogleAnalytics'

export const metadata = {
  title: 'SARO Tienda Oficial | Paletas de Pádel, Accesorios y Ropa',
  description:
    'Tienda oficial de SARO: paletas de pádel, accesorios y ropa deportiva. Armá tu pedido y cerralo por WhatsApp, con envíos a todo el país. ¿Tenés un comercio? Trabajá con nosotros.',
  keywords:
    'paletas de padel, palas de padel, tienda de padel, accesorios de padel, grip padel, cubre grip, bolso padel, mochila padel, pelotas padel, ropa deportiva, indumentaria deportiva, ropa de entrenamiento, SARO, buzos deportivos, remeras deportivas, shorts deportivos, calzas deportivas, camperas deportivas, medias deportivas, paletas de padel por mayor',
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
    title: 'SARO | Paletas de Pádel, Accesorios y Ropa Deportiva',
    description:
      'Tienda oficial SARO: paletas de pádel, accesorios y ropa deportiva. Envíos a todo el país. Venta por mayor para comercios: Trabajá con nosotros.',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
    url: 'https://saro.com.ar/',
    siteName: 'SARO',
    locale: 'es_AR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SARO | Paletas de Pádel, Accesorios y Ropa Deportiva',
    description:
      'Tienda oficial SARO: paletas de pádel, accesorios y ropa deportiva. Envíos a todo el país. Venta por mayor para comercios: Trabajá con nosotros.',
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
              areaServed: { '@type': 'Country', name: 'Argentina' },
              description:
                'SARO: marca argentina de paletas de pádel, accesorios y ropa deportiva. Tienda oficial con envíos a todo el país y venta mayorista para comercios.',
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
              name: 'SARO',
              url: 'https://saro.com.ar',
              description:
                'Tienda oficial de paletas de pádel, accesorios y ropa deportiva en Argentina',
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
        {/* Limpia service workers/caché viejos (evita ver por un instante la versión anterior de la página) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){});if(window.caches&&caches.keys){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}",
          }}
        />
        {/* Contenido para crawlers (visible antes de que cargue React) */}
        <noscript>
          {/* <p> y no <h1>: cada página ya tiene su propio título principal */}
          <p><strong>SARO — Tienda oficial de paletas de pádel, accesorios y ropa deportiva</strong></p>
          <p>
            Paletas de pádel, accesorios de pádel, grips, bolsos, mochilas y ropa
            deportiva, con envíos a todo el país. ¿Tenés un comercio? Consultá por
            la venta mayorista en Trabajá con nosotros.
          </p>
        </noscript>
        {children}
        <Analytics />
        <SpeedInsights />

        {/* Google Analytics 4 (no mide el admin ni los navegadores del equipo) */}
        <GoogleAnalytics />

        {/* Pixel de Meta (sólo si NEXT_PUBLIC_META_PIXEL_ID está cargado en Vercel) */}
        <MetaPixel />
      </body>
    </html>
  )
}
