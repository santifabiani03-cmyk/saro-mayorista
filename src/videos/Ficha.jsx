import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { Lienzo } from './comun'
import { Cierre, EscenaProducto } from './Coleccion'
import { Efectos, Musica, duracionTotal, golpesBase } from './audio'
import { rutaCatalogo } from '../utils/videoProductos'

// Un producto solo: ~7 s, pensado para historias y estados de WhatsApp.
const T = 14
const DURACIONES = [130, 90]

export const duracionFicha = () => duracionTotal(DURACIONES, T)

export const Ficha = ({ productos, musica }) => {
  const p = productos[0]
  return (
    <Lienzo>
      <Musica id={musica} fadeIn={10} fadeOut={30} />
      <Efectos golpes={golpesBase(DURACIONES, T, -1)} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DURACIONES[0]}>
          <EscenaProducto producto={p} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={DURACIONES[1]}>
          <Cierre ruta={rutaCatalogo(p.categoria)} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Lienzo>
  )
}
