import { Composition } from 'remotion'
import { EFECTOS_DEFECTO, dimensiones } from '../catalogo'
import { PLANTILLAS } from '../plantillas'
import { propsDeEjemplo } from '../props'

// Entrada del CLI de Remotion (studio y render). El admin no pasa por acá: usa
// el Player con las mismas plantillas.
//
// En el render las props llegan con --props. Sin ellas (el studio), se arman
// con el catálogo en vivo de saro.com.ar, así nunca hay datos fijos en el código.
// El tamaño sale del formato elegido (props.formato): vertical, feed u horizontal.
export const Raiz = () => (
  <>
    {PLANTILLAS.map(p => {
      const { ancho, alto } = dimensiones(p)
      return (
        <Composition
          key={p.id}
          id={p.id}
          component={p.componente}
          width={ancho}
          height={alto}
          fps={p.fps}
          durationInFrames={1}
          defaultProps={{ productos: [], musica: p.musica, efectos: EFECTOS_DEFECTO, formato: p.formatos[0], textos: {} }}
          calculateMetadata={async ({ props }) => {
            // Sin productos (studio, o --props con sólo opciones): los del catálogo
            // en vivo, respetando las opciones que sí vinieron (formato, música…)
            const { productos, ...opciones } = props
            const final = productos?.length ? props : { ...(await propsDeEjemplo(p)), ...opciones }
            const dim = dimensiones(p, final.formato)
            return { props: final, durationInFrames: p.duracion(final), width: dim.ancho, height: dim.alto }
          }}
        />
      )
    })}
  </>
)
