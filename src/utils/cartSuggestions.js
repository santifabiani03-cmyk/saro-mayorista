/**
 * Sugerencias para completar el pedido hasta la compra minima.
 *
 * Logica pura (sin React) para poder razonarla y testearla aparte.
 * La usa <CartSuggestions /> dentro del carrito.
 */

// Tope de seguridad: si para llegar al minimo hacen falta mas unidades que esto,
// el producto no es un buen candidato para cerrar la brecha.
const MAX_QTY = 400

/** Precio unitario aplicando la mejor promo que alcance esa cantidad. */
export function unitPriceFor(product, qty) {
  const best = (product.promos ?? [])
    .filter(p => qty >= p.cantidad)
    .sort((a, b) => b.cantidad - a.cantidad)[0]
  return best ? best.precioTotal / best.cantidad : product.precio
}

/** Cuanto suma agregar `qty` unidades de este producto, ya con promo aplicada. */
export function subtotalFor(product, qty) {
  return Math.round(qty * unitPriceFor(product, qty))
}

/**
 * Cantidad minima de este producto que cierra la brecha.
 * Si hay un escalon de promo cerca, salta a el: el cliente paga mejor
 * precio unitario y la sugerencia se vuelve mucho mas atractiva.
 */
export function bestQtyForGap(product, gap) {
  if (gap <= 0 || !product.precio) return 0

  let qty = Math.max(1, Math.ceil(gap / product.precio))
  // Con promo el unitario baja, asi que puede hacer falta alguna unidad mas.
  while (qty < MAX_QTY && subtotalFor(product, qty) < gap) qty++
  if (subtotalFor(product, qty) < gap) return 0 // no llega ni con MAX_QTY

  // Solo saltamos al escalon si no infla el pedido: pasarse mucho del minimo
  // para "aprovechar" una promo es justamente lo que hace que no te compren.
  const nextTier = (product.promos ?? [])
    .map(p => p.cantidad)
    .filter(c => c > qty && subtotalFor(product, c) <= gap * 1.1)
    .sort((a, b) => a - b)[0]

  return nextTier ?? qty
}

/** Primer color/talle con stock real, para poder agregar en un solo tap. */
export function firstAvailableVariant(product) {
  const colores = product.colores?.length ? product.colores : ['Único']
  const talles  = product.talles?.length  ? product.talles  : ['Única']
  const sinStock = (color, talle) =>
    product.noStock?.some(ns => ns.color === color && ns.talle === talle)

  for (const color of colores) {
    for (const talle of talles) {
      if (!sinStock(color, talle)) return { color, talle }
    }
  }
  return null // todas las combinaciones sin stock
}

/**
 * ── Puntaje de una sugerencia ────────────────────────────────────────────
 * Mas bajo = se muestra antes. Aca vive el criterio comercial: que le
 * conviene ofrecerle a un mayorista al que le faltan $X para el minimo.
 *
 * Criterio actual: que se pase lo menos posible del minimo, evitando
 * cantidades poco realistas y premiando lo que desbloquea una promo.
 */
export function scoreSuggestion({ product, qty, subtotal, gap, inCart }) {
  let score = (subtotal - gap) / gap // 0 = clava justo el minimo

  if (qty > 120) score += 0.6 // pedir 300u de algo barato no es una sugerencia seria
  if (inCart)    score += 0.2 // preferimos sumar variedad al pedido

  // Desbloquear promo suma, pero es un desempate: nunca debe ganarle a una
  // sugerencia que encaja mucho mejor con lo que falta.
  const alcanzaPromo = (product.promos ?? []).some(p => qty >= p.cantidad)
  if (alcanzaPromo) score -= 0.05

  return score
}

/**
 * Devuelve hasta `limit` productos que cierran la brecha hasta el minimo.
 * Cada sugerencia trae la cantidad exacta y cuanto suma, lista para agregar.
 */
export function suggestFillers(products, cartItems, gap, limit = 3) {
  if (gap <= 0) return []

  const enCarrito = new Set(cartItems.map(i => i.productId))

  return (products ?? [])
    .filter(p => p.visible && !p.sinStock && p.precio > 0)
    .map(product => {
      const qty = bestQtyForGap(product, gap)
      if (!qty) return null

      const variant = firstAvailableVariant(product)
      if (!variant) return null

      const subtotal = subtotalFor(product, qty)
      const inCart   = enCarrito.has(product.id)

      return {
        product,
        qty,
        subtotal,
        variant,
        score: scoreSuggestion({ product, qty, subtotal, gap, inCart }),
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
}
