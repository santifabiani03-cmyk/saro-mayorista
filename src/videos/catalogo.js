/**
 * Catálogo de plantillas de video y de músicas. Sin React ni Remotion: lo leen
 * también la API (/api/videos/render) y el workflow de GitHub para validar el
 * pedido. Los componentes de cada plantilla están en plantillas.js.
 *
 * Para sumar una plantilla: agregala acá y en plantillas.js (ver CLAUDE.md §8).
 */

export const PLANTILLAS_META = [
  {
    id: 'SaroColeccion',
    slug: 'coleccion',
    nombre: 'Colección',
    descripcion: 'Reel vertical: paleta 3D, una escena por paleta, la línea completa y el cierre.',
    formato: 'Vertical 9:16',
    ancho: 1080,
    alto: 1920,
    fps: 30,
    min: 1,
    max: 8,
    soloPaletas: true,
    musica: 'parallel-universe',
  },
  {
    id: 'SaroFicha',
    slug: 'ficha',
    nombre: 'Ficha',
    descripcion: 'Un producto solo, con specs y precio. Unos 7 segundos.',
    formato: 'Vertical 9:16',
    ancho: 1080,
    alto: 1920,
    fps: 30,
    min: 1,
    max: 1,
    soloPaletas: false,
    musica: 'parallel-universe',
  },
  {
    id: 'SaroWeb',
    slug: 'web',
    nombre: 'Presentación web',
    descripcion: 'Recorrido por saro.com.ar. Los productos elegidos arman el mensaje de WhatsApp de ejemplo.',
    formato: 'Horizontal 16:9',
    ancho: 1920,
    alto: 1080,
    fps: 30,
    min: 1,
    max: 2,
    soloPaletas: false,
    musica: 'mellow-chill',
  },
]

export const plantillaMeta = id => PLANTILLAS_META.find(p => p.id === id) ?? null

// Música CC0 (ver public/videos/LICENCIAS.md). `desde` = segundo de la pista
// donde arranca el video, elegido para que empiece en una parte tranquila.
export const MUSICAS = [
  { id: 'parallel-universe', nombre: 'Parallel Universe (enérgica suave)', archivo: 'parallel-universe.mp3', desde: 66 },
  { id: 'mellow-chill', nombre: 'Mellow Chill (tranquila)', archivo: 'mellow-chill.mp3', desde: 39 },
  { id: 'ninguna', nombre: 'Sin música', archivo: null, desde: 0 },
]

export const musicaPorId = id => MUSICAS.find(m => m.id === id) ?? MUSICAS[0]

// Identificador de cada pedido de render: "coleccion-20260928-1942-k3x9". Va en
// el nombre de la ejecución de GitHub y del MP4, por eso sólo letras y números.
export const REQUEST_ID_VALIDO = /^[a-z]+-\d{8}-\d{4}-[a-z0-9]{4}$/

/**
 * Revisa que las props de un pedido sean usables. Devuelve el motivo del
 * problema o null. La usan la API y el workflow, así los dos rechazan lo mismo.
 */
export function problemaDelPedido(meta, props) {
  if (!meta) return 'Plantilla desconocida'
  const productos = props?.productos
  if (!Array.isArray(productos)) return 'Faltan los productos'
  if (productos.length < meta.min || productos.length > meta.max) {
    return meta.min === meta.max
      ? `Esta plantilla usa ${meta.min} producto`
      : `Esta plantilla usa entre ${meta.min} y ${meta.max} productos`
  }
  for (const p of productos) {
    if (!p || typeof p.nombre !== 'string' || !p.nombre) return 'Hay un producto sin nombre'
    if (!(Number(p.precio) > 0)) return `"${p.nombre}" no tiene precio al público`
    if (typeof p.imagen !== 'string' || !p.imagen.startsWith('https://')) return `"${p.nombre}" no tiene foto`
    if (meta.soloPaletas && p.categoria !== 'paleta') return `"${p.nombre}" no es una paleta`
  }
  if (!MUSICAS.some(m => m.id === props.musica)) return 'Música desconocida'
  return null
}
