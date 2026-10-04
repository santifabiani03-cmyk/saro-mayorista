import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Estudio, ImgProducto, Lienzo, Logo, SARO, clamp, pesos, sinSaro, useMarco } from './comun'
import { Cierre, Linea, golpesLinea, letraQueEntra } from './escenas'
import { Efectos, Musica } from './audio'
import { cuadrosPorGolpe } from './pulso'
import { texto } from './textos'

// "Catálogo express": muchos productos en pocos segundos, un producto por
// golpe (o por dos, si la música es rápida), con cortes secos sobre el ritmo.
// Gancho → productos → toda la línea → cierre.

const ID = 'SaroRitmo'
const FPS = 30
const SIN_PULSO = 20 // sin música: un "golpe" cada 20 cuadros

/** Golpes que ocupa cada parte: lo justo para que nada dure menos que su mínimo. */
function plan({ productos, musica }) {
  const golpe = cuadrosPorGolpe(musica, FPS) ?? SIN_PULSO
  const golpes = minimo => Math.max(1, Math.ceil(minimo / golpe))
  const partes = [
    { tipo: 'gancho', golpes: golpes(60) },
    ...productos.map(p => ({ tipo: 'producto', p, golpes: golpes(24) })),
    { tipo: 'linea', golpes: golpes(95) },
    { tipo: 'cierre', golpes: golpes(95) },
  ]
  // Bordes sobre la grilla de golpes (redondeados al cuadro), sin arrastrar error
  let n = 0
  return partes.map(parte => {
    const desde = Math.round(n * golpe)
    n += parte.golpes
    return { ...parte, desde, dur: Math.round(n * golpe) - desde, golpe }
  })
}

export const duracionRitmo = props => {
  const ultima = plan(props).at(-1)
  return ultima.desde + ultima.dur
}

const GanchoTexto = ({ etiqueta, gancho, productos, golpe }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { S, H } = useMarco()
  const n = Math.floor(frame / golpe)
  const enGolpe = frame - n * golpe
  const latido = 1 + 0.05 * Math.exp(-enGolpe / 4)
  const p = productos[n % productos.length]
  const entra = spring({ frame, fps, config: { damping: 12, mass: 0.6 } })
  const tam = letraQueEntra(gancho, S.w * 1.9, 120, 0.55)
  return (
    <Estudio color={p.acento} haloY={((S.y + S.h * 0.6) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center' }}>
        <Logo ancho={200} style={{ display: 'block', margin: '0 auto' }} />
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: SARO.accent, marginTop: 30 }}>{etiqueta}</div>
        <div
          style={{
            fontSize: tam,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1.02,
            marginTop: 16,
            transform: `scale(${interpolate(entra, [0, 1], [1.15, 1]) * latido})`,
            textWrap: 'balance',
          }}
        >
          {gancho}
        </div>
      </div>
      {/* Un producto distinto en cada golpe, debajo del texto */}
      <div style={{ position: 'absolute', left: S.x, top: S.y + S.h * 0.45, width: S.w, height: S.h * 0.55, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: `scale(${latido}) rotate(${(n % 2 ? 1 : -1) * 4}deg)` }}>
          <ImgProducto producto={p} ancho={Math.round(S.h * 0.42)} alto={Math.round(S.h * 0.5)} />
        </div>
      </div>
    </Estudio>
  )
}

const Golpe = ({ producto: p, numero, total }) => {
  const frame = useCurrentFrame()
  const { S, H } = useMarco()
  const flash = interpolate(frame, [0, 4], [0.35, 0], clamp)
  const zoom = interpolate(frame, [0, 10], [1.1, 1], clamp)
  const deriva = interpolate(frame, [0, 60], [0, -18])
  const nombre = sinSaro(p.nombre)
  const tamNombre = nombre.length > 22 ? 56 : 72
  const pie = tamNombre * 2.1 + 100
  const fotoAlto = S.h - 70 - pie - 20
  return (
    <Estudio color={p.acento} haloY={((S.y + 70 + fotoAlto / 2) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>
        <span style={{ color: SARO.gris }}>
          {String(numero).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        {p.nuevo && <span style={{ color: SARO.accent }}>NUEVO</span>}
      </div>
      <div
        style={{
          position: 'absolute',
          left: S.x,
          top: S.y + 70,
          width: S.w,
          height: fotoAlto,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${zoom}) translateY(${deriva}px)`,
        }}
      >
        <ImgProducto producto={p} ancho={Math.round(Math.min(S.w * 0.86, fotoAlto * 0.8))} alto={fotoAlto} />
      </div>
      <div style={{ position: 'absolute', left: S.x, top: S.y + S.h - pie, width: S.w, height: pie, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: tamNombre, fontWeight: 900, letterSpacing: -2, lineHeight: 1.04, maxHeight: tamNombre * 2.1, overflow: 'hidden' }}>{nombre}</div>
        <div style={{ fontSize: 76, fontWeight: 900, color: p.acento, marginTop: 8, filter: 'brightness(1.25)' }}>{pesos(p.precio)}</div>
      </div>
      <AbsoluteFill style={{ background: 'white', opacity: flash }} />
    </Estudio>
  )
}

export const Ritmo = props => {
  const { productos, musica, efectos, guia } = props
  const partes = plan(props)
  const golpe = partes[0].golpe
  const cierre = partes.at(-1).desde
  const golpes = [
    { f: 1, sfx: 'impacto', vol: 0.3 },
    { f: 1, sfx: 'swoosh', vol: 0.14, nivel: 'medio' },
    ...partes
      .filter(x => x.tipo === 'producto')
      .flatMap(x => [
        { f: x.desde, sfx: 'palmas', vol: 0.2, nivel: 'medio' },
        { f: x.desde + Math.round(x.dur / 2), sfx: 'pelota', vol: 0.18, nivel: 'intenso' },
      ]),
    ...golpesLinea(productos).map(g => ({ ...g, f: g.f + partes.at(-2).desde })),
    { f: partes.at(-2).desde - 3, sfx: 'whoosh', vol: 0.22 },
    { f: cierre - 4, sfx: 'whoosh', vol: 0.22 },
    { f: cierre - 60, sfx: 'riser', vol: 0.16, nivel: 'intenso' },
    { f: cierre + 2, sfx: 'impacto', vol: 0.4 },
    { f: cierre + 18, sfx: 'pop', vol: 0.14, nivel: 'medio' },
  ]
  const productosEnLinea = productos.length > 12 ? productos.slice(0, 12) : productos

  return (
    <Lienzo guia={guia}>
      <Musica id={musica} fadeIn={6} fadeOut={40} />
      <Efectos golpes={golpes} elegido={efectos} />
      {partes.map((x, i) => (
        <Sequence key={i} from={x.desde} durationInFrames={x.dur} name={x.tipo}>
          {x.tipo === 'gancho' && (
            <GanchoTexto etiqueta={texto(props, ID, 'etiqueta')} gancho={texto(props, ID, 'gancho')} productos={productos} golpe={golpe} />
          )}
          {x.tipo === 'producto' && <Golpe producto={x.p} numero={i} total={productos.length} />}
          {x.tipo === 'linea' && <Linea productos={productosEnLinea} eyebrow="TODO EN SARO" titulo={`${productos.length} productos`} />}
          {x.tipo === 'cierre' && <Cierre frase={texto(props, ID, 'cierre')} ruta="" />}
        </Sequence>
      ))}
    </Lienzo>
  )
}
