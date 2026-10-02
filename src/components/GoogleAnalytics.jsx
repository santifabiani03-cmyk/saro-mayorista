'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import { noMedirRuta, noMedirEsteNavegador } from '../utils/analytics'

// El ID de medición no es secreto (se ve en el código de cualquier web que lo use).
const GA_ID = 'G-WSMCJDHZWH'

/**
 * Google Analytics 4. No mide el admin ni los laboratorios (no son clientes) ni
 * los navegadores del equipo que entraron una vez con `?no-medir=1`.
 *
 * Para eso usa el interruptor oficial de Google: `window['ga-disable-<ID>']`.
 * Mientras está en true, gtag no manda nada (ni visitas ni eventos).
 */
export default function GoogleAnalytics() {
  const pathname = usePathname()

  // Next cambia de página sin recargar: el interruptor se actualiza en cada ruta.
  useEffect(() => {
    window[`ga-disable-${GA_ID}`] = noMedirRuta(pathname) || noMedirEsteNavegador()
  }, [pathname])

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      {/* El interruptor se calcula acá también, antes del primer `config`:
          si no, la primera visita al admin se contaría igual. */}
      <Script id="ga-gtag" strategy="afterInteractive">
        {`(function(){
var p=location.pathname,off=/^\\/(admin|lab)/.test(p);
try{var q=new URLSearchParams(location.search).get('no-medir');
if(q==='1')localStorage.setItem('saro_no_medir','1');
if(q==='0')localStorage.removeItem('saro_no_medir');
if(localStorage.getItem('saro_no_medir')==='1')off=true}catch(e){}
window['ga-disable-${GA_ID}']=off;
})();
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  )
}
