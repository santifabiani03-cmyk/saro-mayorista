/**
 * Encuadre estándar de las fotos de paletas.
 *
 * Todas las fotos de paletas terminan igual: lienzo vertical 3:4 con fondo
 * blanco y la paleta centrada, con el mismo aire a los costados y arriba. Así
 * la card del catálogo (vertical, con la foto "a sangre") y la ficha no cortan
 * la punta ni los costados, sea cual sea la foto original.
 *
 * Este archivo sólo mide y calcula (trabaja sobre los píxeles crudos RGBA), así
 * lo usan igual el admin, en el navegador con canvas, y el script que encuadró
 * las fotos que ya estaban cargadas (`scripts/encuadrar-paletas.mjs`, con sharp).
 */
export const ENCUADRE = {
  ancho: 1200,
  alto: 1600,
  // La paleta ocupa como mucho este porcentaje del lienzo. Lo que sobra es aire.
  maxAlto: 0.76,
  maxAncho: 0.6,
  // Diferencia con el color del fondo a partir de la cual un píxel es "paleta".
  // Entre (umbral - rampa) y umbral el píxel se funde con el blanco nuevo, así
  // el borde no queda serruchado.
  umbral: 30,
  rampa: 16,
}

// Color promedio de un cuadradito de 6×6 en una esquina.
function colorEsquina(rgba, w, x0, y0) {
  let r = 0, g = 0, b = 0, a = 0, n = 0
  for (let y = y0; y < y0 + 6; y++) {
    for (let x = x0; x < x0 + 6; x++) {
      const i = (y * w + x) * 4
      r += rgba[i]; g += rgba[i + 1]; b += rgba[i + 2]; a += rgba[i + 3]; n++
    }
  }
  return [r / n, g / n, b / n, a / n]
}

/**
 * Mide dónde está la paleta dentro de la foto.
 * Devuelve { caja: {x, y, w, h}, alfa } o null si la foto no se puede encuadrar
 * sola: fondo que no es liso o paleta que se sale por arriba o por los costados
 * (primeros planos). Que toque abajo se acepta: es el mango cortado.
 * `alfa` es la máscara (0-255) que separa la paleta del fondo.
 */
export function medirPaleta(rgba, w, h) {
  if (w < 50 || h < 50) return null
  const esquinas = [
    colorEsquina(rgba, w, 0, 0), colorEsquina(rgba, w, w - 6, 0),
    colorEsquina(rgba, w, 0, h - 6), colorEsquina(rgba, w, w - 6, h - 6),
  ]
  const transparente = esquinas.every(c => c[3] < 20)
  // Fondo liso o degradé suave: las esquinas tienen que ser claras y parecidas.
  if (!transparente) {
    const claras = esquinas.every(c => c[0] > 200 && c[1] > 200 && c[2] > 200)
    if (!claras) return null
  }

  const { umbral, rampa } = ENCUADRE
  const alfa = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      let a
      if (transparente) {
        a = rgba[i + 3]
      } else {
        // Distancia al color de fondo más parecido (sirve para degradés).
        let d = 255
        for (const c of esquinas) {
          const dc = Math.max(Math.abs(rgba[i] - c[0]), Math.abs(rgba[i + 1] - c[1]), Math.abs(rgba[i + 2] - c[2]))
          if (dc < d) d = dc
        }
        a = Math.round(Math.min(1, Math.max(0, (d - (umbral - rampa)) / rampa)) * 255)
      }
      alfa[y * w + x] = a
    }
  }

  const caja = cajaMasGrande(alfa, w, h)
  if (!caja) return null
  // Casi toda la foto es "paleta": el fondo no es liso, mejor no tocarla.
  if (caja.w * caja.h > w * h * 0.9) return null
  // Se sale por arriba o por los costados de la foto.
  const tolX = w * 0.005, tolY = h * 0.005
  if (caja.x <= tolX || caja.x + caja.w >= w - tolX || caja.y <= tolY) return null
  // Sólo fotos de frente: una paleta parada mide de ancho entre 0,5 y 0,6 de
  // su alto. Los primeros planos inclinados (0,7 o más) suelen venir cortados
  // por un marco dentro de la foto, y encuadrados quedarían flotando cortados.
  const proporcion = caja.w / caja.h
  if (proporcion < 0.4 || proporcion > 0.68) return null

  // Todo lo que queda fuera de la caja (logo grabado, manchas) va al blanco.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < caja.x || x >= caja.x + caja.w || y < caja.y || y >= caja.y + caja.h) alfa[y * w + x] = 0
    }
  }
  return { caja, alfa }
}

/**
 * Caja de la mancha más grande de la máscara (la paleta). Se trabaja en una
 * grilla de celdas para que sea rápido; así un logo grabado o una mancha suelta
 * del fondo no agrandan la caja.
 */
function cajaMasGrande(alfa, w, h) {
  const lado = Math.max(2, Math.round(Math.max(w, h) / 240))
  const gw = Math.ceil(w / lado), gh = Math.ceil(h / lado)
  const llena = new Uint8Array(gw * gh)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alfa[y * w + x] > 128) llena[((y / lado) | 0) * gw + ((x / lado) | 0)] = 1
    }
  }
  const grupo = new Int32Array(gw * gh).fill(-1)
  let mejor = -1, mejorTam = 0
  const pila = []
  for (let i = 0; i < llena.length; i++) {
    if (!llena[i] || grupo[i] !== -1) continue
    let tam = 0
    grupo[i] = i; pila.push(i)
    while (pila.length) {
      const c = pila.pop(); tam++
      const cx = c % gw, cy = (c / gw) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const n = ny * gw + nx
        if (llena[n] && grupo[n] === -1) { grupo[n] = i; pila.push(n) }
      }
    }
    if (tam > mejorTam) { mejorTam = tam; mejor = i }
  }
  if (mejor < 0 || mejorTam < 20) return null

  // Caja exacta, en píxeles, de lo que cae dentro de las celdas de esa mancha.
  let izq = w, der = -1, arriba = h, abajo = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alfa[y * w + x] <= 128) continue
      if (grupo[((y / lado) | 0) * gw + ((x / lado) | 0)] !== mejor) continue
      if (x < izq) izq = x
      if (x > der) der = x
      if (y < arriba) arriba = y
      if (y > abajo) abajo = y
    }
  }
  return { x: izq, y: arriba, w: der - izq + 1, h: abajo - arriba + 1 }
}

/** Dónde y de qué tamaño va la paleta dentro del lienzo estándar. */
export function planEncuadre(caja) {
  const { ancho, alto, maxAlto, maxAncho } = ENCUADRE
  const escala = Math.min((alto * maxAlto) / caja.h, (ancho * maxAncho) / caja.w)
  const w = Math.round(caja.w * escala)
  const h = Math.round(caja.h * escala)
  return { x: Math.round((ancho - w) / 2), y: Math.round((alto - h) / 2), w, h }
}

/**
 * Recorta la caja de la paleta y le pone la máscara como transparencia.
 * Devuelve los píxeles RGBA del recorte (caja.w × caja.h).
 */
export function recortarConMascara(rgba, w, { caja, alfa }) {
  const out = new Uint8ClampedArray(caja.w * caja.h * 4)
  for (let y = 0; y < caja.h; y++) {
    for (let x = 0; x < caja.w; x++) {
      const src = ((caja.y + y) * w + (caja.x + x))
      const dst = (y * caja.w + x) * 4
      out[dst] = rgba[src * 4]
      out[dst + 1] = rgba[src * 4 + 1]
      out[dst + 2] = rgba[src * 4 + 2]
      out[dst + 3] = alfa[src]
    }
  }
  return out
}
