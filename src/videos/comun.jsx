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
import { pesos, sinSaro } from './textos'

export { pesos, sinSaro }

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

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }

export const useEntrada = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - delay, fps, config: { damping } })
}

// El admin carga Tailwind, y su "preflight" cambia cosas globales: las imágenes
// con max-width 100% (comprimía las paletas de costado), el interlineado 1.5 y
// el box-sizing. Estas reglas valen sólo dentro del video, así la vista previa
// y el MP4 se ven iguales.
const RESET = `
.saro-video, .saro-video *, .saro-video *::before, .saro-video *::after { box-sizing: border-box; }
.saro-video img { max-width: none; }
.saro-video svg { display: block; }
`

/**
 * Zona segura: el rectángulo donde van los textos y el precio para que no los
 * tape la interfaz de Instagram, Facebook o TikTok (nombre de la cuenta, texto
 * de la publicación, botones). En vertical se usa la guía de los anuncios de
 * Reels de Meta, la más exigente: libre el 14 % de arriba, el 35 % de abajo y
 * el 6 % de los costados. Lo de afuera puede tener foto o decoración.
 */
export function zonaSegura(ancho, alto) {
  if (alto / ancho > 1.6) {
    const top = Math.round(alto * 0.14)
    const lado = Math.round(ancho * 0.06)
    return { x: lado, y: top, w: ancho - 2 * lado, h: Math.round(alto * 0.65) - top }
  }
  const mx = Math.round(ancho * 0.06)
  const my = Math.round(alto * 0.05)
  return { x: mx, y: my, w: ancho - 2 * mx, h: alto - 2 * my }
}

/** Medidas del video actual: ancho, alto, zona segura (S) y si es vertical 9:16. */
export function useMarco() {
  const { width, height } = useVideoConfig()
  return { W: width, H: height, S: zonaSegura(width, height), vertical: height / width > 1.6 }
}

/** Caja posicionada sobre la zona segura (todo lo de adentro, en flex columna). */
export const EnZona = ({ children, style }) => {
  const { S } = useMarco()
  return (
    <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, height: S.h, display: 'flex', flexDirection: 'column', ...style }}>
      {children}
    </div>
  )
}

/**
 * Guía de la vista previa (no sale en el MP4): sombrea lo que tapa la interfaz
 * de las redes. Se prende desde el admin.
 */
const GuiaZonas = () => {
  const { W, H, S } = useMarco()
  const franja = { position: 'absolute', background: 'rgba(239,68,68,0.28)', pointerEvents: 'none' }
  const rotulo = { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 28, fontWeight: 800, color: '#FECACA', letterSpacing: 2 }
  return (
    <AbsoluteFill style={{ zIndex: 50 }}>
      <div style={{ ...franja, left: 0, top: 0, width: W, height: S.y }} />
      <div style={{ ...franja, left: 0, top: S.y + S.h, width: W, height: H - S.y - S.h }}>
        <div style={{ ...rotulo, top: 30 }}>LO TAPAN LAS REDES · SIN TEXTOS ACÁ</div>
      </div>
      <div style={{ ...franja, left: 0, top: S.y, width: S.x, height: S.h }} />
      <div style={{ ...franja, left: S.x + S.w, top: S.y, width: W - S.x - S.w, height: S.h }} />
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, height: S.h, border: '3px dashed rgba(254,202,202,0.9)' }} />
    </AbsoluteFill>
  )
}

/** Raíz de cada plantilla. `guia` = mostrar la zona segura (sólo vista previa). */
export const Lienzo = ({ children, guia = false }) => (
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
    {guia && <GuiaZonas />}
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
  // Sin recortar va en una tarjeta 0,775:1 que entra en el ancho y el 80 % del
  // alto, centrada (y no se inclina tanto). Recortada ocupa toda la caja.
  const tarjeta = Math.min(alto * 0.8, ancho / 0.775)
  const caja = producto.recortada ? { ancho, alto } : { ancho: Math.round(tarjeta * 0.775), alto: Math.round(tarjeta) }
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: y + (producto.recortada ? 0 : (alto - caja.alto) / 2),
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

export const BotonWhatsApp = ({ escala, tamano = 46, texto = 'Pedí por WhatsApp' }) => (
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
    {texto}
  </div>
)
