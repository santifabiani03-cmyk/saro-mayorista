import { Composition } from 'remotion'
import { PLANTILLAS } from '../plantillas'
import { propsDeEjemplo } from '../props'

// Entrada del CLI de Remotion (studio y render). El admin no pasa por acá: usa
// el Player con las mismas plantillas.
//
// En el render las props llegan con --props. Sin ellas (el studio), se arman
// con el catálogo en vivo de saro.com.ar, así nunca hay datos fijos en el código.
export const Raiz = () => (
  <>
    {PLANTILLAS.map(p => (
      <Composition
        key={p.id}
        id={p.id}
        component={p.componente}
        width={p.ancho}
        height={p.alto}
        fps={p.fps}
        durationInFrames={1}
        defaultProps={{ productos: [], musica: p.musica }}
        calculateMetadata={async ({ props }) => {
          const final = props.productos?.length ? props : await propsDeEjemplo(p)
          return { props: final, durationInFrames: p.duracion(final) }
        }}
      />
    ))}
  </>
)
