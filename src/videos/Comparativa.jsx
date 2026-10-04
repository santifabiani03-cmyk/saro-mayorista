import { TransitionSeries, linearTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Estudio, ImgProducto, Lienzo, Logo, SARO, clamp, pesos, sinSaro, useMarco } from './comun'
import { Cierre, enEscenas, golpesCierre, letraQueEntra } from './escenas'
import { Efectos, Musica, duracionTotal, golpesBase, inicios } from './audio'
import { alinearAlRitmo } from './pulso'
import { texto } from './textos'

// "¿Cuál es la tuya?": 2 o 3 paletas lado a lado. Sólo se muestran las filas
// que al menos una ficha dice (regla de oro: nada inventado); si a una le
// falta el dato, va "—".

const ID = 'SaroComparativa'
const T = 14
const FPS = 30
const FILA_CADA = 11 // cuadros entre fila y fila
const INICIO_FILAS = 26

const FILAS = [
  { id: 'forma', nombre: 'Forma', valor: p => p.ficha?.forma?.replace(/^Formato /, '') },
  { id: 'balance', nombre: 'Balance', valor: p => p.ficha?.balance?.replace(/^Balance /, '') },
  { id: 'carbono', nombre: 'Caras', valor: p => p.ficha?.carbono },
  { id: 'nucleo', nombre: 'Núcleo', valor: p => p.ficha?.nucleo?.replace(/^Núcleo /, '') },
  { id: 'puntoDulce', nombre: 'Punto dulce', valor: p => (p.ficha?.puntoDulce ? 'Amplio' : null) },
  { id: 'enfoque', nombre: 'Juego', valor: p => p.enfoque },
  { id: 'nivel', nombre: 'Nivel', valor: p => p.nivel },
  { id: 'peso', nombre: 'Peso', valor: p => p.ficha?.peso },
]

const filasCon = productos => FILAS.filter(f => productos.some(p => f.valor(p)))

const duraciones = ({ productos, musica }) => {
  const tabla = INICIO_FILAS + (filasCon(productos).length + 1) * FILA_CADA + 75
  return alinearAlRitmo([80, tabla, 95], T, musica, FPS)
}

export const duracionComparativa = props => duracionTotal(duraciones(props), T)

const Presentacion = ({ productos, etiqueta, gancho }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { S, H, vertical } = useMarco()
  const golpe = spring({ frame, fps, config: { damping: 11, mass: 0.7 } })
  const n = productos.length
  // Las fotos pueden bajar un poco a la franja que tapan las redes (son sólo imagen)
  const top = S.y + 330
  const alto = S.y + S.h - top + (vertical ? 180 : 0)
  const ancho = Math.floor((S.w - (n - 1) * 24) / n)
  return (
    <Estudio haloY={((top + alto / 2) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center' }}>
        <Logo ancho={200} style={{ display: 'block', margin: '0 auto' }} />
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: SARO.accent, marginTop: 26 }}>{etiqueta}</div>
        <div
          style={{
            fontSize: letraQueEntra(gancho, S.w * 1.9, 112, 0.55),
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1.02,
            marginTop: 12,
            transform: `scale(${interpolate(golpe, [0, 1], [1.14, 1])})`,
            textWrap: 'balance',
          }}
        >
          {gancho}
        </div>
      </div>
      <div style={{ position: 'absolute', left: S.x, top, width: S.w, height: alto, display: 'flex', gap: 24, alignItems: 'center' }}>
        {productos.map((p, i) => {
          const e = spring({ frame: frame - 6 - i * 7, fps, config: { damping: 14 } })
          return (
            <div key={p.id} style={{ width: ancho, opacity: Math.min(1, e * 1.4), transform: `translateY(${(1 - e) * 200}px)` }}>
              <ImgProducto producto={p} ancho={ancho} alto={Math.min(alto, Math.round(ancho / 0.6))} />
            </div>
          )
        })}
      </div>
    </Estudio>
  )
}

const Tabla = ({ productos }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { S, H } = useMarco()
  const filas = filasCon(productos)
  const n = productos.length
  const rotulo = 210
  const col = Math.floor((S.w - rotulo) / n)
  const cabecera = Math.min(430, S.h * 0.42)
  const altoFoto = cabecera - 110
  const altoFila = Math.min(86, (S.h - cabecera - 20) / (filas.length + 1))
  const letra = Math.round(Math.min(34, altoFila * 0.42))
  const aparece = i => interpolate(frame, [INICIO_FILAS + i * FILA_CADA, INICIO_FILAS + i * FILA_CADA + 8], [0, 1], clamp)
  return (
    <Estudio haloY={((S.y + cabecera / 2) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w }}>
        {/* Cabecera: foto y nombre de cada paleta */}
        <div style={{ display: 'flex', height: cabecera }}>
          <div style={{ width: rotulo }} />
          {productos.map((p, i) => {
            const e = spring({ frame: frame - i * 5, fps, config: { damping: 200 } })
            const nombre = sinSaro(p.nombre)
            return (
              <div key={p.id} style={{ width: col, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: e }}>
                <ImgProducto producto={p} ancho={Math.round(Math.min(col - 30, altoFoto * 0.62))} alto={altoFoto} />
                <div
                  style={{
                    fontSize: letraQueEntra(nombre, (col - 16) * 2, 34, 0.56),
                    fontWeight: 800,
                    textAlign: 'center',
                    marginTop: 14,
                    lineHeight: 1.1,
                    maxHeight: 80,
                    overflow: 'hidden',
                    color: p.acento,
                    filter: 'brightness(1.3)',
                  }}
                >
                  {nombre}
                </div>
              </div>
            )
          })}
        </div>
        {/* Filas */}
        {[...filas, { id: 'precio', nombre: 'Precio', valor: p => pesos(p.precio) }].map((f, i) => {
          const a = aparece(i)
          const esPrecio = f.id === 'precio'
          return (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: altoFila,
                borderTop: '2px solid rgba(255,255,255,0.08)',
                opacity: a,
                transform: `translateX(${(1 - a) * 40}px)`,
              }}
            >
              <div style={{ width: rotulo, fontSize: letra * 0.85, fontWeight: 700, color: SARO.gris, letterSpacing: 1 }}>{f.nombre}</div>
              {productos.map(p => (
                <div
                  key={p.id}
                  style={{
                    width: col,
                    textAlign: 'center',
                    fontSize: esPrecio ? letra * 1.25 : letra,
                    fontWeight: esPrecio ? 900 : 600,
                    color: f.valor(p) ? SARO.texto : SARO.gris,
                  }}
                >
                  {f.valor(p) ?? '—'}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </Estudio>
  )
}

export const Comparativa = props => {
  const { productos, musica, efectos, guia } = props
  const dur = duraciones(props)
  const ini = inicios(dur, T)
  const nFilas = filasCon(productos).length + 1
  const golpes = [
    ...golpesBase(dur, T, 2),
    { f: 1, sfx: 'swoosh', vol: 0.14, nivel: 'medio' },
    ...productos.map((_, i) => ({ f: 8 + i * 7, sfx: 'pelota', vol: 0.2, nivel: 'intenso' })),
    ...enEscenas(ini, [
      [],
      Array.from({ length: nFilas }, (_, i) => ({
        f: INICIO_FILAS + i * FILA_CADA,
        sfx: i === nFilas - 1 ? 'ding' : 'pop',
        vol: i === nFilas - 1 ? 0.12 : 0.1,
        nivel: 'medio',
      })),
      golpesCierre(),
    ]),
  ]
  return (
    <Lienzo guia={guia}>
      <Musica id={musica} />
      <Efectos golpes={golpes} elegido={efectos} />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={dur[0]}>
          <Presentacion productos={productos} etiqueta={texto(props, ID, 'etiqueta')} gancho={texto(props, ID, 'gancho')} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[1]}>
          <Tabla productos={productos} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={dur[2]}>
          <Cierre frase={texto(props, ID, 'cierre')} ruta="/paletas" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Lienzo>
  )
}
