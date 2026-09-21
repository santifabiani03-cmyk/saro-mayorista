/**
 * Feed de productos para publicidad (Meta Ads y Google Merchant Center).
 *
 * Lo usan dos lugares, por eso vive acá y no en la ruta:
 *  - /feed.xml, que leen Meta y Google para armar los anuncios solos.
 *  - La pestaña "📣 Publicidad" del admin, que muestra qué entra y qué no.
 *
 * Regla de oro: el feed publica EXACTAMENTE lo que ve el público. Precio, foto y
 * link tienen que coincidir con la ficha, o Meta/Google rechazan el producto.
 */
import { toSlug } from './slug'
import { getProductTags } from './colors'

export const SITE = 'https://saro.com.ar'

const imagenes = p => (p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : [])
const absUrl = u => (u.startsWith('http') ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`)

/**
 * Por qué un producto NO sale en los anuncios (null = sí sale).
 * El orden importa: se muestra el primer motivo, el más fácil de entender.
 */
export function motivoFueraDelFeed(p) {
  if (p.visible === false) return 'Está oculto en la web'
  if (p.publicitar === false) return 'Lo apagaste para publicidad'
  if (!(Number(p.precioMinorista) > 0)) return 'Falta el precio minorista'
  if (imagenes(p).length === 0) return 'No tiene foto'
  return null
}

/** Avisos que no lo sacan del feed pero conviene corregir. */
export function avisosFeed(p) {
  const a = []
  if (!p.descripcion?.trim()) a.push('Sin descripción (el anuncio queda pobre)')
  // Ej: "PACK X DOCENA $35.000" — un precio mayorista escrito a mano en el texto
  // contradice el precio del anuncio.
  else if (/\$\s?\d/.test(p.descripcion)) a.push('La descripción menciona un precio')
  if (p.sinStock) a.push('Sin stock: se publica pero Meta/Google no lo muestran')
  return a
}

// "REMERON DRY ELAS. DAMA" → "Remeron Dry Elas. Dama". Los anuncios en mayúsculas
// sostenidas los penalizan. Las palabras con números ("12K", "3/4") quedan igual.
function sinMayusculasSostenidas(s) {
  const letras = s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '')
  if (!letras || letras !== letras.toUpperCase()) return s
  return s
    .toLowerCase()
    .split(' ')
    .map(w => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

function tipoProducto(p) {
  if (p.categoria === 'paleta') return 'Paletas de pádel'
  if (p.categoria === 'ropa') return 'Ropa deportiva'
  return 'Accesorios de pádel'
}

function titulo(p) {
  const nombre = sinMayusculasSostenidas(p.nombre.trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, ''))
  // "Raptor Carbono 12k" sola no dice qué es. En Google la gente busca
  // "paleta de pádel carbono 12k", así que el título tiene que decirlo.
  if (p.categoria === 'paleta') {
    const conMarca = /saro/i.test(nombre) ? nombre : `SARO ${nombre}`
    return `Paleta de Pádel ${conMarca}`
  }
  return /saro/i.test(nombre) ? nombre : `${nombre} - SARO`
}

function descripcion(p) {
  const d = (p.descripcion ?? '').replace(/\s+/g, ' ').trim()
  const base = d || `${titulo(p)}. ${tipoProducto(p)} SARO.`
  return `${base} Envíos a todo el país. Pedido por WhatsApp.`.slice(0, 4900)
}

const GENERO = { masculino: 'male', femenino: 'female', unisex: 'unisex' }

function rangoPrecio(precio) {
  if (precio < 20000) return 'hasta-20k'
  if (precio < 100000) return '20k-100k'
  return 'mas-de-100k'
}

/** Arma el item del feed (sólo para productos que pasan motivoFueraDelFeed). */
export function itemFeed(p) {
  const imgs = imagenes(p).map(absUrl)
  const precio = Number(p.precioMinorista)
  const esKids = /kids|junior|niñ/i.test(p.nombre)
  const colores = (p.colores ?? []).filter(Boolean)
  const talles = (p.talles ?? []).filter(t => t && t !== 'Única')
  const etiquetas = getProductTags(p)

  return {
    id: p.id,
    title: titulo(p).slice(0, 150),
    description: descripcion(p),
    link: `${SITE}/producto/${toSlug(p.nombre, p.id)}`,
    image_link: imgs[0],
    additional_image_link: imgs.slice(1, 10),
    availability: p.sinStock ? 'out of stock' : 'in stock',
    price: `${precio.toFixed(2)} ARS`,
    brand: 'SARO',
    condition: 'new',
    identifier_exists: 'no',
    product_type: tipoProducto(p),
    // Ropa: Meta y Google piden género y edad para ropa.
    ...(p.categoria === 'ropa' && GENERO[p.genero] && { gender: GENERO[p.genero] }),
    age_group: esKids ? 'kids' : 'adult',
    ...(colores.length > 0 && { color: colores.slice(0, 3).join('/') }),
    ...(talles.length === 1 && { size: talles[0] }),
    // Etiquetas libres para separar campañas después (ej. una sólo de paletas,
    // o subir el presupuesto a los productos caros).
    custom_label_0: p.categoria || 'accesorio',
    custom_label_1: rangoPrecio(precio),
    custom_label_2: ['oferta', 'destacado', 'nuevo'].find(t => etiquetas.includes(t)) ?? 'catalogo',
  }
}

/** Separa el catálogo en lo que sale en los anuncios y lo que no (con motivo). */
export function armarFeed(productos) {
  const dentro = []
  const fuera = []
  for (const p of productos) {
    const motivo = motivoFueraDelFeed(p)
    if (motivo) fuera.push({ producto: p, motivo })
    else dentro.push({ producto: p, item: itemFeed(p), avisos: avisosFeed(p) })
  }
  return { dentro, fuera }
}
