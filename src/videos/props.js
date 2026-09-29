import { esElegible, productoVideo } from '../utils/videoProductos'

// El products.json que escribe el admin al publicar. Se lee de GitHub y no de
// saro.com.ar/api/catalog porque esa ruta no permite pedidos desde otro origen
// (el studio corre en localhost).
const CATALOGO_VIVO = 'https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/master/catalog/products.json'

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
  const cuantos = meta.id === 'SaroColeccion' ? Math.min(5, meta.max) : meta.max
  return (paletas.length ? paletas : lista).slice(0, cuantos)
}

/** Props de una plantilla a partir de los ids elegidos (en ese orden). */
export function armarProps(meta, catalogo, ids, musica = meta.musica) {
  const porId = new Map(catalogo.map(p => [p.id, p]))
  const productos = ids.map(id => porId.get(id)).filter(Boolean).map(productoVideo)
  const props = { productos, musica }
  if (meta.id === 'SaroWeb') props.totalPaletas = catalogo.filter(p => esElegible(p) && p.categoria === 'paleta').length
  return props
}
