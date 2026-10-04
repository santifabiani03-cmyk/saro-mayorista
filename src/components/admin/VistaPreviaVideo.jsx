'use client'
import { Player } from '@remotion/player'
import { dimensiones } from '../../videos/catalogo'
import { plantillaPorId } from '../../videos/plantillas'

/**
 * Vista previa en vivo de un video. Se carga aparte (next/dynamic desde
 * VideosPanel) para que Remotion y las plantillas sólo bajen al abrir la
 * pestaña 🎬 Videos: no suman nada al resto del sitio.
 */
export default function VistaPreviaVideo({ plantillaId, props }) {
  const p = plantillaPorId(plantillaId)
  const { ancho, alto } = dimensiones(p, props.formato)
  return (
    <Player
      // Al cambiar de formato cambia el tamaño: se rearma el reproductor
      key={`${plantillaId}-${ancho}x${alto}`}
      component={p.componente}
      inputProps={props}
      durationInFrames={p.duracion(props)}
      compositionWidth={ancho}
      compositionHeight={alto}
      fps={p.fps}
      controls
      loop
      clickToPlay
      // Con efectos "intensos" suenan varios a la vez (el valor de fábrica es 5)
      numberOfSharedAudioTags={14}
      acknowledgeRemotionLicense
      style={{ width: '100%', aspectRatio: `${ancho} / ${alto}`, borderRadius: 16, overflow: 'hidden' }}
    />
  )
}
