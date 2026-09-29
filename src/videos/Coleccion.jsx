import { Fragment } from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { wipe } from '@remotion/transitions/wipe'
import {
  BotonWhatsApp,
  Chip,
  Estudio,
  ImgProducto,
  Lienzo,
  Logo,
  PaletaFlotante,
  PrecioAnimado,
  SARO,
  clamp,
  pesos,
  sinSaro,
  useEntrada,
} from './comun'
import { Paleta3D } from './Paleta3D'
import { Efectos, Musica, duracionTotal, golpesBase } from './audio'

// ---------- Escenas (Ficha reusa EscenaProducto y Cierre) ----------

const Intro3D = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const giro = interpolate(frame, [0, 110], [-2.6, 0.35], clamp)
  const acerca = interpolate(frame, [0, 110], [15, 12], clamp)
  const logo = useEntrada(8)
  const eyebrow = useEntrada(22)
  const titulo = useEntrada(34)
  return (
    <Estudio haloY={45}>
      <AbsoluteFill style={{ top: 250 }}>
        <Paleta3D width={width} height={height - 700} giro={giro} distancia={acerca} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', top: 120, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Logo ancho={300} opacity={logo} />
      </div>
      <div style={{ position: 'absolute', bottom: 190, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 12, color: SARO.accent, opacity: eyebrow }}>
          COLECCIÓN {new Date().getFullYear()}
        </div>
        <div
          style={{
            fontSize: 132,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 1,
            marginTop: 16,
            opacity: titulo,
            transform: `translateY(${(1 - titulo) * 50}px)`,
          }}
        >
          Paletas SARO
        </div>
      </div>
    </Estudio>
  )
}

/** Un producto: foto flotando + nombre, specs y precio al público. */
export const EscenaProducto = ({ producto: p, indice }) => {
  const frame = useCurrentFrame()
  const color = p.acento
  const nombre = sinSaro(p.nombre)
  const fondoTexto = nombre.split(' ')[0].toUpperCase()
  const tit = useEntrada(14)
  const subtitulo = useEntrada(22)
  const precio = useEntrada(36)
  const extras = [p.enfoque, p.nivel].filter(Boolean)

  return (
    <Estudio color={color} haloY={36}>
      {/* Nombre gigante de fondo, en contorno, que se desliza */}
      <div
        style={{
          position: 'absolute',
          top: 330,
          left: 0,
          whiteSpace: 'nowrap',
          fontSize: 330,
          fontWeight: 900,
          letterSpacing: -8,
          color: 'transparent',
          WebkitTextStroke: `3px ${color}40`,
          transform: `translateX(${interpolate(frame, [0, 200], [120, -320])}px)`,
        }}
      >
        {fondoTexto} {fondoTexto}
      </div>

      <PaletaFlotante producto={p} alto={1080} ancho={900} y={170} delay={2} />

      {/* Cabecera */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 70,
          right: 70,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700, color: SARO.gris, letterSpacing: 4, opacity: tit }}>
          {indice ?? 'SARO · PADEL'}
        </div>
        {p.nuevo && (
          <div
            style={{
              padding: '10px 24px',
              borderRadius: 10,
              background: SARO.accent,
              color: SARO.dark,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 4,
              opacity: tit,
            }}
          >
            NUEVO
          </div>
        )}
      </div>

      {/* Panel de datos */}
      <div style={{ position: 'absolute', left: 70, right: 70, top: 1310 }}>
        <div
          style={{
            fontSize: nombre.length > 18 ? 74 : 96,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            opacity: tit,
            transform: `translateX(${(1 - tit) * -60}px)`,
          }}
        >
          {nombre}
        </div>
        {extras.length > 0 && (
          <div style={{ fontSize: 36, fontWeight: 600, color, marginTop: 16, opacity: subtitulo }}>
            {extras.join(' · ')}
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 34 }}>
          {p.specs.map((s, i) => (
            <Chip key={s} texto={s} delay={26 + i * 5} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 42, opacity: precio }}>
          <PrecioAnimado valor={p.precio} delay={38} tamano={112} />
          <span style={{ fontSize: 30, color: SARO.gris, fontWeight: 500 }}>precio al público</span>
        </div>
      </div>
    </Estudio>
  )
}

// Hasta 4 van en una fila; más, en dos filas parejas (5 → 3 + 2, 8 → 4 + 4)
const filasDe = productos => {
  if (productos.length <= 4) return [productos]
  const mitad = Math.ceil(productos.length / 2)
  return [productos.slice(0, mitad), productos.slice(mitad)]
}

const Linea = ({ productos }) => {
  const frame = useCurrentFrame()
  const minimo = Math.min(...productos.map(p => p.precio))
  const tit = useEntrada(0)
  const filas = filasDe(productos)
  const porFila = Math.max(...filas.map(f => f.length))
  const ancho = porFila <= 3 ? 300 : 245
  const altoImg = Math.round(ancho * 1.84)
  return (
    <Estudio haloY={50}>
      <div style={{ position: 'absolute', top: 110, width: '100%', textAlign: 'center', opacity: tit }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 10, color: SARO.accent }}>TODA LA LÍNEA</div>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, marginTop: 10 }}>{productos.length} modelos</div>
        <div style={{ fontSize: 40, color: SARO.gris, marginTop: 8 }}>
          desde <b style={{ color: SARO.texto }}>{pesos(minimo)}</b>
        </div>
      </div>
      {filas.map((fila, f) => (
        <div
          key={f}
          style={{
            position: 'absolute',
            top: filas.length === 1 ? 620 : 470 + f * 700,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {fila.map((p, i) => {
            const n = f * filas[0].length + i
            const e = interpolate(frame, [8 + n * 5, 26 + n * 5], [0, 1], clamp)
            return (
              <div
                key={p.id}
                style={{ width: ancho, textAlign: 'center', opacity: e, transform: `translateY(${(1 - e) * 80}px)` }}
              >
                <div style={{ height: altoImg + 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  {/* Sin recortar, la tarjeta toma la proporción 3:4 de las fotos de paletas */}
                  <ImgProducto producto={p} ancho={ancho} alto={p.recortada ? altoImg : Math.round((ancho * 4) / 3)} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 18, lineHeight: 1.15 }}>{sinSaro(p.nombre)}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: p.acento, marginTop: 6 }}>{pesos(p.precio)}</div>
              </div>
            )
          })}
        </div>
      ))}
    </Estudio>
  )
}

const BENEFICIOS = [
  { titulo: 'Directo de fábrica', sub: '15 años haciendo pádel en Argentina', icono: 'fabrica' },
  { titulo: 'Envíos a todo el país', sub: 'Cotizá el envío en la web', icono: 'camion' },
  { titulo: 'Pedido simple', sub: 'Armás el carrito y lo cerrás por WhatsApp', icono: 'chat' },
]

const Icono = ({ tipo }) => (
  <svg
    width={64}
    height={64}
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {tipo === 'fabrica' && <path d="M3 21V10l5 3V10l5 3V6l8 4v11H3Zm4-4h2m4 0h2" />}
    {tipo === 'camion' && (
      <>
        <path d="M2 7h11v9H2zM13 10h4l4 4v2h-8" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    )}
    {tipo === 'chat' && <path d="M4 5h16v11H9l-5 4V5Zm4 5h8M8 13h5" />}
  </svg>
)

const Beneficio = ({ titulo, sub, icono, delay }) => {
  const e = useEntrada(delay)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40, opacity: e, transform: `translateX(${(1 - e) * 80}px)` }}>
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: 36,
          background: `linear-gradient(135deg, ${SARO.blue}, ${SARO.mid})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 50px rgba(37,99,235,.35)',
          flexShrink: 0,
        }}
      >
        <Icono tipo={icono} />
      </div>
      <div>
        <div style={{ fontSize: 54, fontWeight: 800 }}>{titulo}</div>
        <div style={{ fontSize: 34, color: SARO.gris, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

const Beneficios = () => {
  const tit = useEntrada(0)
  return (
    <Estudio haloY={30}>
      <div style={{ position: 'absolute', top: 260, left: 90, right: 90 }}>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 10, color: SARO.accent, opacity: tit }}>
          POR QUÉ SARO
        </div>
        <div style={{ fontSize: 104, fontWeight: 900, letterSpacing: -3, lineHeight: 1.02, marginTop: 14, opacity: tit }}>
          Calidad de fábrica,
          <br />
          <span style={{ color: '#93C5FD' }}>sin vueltas.</span>
        </div>
        <div style={{ marginTop: 110, display: 'flex', flexDirection: 'column', gap: 56 }}>
          {BENEFICIOS.map((b, i) => (
            <Beneficio key={b.titulo} {...b} delay={14 + i * 12} />
          ))}
        </div>
      </div>
    </Estudio>
  )
}

export const Cierre = ({ ruta = '/paletas' }) => {
  const frame = useCurrentFrame()
  const a = useEntrada(0)
  const b = useEntrada(16, 10)
  const envios = useEntrada(30)
  const pulso = 1 + Math.sin(frame / 5) * 0.025 * interpolate(frame, [30, 40], [0, 1], clamp)
  return (
    <Estudio haloY={40}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <Logo ancho={560} opacity={a} />
        <div
          style={{
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.08,
            marginTop: 80,
            opacity: a,
            transform: `translateY(${(1 - a) * 40}px)`,
          }}
        >
          Elegí la tuya en
          <br />
          <span style={{ color: '#93C5FD' }}>saro.com.ar</span>
          <span style={{ color: SARO.gris }}>{ruta}</span>
        </div>
        <div style={{ marginTop: 90 }}>
          <BotonWhatsApp escala={b * pulso} />
        </div>
        <div style={{ marginTop: 60, fontSize: 32, color: SARO.gris, opacity: envios }}>Envíos a todo el país</div>
      </AbsoluteFill>
    </Estudio>
  )
}

// ---------- Composición ----------

const T = 14
const DUR = { intro: 110, producto: 105, linea: 120, beneficios: 105, cierre: 100 }

// La grilla "Toda la línea" sólo tiene sentido con dos o más paletas
const duraciones = ({ productos }) => [
  DUR.intro,
  ...productos.map(() => DUR.producto),
  ...(productos.length > 1 ? [DUR.linea] : []),
  DUR.beneficios,
  DUR.cierre,
]

export const duracionColeccion = props => duracionTotal(duraciones(props), T)

const TRANSICIONES = [slide({ direction: 'from-right' }), wipe({ direction: 'from-left' }), slide({ direction: 'from-bottom' })]
const suave = springTiming({ config: { damping: 200 }, durationInFrames: T })
const lineal = linearTiming({ durationInFrames: T })
const dosCifras = n => String(n).padStart(2, '0')

export const Coleccion = ({ productos, musica }) => (
  <Lienzo>
    <Musica id={musica} />
    <Efectos golpes={golpesBase(duraciones({ productos }), T)} />
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={DUR.intro}>
        <Intro3D />
      </TransitionSeries.Sequence>
      {productos.map((p, i) => (
        <Fragment key={p.id}>
          <TransitionSeries.Transition
            presentation={i === 0 ? fade() : TRANSICIONES[i % TRANSICIONES.length]}
            timing={suave}
          />
          <TransitionSeries.Sequence durationInFrames={DUR.producto}>
            <EscenaProducto producto={p} indice={`${dosCifras(i + 1)} / ${dosCifras(productos.length)}`} />
          </TransitionSeries.Sequence>
        </Fragment>
      ))}
      {productos.length > 1 && (
        <>
          <TransitionSeries.Transition presentation={fade()} timing={lineal} />
          <TransitionSeries.Sequence durationInFrames={DUR.linea}>
            <Linea productos={productos} />
          </TransitionSeries.Sequence>
        </>
      )}
      <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={lineal} />
      <TransitionSeries.Sequence durationInFrames={DUR.beneficios}>
        <Beneficios />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={lineal} />
      <TransitionSeries.Sequence durationInFrames={DUR.cierre}>
        <Cierre ruta="/paletas" />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </Lienzo>
)
