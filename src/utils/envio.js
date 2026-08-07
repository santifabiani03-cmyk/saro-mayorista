/**
 * Cálculo del peso del pedido para cotizar el envío.
 *
 * Al peso de los productos se le suma un margen de packaging según el tamaño
 * del pedido. Ese margen es interno: al cliente sólo se le muestra el peso
 * aproximado final, redondeado a kilos.
 */

// Peso por defecto (gramos) si un producto todavía no tiene el peso cargado.
const PESO_DEFAULT = 400

/** Margen extra según el peso de los productos (gramos). */
function margen(gramos) {
  if (gramos < 3000)  return 300
  if (gramos <= 10000) return 400
  return 500
}

/** Suma el peso de los productos del carrito (gramos). */
export function pesoProductos(items) {
  return (items ?? []).reduce(
    (total, i) => total + (Number(i.peso) || PESO_DEFAULT) * (Number(i.cantidad) || 0),
    0
  )
}

/**
 * Peso total a cotizar, en gramos.
 * Es el que se manda a Correo Argentino.
 */
export function pesoParaCotizar(items) {
  const base = pesoProductos(items)
  if (base <= 0) return 0
  return base + margen(base)
}

/**
 * Peso aproximado que se le muestra al cliente, en kilos enteros
 * (mínimo 1 kg). Es también el que viaja en el mensaje de WhatsApp.
 */
export function pesoAproxKg(items) {
  const gramos = pesoParaCotizar(items)
  if (gramos <= 0) return 0
  return Math.max(1, Math.round(gramos / 1000))
}
