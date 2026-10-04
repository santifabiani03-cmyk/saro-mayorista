import { musicaPorId } from './catalogo'

// Cortes al ritmo de la música. La pista arranca justo sobre un golpe fuerte
// (`desde` en catalogo.js), así que en el video hay un golpe cada
// `cuadrosPorGolpe` cuadros, empezando en el cuadro 0.

/** Cuadros entre golpe y golpe, o null si la música no tiene pulso medido. */
export function cuadrosPorGolpe(musicaId, fps) {
  const m = musicaPorId(musicaId)
  return m.bpm ? (60 * fps) / m.bpm : null
}

/**
 * Ajusta las duraciones de escenas encadenadas con transiciones de T cuadros
 * para que cada cambio de escena (la mitad de la transición) caiga sobre un
 * golpe. Cada escena se estira o se acorta a lo sumo medio golpe, y nunca queda
 * más corta que `minimo` cuadros. Sin pulso, devuelve las duraciones tal cual.
 */
export function alinearAlRitmo(duraciones, T, musicaId, fps, minimo = 30) {
  const golpe = cuadrosPorGolpe(musicaId, fps)
  if (!golpe) return duraciones
  const out = []
  let inicio = 0 // cuadro donde arranca la escena actual
  duraciones.forEach((d, i) => {
    // El cambio de escena se "ve" en la mitad de la transición; la última
    // escena termina justo sobre un golpe
    const mitad = i === duraciones.length - 1 ? 0 : T / 2
    const finEn = n => Math.round(n * golpe + mitad)
    let n = Math.round((inicio + d - mitad) / golpe)
    while (finEn(n) - inicio < minimo) n++
    const fin = finEn(n)
    out.push(fin - inicio)
    inicio = fin - T
  })
  return out
}

/** Cuántos golpes necesita algo que tiene que durar al menos `minimo` cuadros. */
export function golpesPara(minimo, musicaId, fps) {
  const golpe = cuadrosPorGolpe(musicaId, fps)
  if (!golpe) return null
  return Math.max(1, Math.ceil(minimo / golpe))
}
