/**
 * Datos de producto para los videos (pestaña "🎬 Videos" del admin).
 *
 * Es la ÚNICA fuente: la usan la vista previa del admin y el render del MP4 (que
 * recibe las props ya armadas con esto). Las reglas de specs, nivel y enfoque
 * vienen de scripts/exportar_saro.py del proyecto remotion-videos.
 *
 * Regla de oro: nada inventado. Si la descripción no lo dice, no se muestra.
 */

export const SITE = 'https://saro.com.ar'

// Color de acento por modelo (elección visual que ya se aprobó en los videos)
const ACENTOS = {
  p1787353287653: '#EF4444', // Raptor
  p1787353465696: '#F97316', // Massive
  p1787353539609: '#E11D48', // Silver
  p1787353757330: '#3B82F6', // Vortice X
  p1787354132455: '#FACC15', // Kids
  p1787355012462: '#EC4899', // Flash
  p1787356327294: '#DC2626', // Nexus
}

// Para los productos nuevos, el acento sale de su primer color. Los colores
// oscuros o neutros (negro, gris, blanco) no se ven sobre el fondo del video:
// esos quedan en el azul de marca.
const ACENTO_POR_COLOR = [
  [/rojo/i, '#EF4444'],
  [/naranja/i, '#F97316'],
  [/fucsia|magenta/i, '#EC4899'],
  [/rosa/i, '#F472B6'],
  [/amarill/i, '#FACC15'],
  [/verde/i, '#22C55E'],
  [/violeta|lila/i, '#A855F7'],
  [/celeste/i, '#38BDF8'],
  [/azul|marino/i, '#3B82F6'],
]
const AZUL = '#2563EB'

const texto = p => `${p.nombre ?? ''} ${p.descripcion ?? ''}`.toLowerCase()
const descripcion = p => (p.descripcion ?? '').toLowerCase()

/**
 * Datos técnicos que SÍ dice la ficha, por campo (null = no lo dice). La
 * comparativa los usa así; las demás plantillas, como lista (specsVideo).
 */
export function fichaTecnica(p) {
  const t = texto(p)
  const carbono = t.match(/carbono\s*(\d+)\s*k/)
  const forma = ['redondo', 'diamante', 'lágrima', 'híbrido', 'hibrido'].find(f => t.includes(`formato ${f}`))
  return {
    carbono: carbono ? `Carbono ${carbono[1]}K` : null,
    forma: forma ? `Formato ${forma === 'hibrido' ? 'híbrido' : forma}` : null,
    nucleo: t.includes('goma eva') ? 'Núcleo EVA' : null,
    balance: t.includes('balance medio') ? 'Balance medio' : null,
    puntoDulce: /amplio punto dulce|punto dulce amplio/.test(t) ? 'Punto dulce amplio' : null,
    peso: Number(p.peso) > 0 ? `${Math.round(Number(p.peso))} g` : null,
  }
}

/** Especificaciones que SÍ dice la ficha. */
export function specsVideo(p) {
  return Object.values(fichaTecnica(p)).filter(Boolean)
}

/** Promo por cantidad cargada en el admin ("Llevando 12: $35.000"), o null. */
export function promoVideo(p) {
  const promo = (p.promos ?? []).find(x => Number(x?.cantidad) > 1 && Number(x?.precioTotal) > 0)
  if (!promo) return null
  return `Llevando ${Number(promo.cantidad)}: $${Number(promo.precioTotal).toLocaleString('es-AR')}`
}

export function nivelVideo(p) {
  const t = descripcion(p)
  if (t.includes('niños')) return t.includes('3 a 6') ? 'Niños 3 a 6 años' : 'Niños'
  if (/avanzado|competitivo|alto rendimiento/.test(t)) return 'Nivel avanzado'
  if (/versátil|equilibr/.test(t)) return 'Juego versátil'
  return null
}

export function enfoqueVideo(p) {
  const t = descripcion(p)
  const potencia = t.includes('potencia')
  const control = t.includes('control')
  if (potencia && control) return 'Potencia + control'
  if (potencia) return 'Potencia'
  if (control) return 'Control'
  return null
}

export function acentoVideo(p) {
  if (ACENTOS[p.id]) return ACENTOS[p.id]
  const color = p.colores?.[0] ?? ''
  return ACENTO_POR_COLOR.find(([re]) => re.test(color))?.[1] ?? AZUL
}

const absUrl = u => (u.startsWith('http') ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`)
export const fotoOriginal = p => p.imagenes?.[0] ?? p.imagen ?? null

/** Lo mismo que ve el público: visible y con precio minorista. */
export const precioPublico = p => Number(p.precioMinorista) || 0
export const esElegible = p => p.visible !== false && precioPublico(p) > 0 && !!fotoOriginal(p)

// Palabras de ropa: si aparecen en la descripción de una paleta o un accesorio,
// casi seguro se copió la descripción de otro producto.
const PALABRAS_ROPA = /\b(talles?|prendas?|tela|algodón|remera|calza|manga|cintura|lycra|dry fit)\b/i

/** Avisos para el admin. `bloquea` = no se puede usar en un video. */
export function avisosVideo(p) {
  const a = []
  if (!fotoOriginal(p)) a.push({ texto: 'No tiene foto', bloquea: true })
  if (!(precioPublico(p) > 0)) a.push({ texto: 'Falta el precio minorista', bloquea: true })
  if (p.visible === false) a.push({ texto: 'Está oculto en la web', bloquea: true })
  if (fotoOriginal(p) && !p.imagenVideo) {
    a.push({ texto: 'Sin foto recortada: se muestra sobre una tarjeta blanca', bloquea: false })
  } else if (p.imagenVideo && p.imagenVideoOrigen && p.imagenVideoOrigen !== fotoOriginal(p)) {
    a.push({ texto: 'Cambió la foto del producto: prepará de nuevo la del video', bloquea: false })
  }
  const d = (p.descripcion ?? '').trim()
  if (!d) a.push({ texto: 'Sin descripción: el video no muestra specs', bloquea: false })
  else if (p.categoria !== 'ropa' && PALABRAS_ROPA.test(d)) {
    a.push({ texto: 'La descripción parece de ropa: revisala', bloquea: false })
  }
  return a
}

/**
 * Lo que recibe la plantilla por cada producto.
 * `fondo`: 'sin' usa la foto recortada si existe (si no, va en tarjeta blanca);
 * 'blanco' usa siempre la foto original sobre una tarjeta blanca.
 */
export function productoVideo(p, fondo = 'sin') {
  const recortada = fondo !== 'blanco' && !!p.imagenVideo
  return {
    id: p.id,
    nombre: (p.nombre ?? '').trim(),
    categoria: p.categoria ?? '',
    precio: precioPublico(p),
    colores: p.colores ?? [],
    talle: p.talles?.[0] ?? 'Única',
    nuevo: (p.tags ?? []).includes('nuevo'),
    specs: specsVideo(p),
    ficha: fichaTecnica(p),
    promo: promoVideo(p),
    // Las otras fotos del producto (hasta 3), para la ficha
    extras: (p.imagenes ?? []).slice(1, 4).filter(Boolean).map(absUrl),
    nivel: nivelVideo(p),
    enfoque: enfoqueVideo(p),
    acento: acentoVideo(p),
    imagen: absUrl(recortada ? p.imagenVideo : fotoOriginal(p)),
    recortada,
  }
}

/** Catálogo público al que manda el cierre del video. */
export const rutaCatalogo = categoria => (categoria === 'paleta' ? '/paletas' : '/ropa-y-accesorios')
