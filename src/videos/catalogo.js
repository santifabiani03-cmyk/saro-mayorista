/**
 * Catálogo de plantillas, formatos, músicas y niveles de efectos. Sin React ni
 * Remotion: lo leen también la API (/api/videos/render) y el workflow de GitHub
 * para validar el pedido. Los componentes de cada plantilla están en plantillas.js.
 *
 * Para sumar una plantilla: agregala acá y en plantillas.js (ver CLAUDE.md §8).
 */

// Tamaños de salida. Cada plantilla dice cuáles admite (el primero es el de
// fábrica). La zona segura de cada uno está en comun.jsx (useMarco).
export const FORMATOS = {
  vertical: { id: 'vertical', nombre: 'Vertical 9:16', uso: 'Reels, Historias, TikTok, estados', ancho: 1080, alto: 1920 },
  feed: { id: 'feed', nombre: 'Feed 4:5', uso: 'Publicación y anuncios del feed', ancho: 1080, alto: 1350 },
  horizontal: { id: 'horizontal', nombre: 'Horizontal 16:9', uso: 'YouTube, web, presentaciones', ancho: 1920, alto: 1080 },
}

// Textos que se pueden cambiar desde el admin. Vacío = el texto de fábrica,
// que arma cada plantilla con los datos de los productos (textos.js).
export const CAMPOS_TEXTO = {
  etiqueta: { nombre: 'Etiqueta chica', max: 26, ayuda: 'Arriba del título. Ej.: CYBERMONDAY, NUEVO INGRESO' },
  gancho: { nombre: 'Frase gancho', max: 44, ayuda: 'Lo primero que se lee. Tiene que frenar el scroll' },
  cierre: { nombre: 'Frase de cierre', max: 36, ayuda: 'Arriba del botón de WhatsApp' },
}

export const PLANTILLAS_META = [
  {
    id: 'SaroColeccion',
    slug: 'coleccion',
    nombre: 'Colección',
    descripcion: 'Gancho con la paleta 3D, una escena por paleta, la línea completa y el cierre.',
    formatos: ['vertical', 'feed'],
    fps: 30,
    min: 1,
    max: 8,
    soloPaletas: true,
    musica: 'parallel-universe',
    textos: ['etiqueta', 'gancho', 'cierre'],
  },
  {
    id: 'SaroFicha',
    slug: 'ficha',
    nombre: 'Ficha',
    descripcion: 'Un producto solo, con specs, fotos extra y precio. Se pueden generar varias de una vez.',
    formatos: ['vertical', 'feed'],
    fps: 30,
    min: 1,
    max: 1,
    lote: 8, // "una ficha por producto": hasta 8 MP4 en un solo render
    soloPaletas: false,
    musica: 'parallel-universe',
    textos: ['etiqueta', 'cierre'],
  },
  {
    id: 'SaroRitmo',
    slug: 'ritmo',
    nombre: 'Catálogo express',
    descripcion: 'Un producto por golpe de la música, cortes rápidos. Para mostrar mucho en pocos segundos.',
    formatos: ['vertical', 'feed'],
    fps: 30,
    min: 3,
    max: 12,
    soloPaletas: false,
    musica: 'bounce-house',
    textos: ['etiqueta', 'gancho', 'cierre'],
  },
  {
    id: 'SaroComparativa',
    slug: 'comparativa',
    nombre: 'Comparativa',
    descripcion: '2 o 3 paletas lado a lado: forma, balance, nivel, peso y precio. "¿Cuál es la tuya?"',
    formatos: ['vertical', 'feed'],
    fps: 30,
    min: 2,
    max: 3,
    soloPaletas: true,
    musica: 'uplifting',
    textos: ['etiqueta', 'gancho', 'cierre'],
  },
  {
    id: 'SaroRevendedores',
    slug: 'revendedores',
    nombre: 'Revendedores',
    descripcion: 'Para tiendas y clubes: la marca, la línea (sin precios) y "Trabajá con nosotros".',
    formatos: ['vertical', 'feed'],
    fps: 30,
    min: 1,
    max: 6,
    soloPaletas: false,
    sinPrecios: true,
    musica: 'cinematic-synth',
    textos: ['gancho', 'cierre'],
  },
  {
    id: 'SaroWeb',
    slug: 'web',
    nombre: 'Presentación web',
    descripcion: 'Recorrido por saro.com.ar. Los productos elegidos arman el mensaje de WhatsApp de ejemplo.',
    formatos: ['horizontal'],
    fps: 30,
    min: 1,
    max: 2,
    soloPaletas: false,
    musica: 'mellow-chill',
    textos: [],
  },
]

export const plantillaMeta = id => PLANTILLAS_META.find(p => p.id === id) ?? null

/** Ancho y alto del video según el formato elegido (o el de fábrica). */
export function dimensiones(meta, formato) {
  const f = FORMATOS[meta.formatos.includes(formato) ? formato : meta.formatos[0]]
  return { ancho: f.ancho, alto: f.alto, formato: f.id }
}

// Música CC0 (dominio público, ver public/videos/LICENCIAS.md).
// - desde: segundo de la pista donde arranca el video, justo sobre un golpe.
// - bpm: pulso de los golpes FUERTES (scripts/videos/analizar-musica.py). En
//   pistas rápidas es la mitad del tempo "de baile": 71 en vez de 142. Con él
//   las escenas se cortan sobre el golpe (pulso.js). Sin bpm, duraciones fijas.
// - ganancia: iguala el volumen percibido entre pistas.
export const MUSICAS = [
  { id: 'parallel-universe', nombre: 'Parallel Universe', animo: 'Enérgica suave', archivo: 'parallel-universe.mp3', desde: 66.813, bpm: 72.67, ganancia: 1 },
  { id: 'uplifting', nombre: 'Uplifting', animo: 'Positiva, para arriba', archivo: 'uplifting.mp3', desde: 24.541, bpm: 78, ganancia: 1.34 },
  { id: 'cinematic-synth', nombre: 'Cinematic Synth', animo: 'Épica, de anuncio', archivo: 'cinematic-synth.mp3', desde: 39.089, bpm: 95, ganancia: 0.93 },
  { id: 'happy-hiphop', nombre: 'Happy Hip Hop', animo: 'Groove alegre', archivo: 'happy-hiphop.mp3', desde: 72.214, bpm: 105, ganancia: 1.37 },
  { id: 'lofi-groove', nombre: 'Lofi Groove', animo: 'Relajada con ritmo', archivo: 'lofi-groove.mp3', desde: 18.214, bpm: 105, ganancia: 0.5 },
  { id: 'bubblegum-pop', nombre: 'Bubblegum Pop', animo: 'Pop alegre', archivo: 'bubblegum-pop.mp3', desde: 15.065, bpm: 115, ganancia: 1.07 },
  { id: 'bounce-house', nombre: 'Bounce House', animo: 'Bailable, rápida', archivo: 'bounce-house.mp3', desde: 6.489, bpm: 71, ganancia: 2.6 },
  { id: 'fun-dance', nombre: 'Fun Dancetrack', animo: 'Electrónica intensa', archivo: 'fun-dance.mp3', desde: 0.362, bpm: 70, ganancia: 0.79 },
  { id: 'mellow-chill', nombre: 'Mellow Chill', animo: 'Tranquila', archivo: 'mellow-chill.mp3', desde: 39.438, bpm: 120, ganancia: 0.8 },
  { id: 'ninguna', nombre: 'Sin música', animo: '', archivo: null, desde: 0, bpm: null, ganancia: 1 },
]

export const musicaPorId = id => MUSICAS.find(m => m.id === id) ?? MUSICAS[0]

// Niveles de efectos de sonido. Cada efecto de una plantilla dice desde qué
// nivel suena (audio.jsx); "suave" es el criterio acordado de septiembre.
export const NIVELES_EFECTOS = [
  { id: 'ninguno', nombre: 'Sin efectos', detalle: 'Sólo la música' },
  { id: 'suave', nombre: 'Suaves', detalle: 'Whoosh en las transiciones y golpe en el logo' },
  { id: 'medio', nombre: 'Medios', detalle: 'Suma pops en los datos y campanita en el precio' },
  { id: 'intenso', nombre: 'Intensos', detalle: 'Suma golpes de pelota, tic-tac y subida antes del cierre' },
]
export const EFECTOS_DEFECTO = 'suave'

// Cómo salen las fotos de producto. "Sin fondo" necesita la foto recortada
// ("Preparar foto para video" en el admin); el que no la tiene va en tarjeta.
export const FONDOS_FOTO = [
  { id: 'sin', nombre: 'Sin fondo', detalle: 'El producto flota sobre el video (usa la foto recortada)' },
  { id: 'blanco', nombre: 'Con fondo blanco', detalle: 'La foto original, sobre una tarjeta blanca' },
]

// Identificador de cada pedido de render: "coleccion-20260928-1942-k3x9". Va en
// el nombre de la ejecución de GitHub y del MP4, por eso sólo letras y números.
export const REQUEST_ID_VALIDO = /^[a-z]+-\d{8}-\d{4}-[a-z0-9]{4}$/

const CONTROL = /[\u0000-\u001f\u007f]/

function problemaDeTextos(meta, textos) {
  if (textos == null) return null
  if (typeof textos !== 'object' || Array.isArray(textos)) return 'Los textos vinieron mal'
  for (const [campo, valor] of Object.entries(textos)) {
    const def = CAMPOS_TEXTO[campo]
    if (!def || !meta.textos.includes(campo)) return `Esta plantilla no usa el texto "${campo}"`
    if (typeof valor !== 'string') return `El texto "${def.nombre}" vino mal`
    if (valor.length > def.max) return `"${def.nombre}" tiene más de ${def.max} letras`
    if (CONTROL.test(valor)) return `"${def.nombre}" tiene caracteres raros`
  }
  return null
}

/** Problema de las props de UN video (no de un lote), o null. */
function problemaDeUnVideo(meta, props) {
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
    if (p.extras != null && (!Array.isArray(p.extras) || p.extras.length > 3 || p.extras.some(u => typeof u !== 'string' || !u.startsWith('https://')))) {
      return `Las fotos extra de "${p.nombre}" vinieron mal`
    }
    if (meta.soloPaletas && p.categoria !== 'paleta') return `"${p.nombre}" no es una paleta`
  }
  if (!MUSICAS.some(m => m.id === props.musica)) return 'Música desconocida'
  if (props.efectos != null && !NIVELES_EFECTOS.some(n => n.id === props.efectos)) return 'Nivel de efectos desconocido'
  if (props.formato != null && !meta.formatos.includes(props.formato)) return 'Esta plantilla no viene en ese formato'
  if (props.guia) return 'La guía de zonas es sólo para la vista previa'
  return problemaDeTextos(meta, props.textos)
}

/**
 * Revisa que las props de un pedido sean usables. Devuelve el motivo del
 * problema o null. La usan la API y el workflow, así los dos rechazan lo mismo.
 * Un lote ({ lote: [props, props…] }) es "un video por producto" en un render.
 */
export function problemaDelPedido(meta, props) {
  if (!meta) return 'Plantilla desconocida'
  if (props?.lote != null) {
    if (!meta.lote) return 'Esta plantilla no se genera por lote'
    if (!Array.isArray(props.lote) || props.lote.length < 2) return 'El lote necesita al menos 2 productos'
    if (props.lote.length > meta.lote) return `El lote admite hasta ${meta.lote} productos`
    for (const item of props.lote) {
      const problema = problemaDeUnVideo(meta, item)
      if (problema) return problema
    }
    return null
  }
  return problemaDeUnVideo(meta, props)
}

/** Las props de cada video de un pedido (uno solo, o los del lote). */
export const videosDelPedido = props => (Array.isArray(props?.lote) ? props.lote : [props])
