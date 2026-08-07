/**
 * Eventos de Google Analytics (GA4).
 *
 * Seguro de llamar siempre: si gtag todavía no cargó (o hay un bloqueador),
 * simplemente no hace nada.
 */
export function track(evento, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', evento, params)
    }
  } catch { /* nunca romper la web por analytics */ }
}
