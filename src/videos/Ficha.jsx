import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { Lienzo } from './comun'
import { Cierre, EscenaProducto, Galeria, enEscenas, golpesCierre, golpesGaleria, golpesProducto } from './escenas'
import { Efectos, Musica, duracionTotal, golpesBase, inicios } from './audio'
import { alinearAlRitmo } from './pulso'
import { texto } from './textos'
import { rutaCatalogo } from '../utils/videoProductos'

// Un producto solo: ~7-10 s, pensado para historias y estados de WhatsApp.
// Si el producto tiene más fotos, suma una escena "En detalle".
// El admin puede pedir una Ficha por producto de una sola vez (lote).

const ID = 'SaroFicha'
const T = 14
const FPS = 30
const ADELANTO = 12 // el primer cuadro ya muestra el producto (es la portada del video)

const duraciones = ({ productos, musica }) =>
  alinearAlRitmo([130, ...(productos[0].extras?.length ? [90] : []), 90], T, musica, FPS)

export const duracionFicha = props => duracionTotal(duraciones(props), T)

export const Ficha = props => {
  const { productos, musica, efectos, guia } = props
  const p = productos[0]
  const dur = duraciones(props)
  const ini = inicios(dur, T)
  const conGaleria = dur.length === 3
  const golpes = [
    ...golpesBase(dur, T, -1),
    ...enEscenas(ini, [golpesProducto(p, ADELANTO), ...(conGaleria ? [golpesGaleria(p)] : []), golpesCierre()]),
  ]
  return (
    <Lienzo guia={guia}>
      <Musica id={musica} fadeIn={10} fadeOut={30} />
      <Efectos golpes={golpes} elegido={efectos} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={dur[0]}>
          <EscenaProducto producto={p} indice={texto(props, ID, 'etiqueta')} adelanto={ADELANTO} />
        </TransitionSeries.Sequence>
        {conGaleria && (
          <>
            <TransitionSeries.Transition presentation={slide({ direction: 'from-right' })} timing={linearTiming({ durationInFrames: T })} />
            <TransitionSeries.Sequence durationInFrames={dur[1]}>
              <Galeria producto={p} />
            </TransitionSeries.Sequence>
          </>
        )}
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[dur.length - 1]}>
          <Cierre frase={texto(props, ID, 'cierre')} ruta={rutaCatalogo(p.categoria)} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Lienzo>
  )
}
