/**
 * Genera un slug URL-friendly a partir del nombre + id del producto.
 * Ej: "Remera Dry-Fit SARO" + "abc12345" → "remera-dry-fit-saro-c12345"
 */
export function toSlug(name, id) {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  // últimos 6 chars del id para unicidad
  const suffix = (id || '').slice(-6)
  return `${base}-${suffix}`
}

/**
 * Dado un slug y un array de productos, encuentra el producto correspondiente.
 */
export function findBySlug(products, slug) {
  return products.find(p => toSlug(p.nombre, p.id) === slug)
}
