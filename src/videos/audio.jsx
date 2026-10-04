import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'
import { EFECTOS_DEFECTO, musicaPorId } from './catalogo'

// Música: pistas CC0 (dominio público), ver public/videos/LICENCIAS.md.
// Efectos: sintetizados por nosotros (scripts/videos/generar-sfx.py), sin
// licencia de terceros. Cada efecto dice desde qué nivel suena: "suave" es el
// criterio acordado en septiembre (whoosh en transiciones, golpe en logo y cierre).

/** Música de fondo con fade in/out, con el volumen igualado entre pistas. */
export const Musica = ({ id, volumen = 0.5, fadeIn = 25, fadeOut = 60 }) => {
  const { durationInFrames, fps } = useVideoConfig()
  const m = musicaPorId(id)
  if (!m.archivo) return null
  return (
    <Audio
      src={staticFile(`videos/musica/${m.archivo}`)}
      trimBefore={Math.round(m.desde * fps)}
      volume={f =>
        volumen *
        m.ganancia *
        interpolate(f, [0, fadeIn, durationInFrames - fadeOut, durationInFrames - 1], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  )
}

const RANGO = { ninguno: 0, suave: 1, medio: 2, intenso: 3 }
// En "intenso" cada efecto suena un poco más presente ("suave" queda como antes)
const VOLUMEN_NIVEL = { suave: 1, medio: 1, intenso: 1.12 }

// Largo de cada efecto en cuadros (un poco más que el archivo). Sin un largo, la
// Sequence queda montada hasta el final y la vista previa se queda sin audios.
const LARGO = { whoosh: 22, swoosh: 12, pop: 6, click: 4, tick: 3, ding: 44, impacto: 50, riser: 68, pelota: 7, palmas: 12 }

/**
 * Efectos en cuadros absolutos del video: [{ f, sfx, vol, nivel }]. `nivel` es
 * el mínimo en que suena (por defecto "suave"); `elegido` es el del pedido.
 */
export const Efectos = ({ golpes, elegido = EFECTOS_DEFECTO }) => {
  const tope = RANGO[elegido] ?? RANGO[EFECTOS_DEFECTO]
  const extra = VOLUMEN_NIVEL[elegido] ?? 1
  return (
    <>
      {golpes
        .filter(g => g.f >= 0 && RANGO[g.nivel ?? 'suave'] <= tope)
        .map((g, i) => (
          <Sequence key={i} from={Math.round(g.f)} durationInFrames={LARGO[g.sfx] ?? 30} layout="none" name={`sfx ${g.sfx}`}>
            <Audio src={staticFile(`videos/sfx/${g.sfx}.wav`)} volume={Math.min(0.9, g.vol * extra)} />
          </Sequence>
        ))}
    </>
  )
}

/** Inicio absoluto de cada escena de un TransitionSeries (cada transición solapa T cuadros). */
export const inicios = (duraciones, T) =>
  duraciones.reduce((acc, d, i) => (i === 0 ? [0] : [...acc, acc[i - 1] + duraciones[i - 1] - T]), [])

/** Duración total de escenas encadenadas con transiciones de T cuadros. */
export const duracionTotal = (duraciones, T) => duraciones.reduce((a, b) => a + b, 0) - (duraciones.length - 1) * T

/**
 * Los efectos de siempre: golpe en el logo, whoosh en cada cambio de escena y
 * golpe en el cierre. En "intenso" se suma la subida (riser) antes del cierre.
 */
export const golpesBase = (duraciones, T, logo = 6) => {
  const ini = inicios(duraciones, T)
  const cierre = ini[ini.length - 1]
  return [
    { f: logo, sfx: 'impacto', vol: 0.3 },
    ...ini.slice(1).map(f => ({ f: f - 4, sfx: 'whoosh', vol: 0.22 })),
    { f: cierre + 2, sfx: 'impacto', vol: 0.4 },
    { f: cierre - 60, sfx: 'riser', vol: 0.16, nivel: 'intenso' },
  ]
}
