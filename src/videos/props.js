import { EFECTOS_DEFECTO } from './catalogo'
import { esElegible, productoVideo } from '../utils/videoProductos'

// El products.json que escribe el admin al publicar (rama "datos", ver
// src/utils/datos.js). Se lee de GitHub y no de saro.com.ar/api/catalog porque
// esa ruta no permite pedidos desde otro origen (el studio corre en localhost).
const CATALOGO_VIVO = 'https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/datos/products.json'

// Cómo se arman las props de cada plantilla. Lo usan el panel del admin (con los
// productos que elegís) y el studio de Remotion (con el catálogo en vivo).

/**
 * Props para el studio: los primeros productos elegibles del catálogo en vivo,
 * igual que la selección inicial del panel.
 */
export async function propsDeEjemplo(meta) {
  const catalogo = await fetch(CATALOGO_VIVO).then(r => r.json())
  return armarProps(meta, catalogo, seleccionInicial(meta, catalogo).map(p => p.id))
}

/** Los productos que se pueden elegir en una plantilla. */
export const disponibles = (meta, catalogo) =>
  catalogo.filter(p => esElegible(p) && (!meta.soloPaletas || p.categoria === 'paleta'))

/** Selección con la que arranca cada plantilla: paletas primero. */
export function seleccionInicial(meta, catalogo) {
  const lista = disponibles(meta, catalogo)
  const paletas = lista.filter(p => p.categoria === 'paleta')
  const cuantos = { SaroColeccion: 5, SaroRitmo: 8, SaroRevendedores: 4 }[meta.id] ?? meta.max
  // Catálogo express y Revendedores muestran de todo: no sólo paletas
  const base = meta.id === 'SaroRitmo' || meta.id === 'SaroRevendedores' ? lista : paletas.length ? paletas : lista
  return base.slice(0, Math.min(cuantos, meta.max))
}

/**
 * Props de una plantilla a partir de los ids elegidos (en ese orden).
 * `opciones`: { musica, efectos, formato, textos, fondo }; lo que falte va de fábrica.
 * `fondo` no viaja en las props: ya queda resuelto en cada producto (imagen/recortada).
 */
export function armarProps(meta, catalogo, ids, opciones = {}) {
  const porId = new Map(catalogo.map(p => [p.id, p]))
  const productos = ids
    .map(id => porId.get(id))
    .filter(Boolean)
    .map(p => productoVideo(p, opciones.fondo))
  const textos = Object.fromEntries(
    Object.entries(opciones.textos ?? {}).filter(([campo, v]) => meta.textos.includes(campo) && v?.trim()),
  )
  const props = {
    productos,
    musica: opciones.musica ?? meta.musica,
    efectos: opciones.efectos ?? EFECTOS_DEFECTO,
    formato: meta.formatos.includes(opciones.formato) ? opciones.formato : meta.formatos[0],
    textos,
  }
  if (meta.id === 'SaroWeb') props.totalPaletas = catalogo.filter(p => esElegible(p) && p.categoria === 'paleta').length
  return props
}

/** Un lote: las mismas opciones, un video por producto. */
export const armarLote = (meta, catalogo, ids, opciones) => ({
  lote: ids.map(id => armarProps(meta, catalogo, [id], opciones)),
})
