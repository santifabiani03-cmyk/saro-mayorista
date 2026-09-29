'use client'
import { Player } from '@remotion/player'
import { plantillaPorId } from '../../videos/plantillas'

/**
 * Vista previa en vivo de un video. Se carga aparte (next/dynamic desde
 * VideosPanel) para que Remotion y las plantillas sólo bajen al abrir la
 * pestaña 🎬 Videos: no suman nada al resto del sitio.
 */
export default function VistaPreviaVideo({ plantillaId, props }) {
  const p = plantillaPorId(plantillaId)
  return (
    <Player
      component={p.componente}
      inputProps={props}
      durationInFrames={p.duracion(props)}
      compositionWidth={p.ancho}
      compositionHeight={p.alto}
      fps={p.fps}
      controls
      loop
      clickToPlay
      acknowledgeRemotionLicense
      style={{ width: '100%', aspectRatio: `${p.ancho} / ${p.alto}`, borderRadius: 16, overflow: 'hidden' }}
    />
  )
}
