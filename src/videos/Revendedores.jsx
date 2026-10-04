import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Estudio, ImgProducto, Lienzo, Logo, SARO, useMarco } from './comun'
import { Beneficios, Cierre, Linea, enEscenas, golpesBeneficios, golpesCierre, golpesLinea, letraQueEntra } from './escenas'
import { Efectos, Musica, duracionTotal, golpesBase, inicios } from './audio'
import { alinearAlRitmo } from './pulso'
import { texto } from './textos'

// Para conseguir revendedores (tiendas de pádel, clubes): la marca, la línea
// SIN precios (los mayoristas se hablan por WhatsApp) y "Trabajá con nosotros".
// Todo lo que dice sale de CLAUDE.md §1: 15 años, fábrica propia, personalizados
// para clubes y eventos, venta por mayor con pedido por WhatsApp.

const ID = 'SaroRevendedores'
const T = 14
const FPS = 30

const BENEFICIOS_REVENDEDOR = [
  { titulo: 'Directo de fábrica', sub: '15 años haciendo pádel en Argentina', icono: 'fabrica' },
  { titulo: 'Venta por mayor', sub: 'Catálogo mayorista en saro.com.ar', icono: 'caja' },
  { titulo: 'Personalizados', sub: 'Diseños para clubes y eventos', icono: 'estrella' },
  { titulo: 'Envíos a todo el país', sub: 'Lo coordinamos por WhatsApp', icono: 'camion' },
]

const NOMBRES_CATEGORIA = { paleta: 'Paletas', padel: 'Accesorios', ropa: 'Ropa' }

// Los 4 beneficios necesitan tiempo para leerse (ver Coleccion.jsx)
const duraciones = ({ musica }) => alinearAlRitmo([85, 110, 150, 100], T, musica, FPS)

export const duracionRevendedores = props => duracionTotal(duraciones(props), T)

const Apertura = ({ gancho, productos }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { S, H, vertical } = useMarco()
  const golpe = spring({ frame, fps, config: { damping: 11, mass: 0.7 } })
  const sub = interpolate(frame, [14, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const muestra = productos.slice(0, 3)
  // Las fotos pueden bajar un poco a la franja que tapan las redes (son sólo imagen)
  const top = S.y + 420
  const alto = S.y + S.h - top + (vertical ? 180 : 0)
  const ancho = Math.floor((S.w - (muestra.length - 1) * 20) / Math.max(muestra.length, 2))
  return (
    <Estudio haloY={((top + alto / 2) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center' }}>
        <Logo ancho={220} style={{ display: 'block', margin: '0 auto' }} />
        <div
          style={{
            fontSize: letraQueEntra(gancho, S.w * 1.9, 110, 0.55),
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1.02,
            marginTop: 34,
            transform: `scale(${interpolate(golpe, [0, 1], [1.14, 1])})`,
            textWrap: 'balance',
          }}
        >
          {gancho}
        </div>
        <div style={{ fontSize: 44, fontWeight: 700, color: '#93C5FD', marginTop: 18, opacity: sub }}>Sumá SARO a tu negocio</div>
      </div>
      <div style={{ position: 'absolute', left: S.x, top, width: S.w, height: alto, display: 'flex', gap: 20, justifyContent: 'center', alignItems: 'center' }}>
        {muestra.map((p, i) => {
          const e = spring({ frame: frame - 8 - i * 6, fps, config: { damping: 14 } })
          return (
            <div key={p.id} style={{ opacity: Math.min(1, e * 1.4), transform: `translateY(${(1 - e) * 200}px) rotate(${(i - 1) * 4}deg)` }}>
              <ImgProducto producto={p} ancho={ancho} alto={Math.min(alto * 0.9, Math.round(ancho / 0.62))} />
            </div>
          )
        })}
      </div>
    </Estudio>
  )
}

export const Revendedores = props => {
  const { productos, musica, efectos, guia } = props
  const dur = duraciones(props)
  const ini = inicios(dur, T)
  const categorias = Object.keys(NOMBRES_CATEGORIA)
    .filter(c => productos.some(p => p.categoria === c))
    .map(c => NOMBRES_CATEGORIA[c])
  const golpes = [
    ...golpesBase(dur, T, 2),
    { f: 1, sfx: 'swoosh', vol: 0.14, nivel: 'medio' },
    ...enEscenas(ini, [[], golpesLinea(productos), golpesBeneficios(BENEFICIOS_REVENDEDOR.length), golpesCierre()]),
  ]
  return (
    <Lienzo guia={guia}>
      <Musica id={musica} />
      <Efectos golpes={golpes} elegido={efectos} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={dur[0]}>
          <Apertura gancho={texto(props, ID, 'gancho')} productos={productos} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[1]}>
          <Linea
            productos={productos}
            eyebrow="NUESTRA LÍNEA"
            titulo={categorias.join(' · ') || 'Productos SARO'}
            conPrecio={false}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[2]}>
          <Beneficios eyebrow="PARA TIENDAS Y CLUBES" titulo="Vendé una marca" resaltado="con respaldo." items={BENEFICIOS_REVENDEDOR} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[3]}>
          <Cierre frase={texto(props, ID, 'cierre')} ruta="" boton="Escribinos por WhatsApp" pie="Venta por mayor a todo el país" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Lienzo>
  )
}
