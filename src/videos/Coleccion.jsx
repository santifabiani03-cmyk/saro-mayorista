import { Fragment } from 'react'
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import { Lienzo } from './comun'
import {
  Beneficios,
  Cierre,
  EscenaProducto,
  Gancho3D,
  Linea,
  enEscenas,
  golpesBeneficios,
  golpesCierre,
  golpesGancho,
  golpesLinea,
  golpesProducto,
} from './escenas'
import { Efectos, Musica, duracionTotal, golpesBase, inicios } from './audio'
import { alinearAlRitmo } from './pulso'
import { pesos, texto } from './textos'

// Reel de la colección de paletas: gancho (lo primero que se lee, desde el
// cuadro 0) → una escena por paleta → toda la línea → por qué SARO → cierre.
// Los cambios de escena caen sobre los golpes de la música (pulso.js).

const ID = 'SaroColeccion'
const T = 14
const FPS = 30
// Beneficios: con 100 cuadros, la revisión de Gemini marcó que no daba para leerlos
const DUR = { gancho: 80, producto: 115, linea: 110, beneficios: 130, cierre: 95 }

// La grilla "Toda la línea" sólo tiene sentido con dos o más paletas
const duraciones = ({ productos, musica }) =>
  alinearAlRitmo(
    [
      DUR.gancho,
      ...productos.map(() => DUR.producto),
      ...(productos.length > 1 ? [DUR.linea] : []),
      DUR.beneficios,
      DUR.cierre,
    ],
    T,
    musica,
    FPS,
  )

export const duracionColeccion = props => duracionTotal(duraciones(props), T)

const TRANSICIONES = [slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' })]
const suave = springTiming({ config: { damping: 200 }, durationInFrames: T })
const lineal = linearTiming({ durationInFrames: T })
const dosCifras = n => String(n).padStart(2, '0')

export const Coleccion = props => {
  const { productos, musica, efectos, guia } = props
  const dur = duraciones(props)
  const ini = inicios(dur, T)
  const hayLinea = productos.length > 1
  const golpes = [
    ...golpesBase(dur, T, 2).slice(1), // el golpe del logo ya está en el gancho
    ...enEscenas(ini, [
      golpesGancho(),
      ...productos.map(p => golpesProducto(p)),
      ...(hayLinea ? [golpesLinea(productos)] : []),
      golpesBeneficios(),
      golpesCierre(),
    ]),
  ]
  const minimo = Math.min(...productos.map(p => p.precio))

  return (
    <Lienzo guia={guia}>
      <Musica id={musica} />
      <Efectos golpes={golpes} elegido={efectos} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={dur[0]}>
          <Gancho3D etiqueta={texto(props, ID, 'etiqueta')} gancho={texto(props, ID, 'gancho')} />
        </TransitionSeries.Sequence>
        {productos.map((p, i) => (
          <Fragment key={p.id}>
            <TransitionSeries.Transition
              presentation={i === 0 ? fade() : TRANSICIONES[i % TRANSICIONES.length]}
              timing={suave}
            />
            <TransitionSeries.Sequence durationInFrames={dur[1 + i]}>
              <EscenaProducto producto={p} indice={`${dosCifras(i + 1)} / ${dosCifras(productos.length)}`} />
            </TransitionSeries.Sequence>
          </Fragment>
        ))}
        {hayLinea && (
          <>
            <TransitionSeries.Transition presentation={fade()} timing={lineal} />
            <TransitionSeries.Sequence durationInFrames={dur[1 + productos.length]}>
              <Linea productos={productos} titulo={`${productos.length} modelos`} subtitulo={`desde ${pesos(minimo)}`} />
            </TransitionSeries.Sequence>
          </>
        )}
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={lineal} />
        <TransitionSeries.Sequence durationInFrames={dur[dur.length - 2]}>
          <Beneficios />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={lineal} />
        <TransitionSeries.Sequence durationInFrames={dur[dur.length - 1]}>
          <Cierre frase={texto(props, ID, 'cierre')} ruta="/paletas" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Lienzo>
  )
}
