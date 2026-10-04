// Textos de los videos que no dependen de React: los usan las plantillas y el
// panel del admin (para mostrar el texto de fábrica de cada campo editable).
// Regla de oro: nada inventado. Los textos de fábrica sólo usan datos reales
// de los productos elegidos o frases genéricas.

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
export const pesos = n => `$${fmt.format(n)}`

export const sinSaro = nombre => nombre.replace(/^Saro\s+/i, '')

const minimo = productos => Math.min(...productos.map(p => p.precio))

/** Textos de fábrica de cada plantilla para esos productos. */
export function textosDeFabrica(plantillaId, productos = []) {
  const n = productos.length
  const uno = productos[0]
  switch (plantillaId) {
    case 'SaroColeccion':
      return {
        etiqueta: `COLECCIÓN ${new Date().getFullYear()}`,
        gancho: n > 1 ? `${n} paletas desde ${pesos(minimo(productos))}` : uno ? `${sinSaro(uno.nombre)} · ${pesos(uno.precio)}` : '',
        cierre: 'Elegí la tuya en',
      }
    case 'SaroFicha':
      return {
        etiqueta: 'SARO · PÁDEL',
        cierre: uno?.categoria === 'paleta' ? 'Elegí la tuya en' : 'Encontralo en',
      }
    case 'SaroRitmo':
      return {
        etiqueta: 'SARO · TIENDA OFICIAL',
        gancho: n ? `${n} productos desde ${pesos(minimo(productos))}` : '',
        cierre: 'Todo esto en',
      }
    case 'SaroComparativa':
      return { etiqueta: 'COMPARATIVA', gancho: '¿Cuál es la tuya?', cierre: 'Elegí la tuya en' }
    case 'SaroRevendedores':
      return { gancho: '¿Tenés una tienda o un club?', cierre: 'Trabajá con nosotros' }
    default:
      return {}
  }
}

/** El texto final de un campo: el que escribió el admin o el de fábrica. */
export function texto(props, plantillaId, campo) {
  const propio = props.textos?.[campo]?.trim()
  return propio || textosDeFabrica(plantillaId, props.productos)[campo] || ''
}
