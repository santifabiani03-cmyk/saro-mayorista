import { Fragment } from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { BotonWhatsApp, Estudio, Lienzo, Logo, SARO, clamp, pesos, useEntrada } from './comun'
import { Paleta3D } from './Paleta3D'
import { Efectos, Musica, duracionTotal, golpesBase, inicios } from './audio'

// Capturas reales de saro.com.ar (escritorio 1440x900 y celular), en
// public/videos/web. Si la web cambia mucho, hay que volver a sacarlas.
const ESCALA = 0.9028 // 1440 -> 1300 px
const NAV = { x: 80, y: 110, ancho: 1300, alto: 812, barra: 56 }
const captura = nombre => staticFile(`videos/web/${nombre}`)

// ---------- Piezas ----------

const Navegador = ({ children, ruta, entrada = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: NAV.x,
      top: NAV.y,
      width: NAV.ancho,
      height: NAV.alto + NAV.barra,
      borderRadius: 18,
      overflow: 'hidden',
      background: '#fff',
      boxShadow: '0 50px 120px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)',
      transform: `perspective(2200px) rotateY(${(1 - entrada) * 16}deg) translateX(${(1 - entrada) * -120}px)`,
      opacity: entrada,
    }}
  >
    <div
      style={{
        height: NAV.barra,
        background: '#F1F5F9',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 22px',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      {['#FF5F57', '#FEBC2E', '#28C840'].map(c => (
        <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
      ))}
      <div
        style={{
          marginLeft: 26,
          flex: 1,
          height: 34,
          borderRadius: 17,
          background: '#fff',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 18px',
          fontSize: 18,
          color: '#334155',
          gap: 8,
        }}
      >
        <span style={{ color: '#16A34A' }}>🔒︎</span>
        <b>saro.com.ar</b>
        <span style={{ color: '#94A3B8' }}>{ruta}</span>
      </div>
    </div>
    <div style={{ position: 'relative', width: NAV.ancho, height: NAV.alto, overflow: 'hidden' }}>{children}</div>
  </div>
)

const Captura = ({ src, opacity = 1, y = 0 }) => (
  <Img
    src={captura(src)}
    style={{ position: 'absolute', top: -y, left: 0, width: NAV.ancho, maxWidth: 'none', opacity }}
  />
)

const Cursor = ({ x, y, clic = 0 }) => (
  <div style={{ position: 'absolute', left: x, top: y, zIndex: 5 }}>
    {clic > 0 && (
      <div
        style={{
          position: 'absolute',
          left: -30,
          top: -30,
          width: 60,
          height: 60,
          borderRadius: 30,
          border: `3px solid ${SARO.blue}`,
          opacity: 1 - clic,
          transform: `scale(${0.4 + clic})`,
        }}
      />
    )}
    <svg width={34} height={34} viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.4))' }}>
      <path d="M4 2l15 11-6.5 1.2L16 21l-3 1.3-3.4-6.8L4 20z" fill="#111827" stroke="white" strokeWidth={1.4} />
    </svg>
  </div>
)

const Punto = ({ texto, delay }) => {
  const e = useEntrada(delay)
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', opacity: e, transform: `translateX(${(1 - e) * 40}px)` }}>
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          background: SARO.blue,
          marginTop: 13,
          flexShrink: 0,
          boxShadow: `0 0 16px ${SARO.blue}`,
        }}
      />
      <div style={{ fontSize: 28, lineHeight: 1.35, color: '#CBD5E1' }}>{texto}</div>
    </div>
  )
}

/** Columna de texto a la derecha del navegador. */
const Texto = ({ eyebrow, titulo, puntos, delay = 10, x = 1440, ancho = 420 }) => {
  const a = useEntrada(delay)
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        width: ancho,
        top: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 6, color: SARO.accent, opacity: a }}>{eyebrow}</div>
      <div
        style={{
          fontSize: 58,
          fontWeight: 900,
          letterSpacing: -2,
          lineHeight: 1.05,
          marginTop: 12,
          opacity: a,
          transform: `translateY(${(1 - a) * 30}px)`,
        }}
      >
        {titulo}
      </div>
      <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {puntos.map((p, i) => (
          <Punto key={p} texto={p} delay={delay + 14 + i * 10} />
        ))}
      </div>
    </div>
  )
}

const Telefono = ({ children, x, y, giro = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: 368,
      height: 764,
      borderRadius: 58,
      background: '#0B0F19',
      padding: 14,
      boxShadow: '0 50px 100px rgba(0,0,0,.6), inset 0 0 0 2px #334155',
      transform: `perspective(1800px) rotateY(${giro}deg)`,
    }}
  >
    <div style={{ position: 'relative', width: 340, height: 736, borderRadius: 44, overflow: 'hidden', background: '#fff' }}>
      {children}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 30,
          borderRadius: 15,
          background: '#000',
        }}
      />
    </div>
  </div>
)

// ---------- Escenas ----------

const Apertura = () => {
  const frame = useCurrentFrame()
  const logo = useEntrada(0, 12)
  const caja = useEntrada(22)
  const url = 'saro.com.ar'
  const letras = Math.floor(interpolate(frame, [36, 66], [0, url.length], clamp))
  const cursorVisible = Math.floor(frame / 8) % 2 === 0 || letras < url.length
  return (
    <Estudio haloY={45}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 12, color: SARO.accent, opacity: logo }}>
          NUEVA TIENDA ONLINE
        </div>
        <Logo ancho={560} opacity={logo} style={{ marginTop: 36, transform: `scale(${0.8 + 0.2 * logo})` }} />
        <div
          style={{
            marginTop: 60,
            width: 640,
            height: 86,
            borderRadius: 43,
            background: 'rgba(255,255,255,0.07)',
            border: '2px solid rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 36px',
            fontSize: 40,
            fontWeight: 600,
            opacity: caja,
            transform: `translateY(${(1 - caja) * 30}px)`,
          }}
        >
          <span style={{ color: SARO.gris, marginRight: 4 }}>https://</span>
          {url.slice(0, letras)}
          <span style={{ opacity: cursorVisible ? 1 : 0, color: '#93C5FD' }}>|</span>
        </div>
      </AbsoluteFill>
    </Estudio>
  )
}

const Hero = () => {
  const frame = useCurrentFrame()
  const entrada = useEntrada(0)
  const a1 = interpolate(frame, [60, 78], [0, 1], clamp)
  const a2 = interpolate(frame, [108, 126], [0, 1], clamp)
  return (
    <Estudio haloY={50}>
      <Navegador ruta="/" entrada={entrada}>
        <Captura src="desk-home-0.jpg" />
        <Captura src="desk-home-1.jpg" opacity={a1} />
        <Captura src="desk-home-2.jpg" opacity={a2} />
      </Navegador>
      <Texto
        eyebrow="INICIO"
        titulo={
          <>
            El pádel arranca en <span style={{ color: '#93C5FD' }}>SARO</span>
          </>
        }
        puntos={['Paleta 3D real que se mueve con el scroll', 'Tienda oficial, directo de fábrica', 'Envíos a todo el país']}
      />
    </Estudio>
  )
}

// Tarjetas de "Elegí tu catálogo" en la captura desk-home-3 (px de la captura 1440x900)
const TARJETAS = [
  { x: 208, y: 676, w: 324, h: 230 },
  { x: 558, y: 676, w: 324, h: 230 },
  { x: 908, y: 676, w: 324, h: 230 },
]

const Catalogos = () => {
  const frame = useCurrentFrame()
  const entrada = useEntrada(0)
  const activa = Math.min(2, Math.floor(interpolate(frame, [30, 105], [0, 3], clamp)))
  const t = TARJETAS[activa]
  return (
    <Estudio haloY={50}>
      <Navegador ruta="/" entrada={entrada}>
        <Captura src="desk-home-3.jpg" />
        {frame > 30 && (
          <div
            style={{
              position: 'absolute',
              left: t.x * ESCALA - 6,
              top: t.y * ESCALA - 6,
              width: t.w * ESCALA + 12,
              height: t.h * ESCALA,
              borderRadius: 18,
              border: `4px solid ${SARO.blue}`,
              boxShadow: `0 0 40px ${SARO.blue}88`,
            }}
          />
        )}
      </Navegador>
      <Texto
        eyebrow="TRES CATÁLOGOS"
        titulo="Cada cliente, su catálogo"
        puntos={['Paletas de pádel', 'Ropa y accesorios por unidad', 'Mayorista: precios por cantidad para comercios']}
      />
    </Estudio>
  )
}

const Paletas = ({ totalPaletas }) => {
  const frame = useCurrentFrame()
  const entrada = useEntrada(0)
  // Cursor: entra y se apoya en la primera tarjeta
  const mov = interpolate(frame, [25, 60], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const cx = interpolate(mov, [0, 1], [1100, 230])
  const cy = interpolate(mov, [0, 1], [700, 420])
  const hover = interpolate(frame, [58, 66], [0, 1], clamp)
  const clic = interpolate(frame, [70, 85], [0, 1], clamp)
  const scroll = interpolate(frame, [100, 170], [0, 560], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  return (
    <Estudio haloY={50}>
      <Navegador ruta="/paletas" entrada={entrada}>
        <Captura src="desk-paletas.jpg" y={scroll} />
        <div
          style={{
            position: 'absolute',
            left: 104 * ESCALA - 4,
            top: 240 * ESCALA - 4 - scroll,
            width: 292 * ESCALA + 8,
            height: 440 * ESCALA + 8,
            borderRadius: 16,
            border: `4px solid ${SARO.blue}`,
            opacity: hover * (1 - interpolate(frame, [100, 115], [0, 1], clamp)),
            boxShadow: `0 0 40px ${SARO.blue}88`,
          }}
        />
        <Cursor
          x={cx}
          y={cy - scroll * interpolate(frame, [100, 101], [0, 1], clamp)}
          clic={clic > 0 && clic < 1 ? clic : 0}
        />
      </Navegador>
      <Texto
        eyebrow="CATÁLOGO"
        titulo="Precios a la vista"
        puntos={[
          totalPaletas > 0 ? `${totalPaletas} modelos de paletas` : 'Todos los modelos de paletas',
          'Buscador y orden por precio',
          'Guía para elegir tu paleta',
          'Ficha con fotos, colores y detalle',
        ]}
      />
    </Estudio>
  )
}

const Movil = () => {
  const frame = useCurrentFrame()
  const t1 = useEntrada(0)
  const t2 = useEntrada(10)
  const scroll = interpolate(frame, [40, 150], [0, 1150], { ...clamp, easing: Easing.inOut(Easing.quad) })
  const heroCambio = interpolate(frame, [70, 88], [0, 1], clamp)
  return (
    <Estudio haloY={55}>
      <Texto
        x={110}
        ancho={640}
        eyebrow="EN EL CELULAR"
        titulo={
          <>
            Pensada para
            <br />
            comprar desde el teléfono
          </>
        }
        puntos={['Misma tienda, adaptada a pantalla chica', 'Botón directo a WhatsApp siempre a mano', 'Carrito que no se pierde']}
      />
      <div style={{ opacity: t1, transform: `translateY(${(1 - t1) * 120}px)` }}>
        <Telefono x={880} y={160} giro={14}>
          <Img src={captura('movil-home-0.jpg')} style={{ position: 'absolute', width: 340, maxWidth: 'none' }} />
          <Img
            src={captura('movil-home-2.jpg')}
            style={{ position: 'absolute', width: 340, maxWidth: 'none', opacity: heroCambio }}
          />
        </Telefono>
      </div>
      <div style={{ opacity: t2, transform: `translateY(${(1 - t2) * 120}px)` }}>
        <Telefono x={1330} y={110} giro={-10}>
          <Img
            src={captura('movil-paletas.jpg')}
            style={{ position: 'absolute', width: 340, maxWidth: 'none', top: -scroll }}
          />
        </Telefono>
      </div>
    </Estudio>
  )
}

// Mismo formato que buildMessage() de components/Cart.jsx (sin envío). El emoji
// del saludo se deja afuera: en el servidor de render no hay fuente de emojis.
const armarPedido = productos => {
  const lineas = ['*Hola!* Quiero hacer este pedido:', '']
  for (const p of productos) {
    lineas.push(
      `*${p.nombre}* ${pesos(p.precio)} C/u`,
      '',
      `• ${p.colores[0] ?? 'Único'} - ${p.talle} x1`,
      `= 1 x ${pesos(p.precio)} = ${pesos(p.precio)}`,
      '',
    )
  }
  lineas.push(`*TOTAL: ${pesos(productos.reduce((s, p) => s + p.precio, 0))}*`)
  return lineas.join('\n')
}

/** Renderiza *negrita* estilo WhatsApp. */
const Negritas = ({ texto }) => (
  <>
    {texto.split(/(\*[^*\n]+\*?)/g).map((parte, i) =>
      parte.startsWith('*') ? <b key={i}>{parte.replace(/\*/g, '')}</b> : <Fragment key={i}>{parte}</Fragment>,
    )}
  </>
)

const Paso = ({ n, t, s, delay }) => {
  const e = useEntrada(delay)
  return (
    <div
      style={{
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        padding: '24px 30px',
        borderRadius: 22,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        opacity: e,
        transform: `translateX(${(1 - e) * 60}px)`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: n === 3 ? SARO.whatsapp : SARO.blue,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 900,
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 800 }}>{t}</div>
        <div style={{ fontSize: 24, color: SARO.gris, marginTop: 4 }}>{s}</div>
      </div>
    </div>
  )
}

const PASOS = [
  { n: 1, t: 'Elegí tus productos', s: 'Sumá paletas, ropa o accesorios al carrito' },
  { n: 2, t: 'Armá tu pedido', s: 'Colores, talles y cantidades. Las promos se aplican solas' },
  { n: 3, t: 'Cerrá por WhatsApp', s: 'El pedido llega redactado y lo coordinamos juntos' },
]

// Cuadros de la escena Comprar donde se escribe y se envía el mensaje (los usa el audio)
const ENVIADO = 124

const Comprar = ({ productos }) => {
  const frame = useCurrentFrame()
  const tel = useEntrada(0)
  const pedido = armarPedido(productos)
  const chars = Math.floor(interpolate(frame, [30, 120], [0, pedido.length], clamp))
  const enviado = interpolate(frame, [ENVIADO, ENVIADO + 10], [0, 1], clamp)
  return (
    <Estudio haloY={50}>
      <div style={{ opacity: tel, transform: `translateY(${(1 - tel) * 100}px)` }}>
        <Telefono x={170} y={158}>
          <div style={{ position: 'absolute', inset: 0, background: '#0B141A' }}>
            <div
              style={{
                height: 96,
                background: '#1F2C34',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '0 18px 14px',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  background: SARO.dark,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Logo ancho={36} />
              </div>
              <div>
                <div style={{ color: '#E9EDEF', fontSize: 18, fontWeight: 700 }}>SARO</div>
                <div style={{ color: '#8696A0', fontSize: 13 }}>en línea</div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                right: 12,
                bottom: 90,
                maxWidth: 290,
                background: '#005C4B',
                color: '#E9EDEF',
                borderRadius: '14px 4px 14px 14px',
                padding: '10px 12px 22px',
                fontSize: 15,
                lineHeight: 1.35,
                whiteSpace: 'pre-wrap',
                boxShadow: '0 2px 4px rgba(0,0,0,.3)',
              }}
            >
              <Negritas texto={pedido.slice(0, chars)} />
              <span
                style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 5,
                  fontSize: 11,
                  color: enviado ? '#53BDEB' : '#8696A0',
                }}
              >
                {enviado > 0 ? '✓✓' : '✓'}
              </span>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 10,
                right: 10,
                bottom: 16,
                height: 54,
                borderRadius: 27,
                background: '#1F2C34',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                color: '#8696A0',
                fontSize: 16,
              }}
            >
              Mensaje
            </div>
          </div>
        </Telefono>
        <div style={{ position: 'absolute', left: 170, top: 940, width: 368, textAlign: 'center', fontSize: 20, color: SARO.gris }}>
          Ejemplo del mensaje que arma la web
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 700,
          right: 110,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 6, color: SARO.accent, opacity: tel }}>CÓMO COMPRAR</div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, marginTop: 12, opacity: tel }}>
          Simple y sin vueltas
        </div>
        <div style={{ fontSize: 28, color: '#CBD5E1', marginTop: 14, opacity: tel }}>
          No cobramos online: armás tu pedido en la web y lo cerramos juntos por WhatsApp.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, marginTop: 44 }}>
          {PASOS.map((p, i) => (
            <Paso key={p.n} {...p} delay={20 + i * 28} />
          ))}
        </div>
      </div>
    </Estudio>
  )
}

const CierreWeb = () => {
  const frame = useCurrentFrame()
  const a = useEntrada(6)
  const b = useEntrada(24, 10)
  const giro = interpolate(frame, [0, 120], [-1.2, 1.4])
  return (
    <Estudio haloY={50}>
      <div style={{ position: 'absolute', left: 90, top: 40 }}>
        <Paleta3D width={740} height={1000} giro={giro} distancia={11.5} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 860,
          right: 100,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Logo ancho={420} opacity={a} />
        <div
          style={{
            fontSize: 110,
            fontWeight: 900,
            letterSpacing: -4,
            marginTop: 40,
            opacity: a,
            transform: `translateY(${(1 - a) * 40}px)`,
          }}
        >
          saro.com.ar
        </div>
        <div style={{ fontSize: 36, color: '#CBD5E1', marginTop: 10, opacity: a }}>Paletas · Accesorios · Indumentaria</div>
        <div style={{ marginTop: 60 }}>
          <BotonWhatsApp escala={b} tamano={40} />
        </div>
      </div>
    </Estudio>
  )
}

// ---------- Composición ----------

const T = 14
const DUR = [100, 160, 130, 190, 160, 200, 120]
export const duracionWeb = () => duracionTotal(DUR, T)

const golpesWeb = () => {
  const ini = inicios(DUR, T)
  return [
    ...golpesBase(DUR, T, 2),
    { f: ini[3] + 70, sfx: 'click', vol: 0.35 }, // clic en la primera paleta
    { f: ini[5] + ENVIADO, sfx: 'ding', vol: 0.18 }, // mensaje enviado
    // Medios: los tres catálogos que se van marcando y los pasos de compra
    ...[30, 55, 80].map(f => ({ f: ini[2] + f, sfx: 'pop', vol: 0.1, nivel: 'medio' })),
    ...[0, 1, 2].map(i => ({ f: ini[5] + 20 + i * 28, sfx: 'pop', vol: 0.11, nivel: 'medio' })),
    // Intensos: el tipeo de la dirección y el de las teclas del mensaje
    ...Array.from({ length: 11 }, (_, i) => ({ f: 36 + i * 2.75, sfx: 'tick', vol: 0.09, nivel: 'intenso' })),
    ...Array.from({ length: 15 }, (_, i) => ({ f: ini[5] + 30 + i * 6, sfx: 'tick', vol: 0.06, nivel: 'intenso' })),
  ]
}

export const Web = ({ productos, musica, efectos, guia, totalPaletas = 0 }) => {
  const escenas = [
    <Apertura key="apertura" />,
    <Hero key="hero" />,
    <Catalogos key="catalogos" />,
    <Paletas key="paletas" totalPaletas={totalPaletas} />,
    <Movil key="movil" />,
    <Comprar key="comprar" productos={productos} />,
    <CierreWeb key="cierre" />,
  ]
  return (
    <Lienzo guia={guia}>
      <Musica id={musica} />
      <Efectos golpes={golpesWeb()} elegido={efectos} />
      <TransitionSeries>
        {escenas.map((escena, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <TransitionSeries.Transition
                presentation={i % 2 ? fade() : slide({ direction: 'from-right' })}
                timing={
                  i % 2
                    ? linearTiming({ durationInFrames: T })
                    : springTiming({ config: { damping: 200 }, durationInFrames: T })
                }
              />
            )}
            <TransitionSeries.Sequence durationInFrames={DUR[i]}>{escena}</TransitionSeries.Sequence>
          </Fragment>
        ))}
      </TransitionSeries>
    </Lienzo>
  )
}
