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
 * Si el nombre cambió desde el admin, el slug viejo ya no coincide: se busca
 * por los 6 caracteres del id del final (sólo si hay un único producto con ese
 * final), para que los links compartidos o indexados sigan funcionando.
 */
export function findBySlug(products, slug) {
  const exacto = products.find(p => toSlug(p.nombre, p.id) === slug)
  if (exacto) return exacto
  const suffix = String(slug).split('-').pop()
  if (!suffix || suffix.length !== 6) return undefined
  const porId = products.filter(p => (p.id || '').slice(-6) === suffix)
  return porId.length === 1 ? porId[0] : undefined
}
