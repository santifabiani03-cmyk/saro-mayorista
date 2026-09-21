'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'

// El ID del Pixel no es secreto (se ve en el código de cualquier web que lo use).
// Va en Vercel como NEXT_PUBLIC_META_PIXEL_ID. Sin él, no se carga nada.
const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '').trim()

// El admin y los laboratorios no son visitas de clientes: no se miden, así no
// ensucian los públicos de los anuncios.
const noMedir = p => p?.startsWith('/admin') || p?.startsWith('/lab')

export default function MetaPixel() {
  const pathname = usePathname()
  const primera = useRef(true)

  // Next cambia de página sin recargar, así que la "visita" se avisa a mano en
  // cada cambio de ruta. La primera la manda el script al cargar: si también la
  // mandáramos acá, contaría doble.
  useEffect(() => {
    if (primera.current) { primera.current = false; return }
    if (!PIXEL_ID || noMedir(pathname)) return
    try { window.fbq?.('track', 'PageView') } catch {}
  }, [pathname])

  if (!PIXEL_ID || noMedir(pathname)) return null

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID.replace(/\D/g, '')}');
fbq('track','PageView');`}
    </Script>
  )
}
