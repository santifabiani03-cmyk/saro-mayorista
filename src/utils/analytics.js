/**
 * Eventos de Google Analytics (GA4) y del Pixel de Meta.
 *
 * Seguro de llamar siempre: si gtag o fbq todavía no cargaron (o hay un
 * bloqueador, o no está configurado el Pixel), simplemente no hace nada.
 *
 * Los `content_ids` / `item_id` son el `id` del producto: tienen que coincidir
 * con el `g:id` del feed (/feed.xml) para que Meta sepa qué producto vio cada
 * persona y se lo vuelva a mostrar en los anuncios de catálogo.
 */
export function track(evento, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', evento, params)
    }
  } catch { /* nunca romper la web por analytics */ }
}

export function trackMeta(evento, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', evento, params)
    }
  } catch { /* nunca romper la web por analytics */ }
}

const itemGA = (p, cantidad = 1) => ({
  item_id: p.id,
  item_name: p.nombre,
  item_brand: 'SARO',
  item_category: p.categoria || 'accesorio',
  price: p.precio,
  quantity: cantidad,
})

/** Alguien abrió la ficha o el detalle de un producto. */
export function trackVerProducto(p) {
  track('view_item', { currency: 'ARS', value: p.precio, items: [itemGA(p)] })
  trackMeta('ViewContent', {
    content_ids: [p.id],
    content_type: 'product',
    content_name: p.nombre,
    value: p.precio,
    currency: 'ARS',
  })
}

/** Agregó unidades de un producto al carrito. */
export function trackAgregarAlCarrito(p, cantidad) {
  track('add_to_cart', { currency: 'ARS', value: p.precio * cantidad, items: [itemGA(p, cantidad)] })
  trackMeta('AddToCart', {
    content_ids: [p.id],
    content_type: 'product',
    content_name: p.nombre,
    value: p.precio * cantidad,
    currency: 'ARS',
  })
}

/**
 * Mandó el pedido por WhatsApp. No es una compra confirmada (la venta se cierra
 * a mano), por eso en Meta va como "InitiateCheckout" y no como "Purchase".
 */
export function trackPedidoWhatsApp(items, total) {
  const ids = [...new Set(items.map(i => i.productId))]
  trackMeta('InitiateCheckout', {
    content_ids: ids,
    content_type: 'product',
    num_items: items.reduce((s, i) => s + i.cantidad, 0),
    value: total,
    currency: 'ARS',
  })
}

/** Tocó un botón de WhatsApp que no es el del carrito (consulta general). */
export function trackContacto(origen) {
  track('contacto_whatsapp', { origen })
  trackMeta('Contact', { content_name: origen })
}

/** Se postuló como revendedor en "Trabajá con nosotros". */
export function trackLeadMayorista(provincia) {
  trackMeta('Lead', { content_name: 'trabaja_con_nosotros', content_category: provincia || '' })
}
