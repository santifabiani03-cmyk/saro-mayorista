// Lo que se carga en el admin vive en la memoria de la página hasta que se
// toca "Publicar en sitio". Si la página se recarga, se cierra o (en el
// celular) el navegador la descarta al abrir la galería, se perdía todo
// (18/11/2026: 38 fotos subidas sin producto). Esto lo guarda en el navegador:
// el formulario a medio llenar y la lista con cambios sin publicar.

const PREFIJO_FORMULARIO = 'saro_borrador_'
const CLAVE_LISTA = 'saro_admin_pendiente'

function leer(clave) {
  try {
    const texto = localStorage.getItem(clave)
    return texto ? JSON.parse(texto) : null
  } catch {
    return null
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify({ ...valor, fecha: new Date().toISOString() }))
  } catch {}
}

function borrar(clave) {
  try { localStorage.removeItem(clave) } catch {}
}

// Un borrador por producto: 'nuevo' para el alta, el id para cada edición.
const claveFormulario = id => PREFIJO_FORMULARIO + (id ?? 'nuevo')

export const leerBorradorFormulario   = id => leer(claveFormulario(id))
export const guardarBorradorFormulario = (id, datos) => escribir(claveFormulario(id), datos)
export const borrarBorradorFormulario  = id => borrar(claveFormulario(id))

// La lista guarda también la base (lo publicado cuando se empezó a editar) para
// que /api/publish pueda hacer el merge de 3 vías aunque otro haya publicado.
export const leerListaPendiente    = () => leer(CLAVE_LISTA)
export const guardarListaPendiente = (products, base) => escribir(CLAVE_LISTA, { products, base })
export const borrarListaPendiente  = () => borrar(CLAVE_LISTA)

/** Cuántos productos difieren entre la lista del admin y lo publicado. */
export function contarCambios(products, publicados) {
  const antes = new Map((publicados ?? []).map(p => [p.id, JSON.stringify(p)]))
  let cambios = 0
  for (const p of products) {
    if (antes.get(p.id) !== JSON.stringify(p)) cambios++
    antes.delete(p.id)
  }
  return cambios + antes.size
}

export function fechaCorta(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
