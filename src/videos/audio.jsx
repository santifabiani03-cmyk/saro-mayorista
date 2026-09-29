import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion'
import { musicaPorId } from './catalogo'

// Música: pistas CC0 (dominio público), ver public/videos/LICENCIAS.md.
// Efectos: sintetizados por nosotros, sin licencia de terceros.
// Criterio acordado: música tranquila y POCOS efectos (whoosh suave en las
// transiciones, golpe grave en el logo y el cierre, clic y "enviado" en la web).

/** Música de fondo con fade in/out. */
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
        interpolate(f, [0, fadeIn, durationInFrames - fadeOut, durationInFrames - 1], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  )
}

// Cada efecto dura menos de 3 s. Sin un largo, la Sequence queda montada hasta
// el final del video y la vista previa (Player) admite 5 audios a la vez.
const LARGO_SFX = 100

/** Efectos en cuadros absolutos del video: [{ f, sfx, vol }]. */
export const Efectos = ({ golpes }) => (
  <>
    {golpes
      .filter(g => g.f >= 0)
      .map((g, i) => (
        <Sequence key={i} from={g.f} durationInFrames={LARGO_SFX} layout="none" name={`sfx ${g.sfx}`}>
          <Audio src={staticFile(`videos/sfx/${g.sfx}.wav`)} volume={g.vol} />
        </Sequence>
      ))}
  </>
)

/** Inicio absoluto de cada escena de un TransitionSeries (cada transición solapa T cuadros). */
export const inicios = (duraciones, T) =>
  duraciones.reduce((acc, d, i) => (i === 0 ? [0] : [...acc, acc[i - 1] + duraciones[i - 1] - T]), [])

/** Duración total de escenas encadenadas con transiciones de T cuadros. */
export const duracionTotal = (duraciones, T) => duraciones.reduce((a, b) => a + b, 0) - (duraciones.length - 1) * T

/** Los efectos de siempre: golpe en el logo, whoosh en cada cambio de escena y golpe en el cierre. */
export const golpesBase = (duraciones, T, logo = 6) => {
  const ini = inicios(duraciones, T)
  return [
    { f: logo, sfx: 'impacto', vol: 0.3 },
    ...ini.slice(1).map(f => ({ f: f - 4, sfx: 'whoosh', vol: 0.22 })),
    { f: ini[ini.length - 1] + 2, sfx: 'impacto', vol: 0.4 },
  ]
}
