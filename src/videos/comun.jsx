import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { loadFont } from '@remotion/fonts'

// Identidad: docs/ESTETICA.md. Fuente única Inter, guardada en el repo
// (public/videos/fuentes) para no depender de Google Fonts al renderizar.
export const fontFamily = 'SaroInter'
if (typeof document !== 'undefined') {
  loadFont({
    family: fontFamily,
    url: staticFile('videos/fuentes/inter-latin.woff2'),
    weight: '100 900',
  })
}

export const SARO = {
  blue: '#2563EB',
  mid: '#1E40AF',
  dark: '#0F172A',
  noche: '#070B16',
  light: '#EFF6FF',
  accent: '#F59E0B',
  whatsapp: '#22C55E',
  texto: '#F8FAFC',
  gris: '#94A3B8',
}

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
export const pesos = n => `$${fmt.format(n)}`

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

export const useEntrada = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping } })
}

export const sinSaro = nombre => nombre.replace(/^Saro\s+/i, '')

// El admin carga Tailwind, y su "preflight" cambia cosas globales: las imágenes
// con max-width 100% (comprimía las paletas de costado), el interlineado 1.5 y
// el box-sizing. Estas reglas valen sólo dentro del video, así la vista previa
// y el MP4 se ven iguales.
const RESET = `
.saro-video, .saro-video *, .saro-video *::before, .saro-video *::after { box-sizing: border-box; }
.saro-video img { max-width: none; }
.saro-video svg { display: block; }
`

/** Raíz de cada plantilla. */
export const Lienzo = ({ children }) => (
  <AbsoluteFill
    className="saro-video"
    style={{
      background: SARO.noche,
      fontFamily: `${fontFamily}, Inter, sans-serif`,
      lineHeight: 'normal',
      color: SARO.texto,
      WebkitFontSmoothing: 'antialiased',
    }}
  >
    <style>{RESET}</style>
    {children}
  </AbsoluteFill>
)

/** Fondo de estudio: noche azul, un halo del color del producto y viñeta. */
export const Estudio = ({ color = SARO.blue, children, haloY = 38 }) => {
  const frame = useCurrentFrame()
  const respira = 0.85 + Math.sin(frame / 25) * 0.08
  return (
    <AbsoluteFill style={{ background: SARO.noche, color: SARO.texto, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 45% at 50% ${haloY}%, ${color}55 0%, ${color}14 45%, transparent 75%)`,
          opacity: respira,
        }}
      />
      {/* Haz de luz diagonal, se desplaza lento */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.045) 48%, transparent 60%)',
          transform: `translateX(${interpolate(frame, [0, 300], [-300, 300])}px)`,
        }}
      />
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
      />
      {children}
    </AbsoluteFill>
  )
}

/**
 * Foto de producto en una caja fija con objectFit contain: entra entera y nunca
 * se deforma, sea cual sea la proporción de la foto. Si todavía no tiene la
 * foto recortada para video, va sobre una tarjeta blanca (su fondo original es
 * blanco y sobre el estudio oscuro quedaría un rectángulo suelto).
 */
export const ImgProducto = ({ producto, ancho, alto, sombra = '0 20px 30px rgba(0,0,0,.6)', style }) => {
  const img = (
    <Img
      src={producto.imagen}
      maxRetries={3}
      style={{
        width: '100%',
        height: '100%',
        maxWidth: 'none',
        objectFit: 'contain',
        objectPosition: producto.recortada ? 'bottom' : 'center',
        filter: producto.recortada ? `drop-shadow(${sombra})` : undefined,
      }}
    />
  )
  if (producto.recortada) return <div style={{ width: ancho, height: alto, ...style }}>{img}</div>
  const margen = Math.round(Math.min(ancho, alto) * 0.05)
  return (
    <div
      style={{
        width: ancho,
        height: alto,
        padding: margen,
        borderRadius: Math.round(margen * 1.6),
        background: '#fff',
        boxShadow: '0 30px 60px rgba(0,0,0,.45)',
        ...style,
      }}
    >
      {img}
    </div>
  )
}

/** Producto que entra, flota y gira apenas en 3D, con sombra en el piso. */
export const PaletaFlotante = ({ producto, alto, ancho, delay = 0, y = 0 }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const e = spring({ frame: frame - delay, fps, config: { damping: 14, mass: 1.1 } })
  const t = frame - delay
  const flota = Math.sin(t / 18) * 14
  const giroY = interpolate(e, [0, 1], [-55, 0]) + Math.sin(t / 30) * 9
  const giroZ = interpolate(e, [0, 1], [-18, -4]) + Math.sin(t / 40) * 2
  // Sin recortar, la tarjeta es más chica que la paleta suelta (y no se inclina tanto)
  const caja = producto.recortada ? { ancho, alto } : { ancho: Math.round(alto * 0.62), alto: Math.round(alto * 0.8) }
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: y + (alto - caja.alto),
        width: caja.ancho,
        height: caja.alto,
        transform: 'translateX(-50%)',
        perspective: 1600,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -alto * 0.05,
          width: alto * 0.42,
          height: alto * 0.05,
          transform: `translateX(-50%) scale(${1 - flota / 140})`,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          filter: 'blur(18px)',
          opacity: e,
        }}
      />
      <ImgProducto
        producto={producto}
        ancho={caja.ancho}
        alto={caja.alto}
        sombra="0 30px 45px rgba(0,0,0,0.55)"
        style={{
          opacity: Math.min(1, e * 1.4),
          transform: `translateY(${(1 - e) * 260 + flota}px) rotateY(${giroY}deg) rotateZ(${producto.recortada ? giroZ : giroZ / 2}deg) scale(${0.75 + 0.25 * e})`,
        }}
      />
    </div>
  )
}

/** Precio que cuenta hacia arriba hasta el valor real. */
export const PrecioAnimado = ({ valor, delay, tamano }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [delay, delay + 24], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  // Redondea a miles mientras cuenta, así no "tiembla" el último dígito
  const mostrado = p < 1 ? Math.round((valor * p) / 1000) * 1000 : valor
  return (
    <span style={{ fontSize: tamano, fontWeight: 900, letterSpacing: -2, fontVariantNumeric: 'tabular-nums' }}>
      {pesos(mostrado)}
    </span>
  )
}

export const Chip = ({ texto, delay, color }) => {
  const e = useEntrada(delay)
  return (
    <div
      style={{
        padding: '14px 26px',
        borderRadius: 999,
        border: `2px solid ${color ?? 'rgba(255,255,255,0.18)'}`,
        background: 'rgba(255,255,255,0.06)',
        fontSize: 32,
        fontWeight: 600,
        opacity: e,
        transform: `translateY(${(1 - e) * 24}px)`,
        whiteSpace: 'nowrap',
      }}
    >
      {texto}
    </div>
  )
}

export const Logo = ({ ancho, opacity = 1, style }) => (
  <Img src={staticFile('assets/logo.png')} style={{ width: ancho, maxWidth: 'none', opacity, ...style }} />
)

export const IconoWhatsApp = ({ tamano, color = 'white' }) => (
  <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.5c.1.2 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.4Z" />
  </svg>
)

export const BotonWhatsApp = ({ escala, tamano = 46 }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 18,
      padding: '30px 64px',
      borderRadius: 999,
      background: SARO.whatsapp,
      color: 'white',
      fontSize: tamano,
      fontWeight: 800,
      transform: `scale(${escala})`,
      boxShadow: '0 20px 60px rgba(34,197,94,.35)',
    }}
  >
    <IconoWhatsApp tamano={tamano * 1.1} />
    Pedí por WhatsApp
  </div>
)
