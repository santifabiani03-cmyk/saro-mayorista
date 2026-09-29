/**
 * "Preparar foto para video" (pestaña 🎬 Videos del admin). Corre en el
 * navegador: saca el fondo con la misma IA que usa el formulario de productos
 * (@imgly/background-removal, gratis), recorta al contorno del producto y lo
 * devuelve con fondo transparente, listo para flotar sobre el fondo del video.
 */

const MARGEN = 0.03 // aire alrededor del producto, relativo a su lado mayor
const LADO_MAX = 1600 // en el video la paleta ocupa ~1080 px de alto

/** Caja del contenido visible (alfa > 20) de una imagen con transparencia. */
function contorno(data, w, h) {
  let arriba = h, abajo = -1, izq = w, der = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (y < arriba) arriba = y
        if (y > abajo) abajo = y
        if (x < izq) izq = x
        if (x > der) der = x
      }
    }
  }
  return abajo < 0 ? null : { x: izq, y: arriba, w: der - izq + 1, h: abajo - arriba + 1 }
}

const aBase64 = blob =>
  new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onload = () => resolve(String(lector.result).split(',')[1])
    lector.onerror = () => reject(new Error('No se pudo leer la imagen recortada'))
    lector.readAsDataURL(blob)
  })

/** Devuelve { base64, ext } de la foto recortada. `avisar(texto)` informa el avance. */
export async function recortarParaVideo(url, avisar) {
  avisar?.('Bajando la foto…')
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`No se pudo bajar la foto (error ${resp.status})`)
  const original = await resp.blob()

  avisar?.('Cargando la IA… (la primera vez baja ~30 MB)')
  const { removeBackground } = await import('@imgly/background-removal')
  const sinFondo = await removeBackground(original, {
    progress: (clave, actual, total) => {
      if (clave === 'compute:inference') avisar?.(`Sacando el fondo… ${total > 0 ? Math.round((actual / total) * 100) : 0}%`)
    },
  })

  avisar?.('Recortando…')
  const bmp = await createImageBitmap(sinFondo)
  const lectura = document.createElement('canvas')
  lectura.width = bmp.width
  lectura.height = bmp.height
  const lctx = lectura.getContext('2d', { willReadFrequently: true })
  lctx.drawImage(bmp, 0, 0)
  bmp.close?.()
  const caja = contorno(lctx.getImageData(0, 0, lectura.width, lectura.height).data, lectura.width, lectura.height)
  if (!caja) throw new Error('La IA no encontró el producto en la foto')

  const margen = Math.round(Math.max(caja.w, caja.h) * MARGEN)
  const escala = Math.min(1, LADO_MAX / (Math.max(caja.w, caja.h) + 2 * margen))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((caja.w + 2 * margen) * escala)
  canvas.height = Math.round((caja.h + 2 * margen) * escala)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(lectura, caja.x, caja.y, caja.w, caja.h, margen * escala, margen * escala, caja.w * escala, caja.h * escala)

  // WebP guarda la transparencia y pesa poco; si el navegador no lo sabe
  // generar (devuelve PNG), se sube PNG.
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9))
  if (!blob) throw new Error('El navegador no pudo generar la imagen')
  return { base64: await aBase64(blob), ext: blob.type === 'image/webp' ? 'webp' : 'png' }
}
