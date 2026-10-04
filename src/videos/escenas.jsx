import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import {
  BotonWhatsApp,
  Chip,
  Estudio,
  ImgProducto,
  Logo,
  PaletaFlotante,
  PrecioAnimado,
  SARO,
  clamp,
  pesos,
  sinSaro,
  useEntrada,
  useMarco,
} from './comun'
import { Paleta3D } from './Paleta3D'

// Escenas que comparten las plantillas verticales (9:16) y de feed (4:5).
// Todos los textos y precios van dentro de la zona segura (useMarco().S); fuera
// de ella sólo hay fotos o decoración. Cada escena exporta sus efectos de
// sonido en cuadros relativos a su inicio (golpes*), con el nivel desde el que suenan.

/** Tamaño de letra para que un texto de una línea entre en `ancho` (Inter negrita). */
export const letraQueEntra = (texto, ancho, maximo, factor = 0.6) =>
  Math.round(Math.min(maximo, ancho / Math.max(1, texto.length * factor)))

// ---------- Gancho: lo primero que se ve. Se lee desde el cuadro 0 ----------

export const Gancho3D = ({ etiqueta, gancho }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { W, H, S, vertical } = useMarco()
  // Entra girando rápido y frena de frente
  const giro = interpolate(frame, [0, 60], [-6.2, 0.3], { ...clamp, easing: Easing.out(Easing.cubic) })
  const golpe = spring({ frame, fps, config: { damping: 11, mass: 0.7 } })
  const escala = interpolate(golpe, [0, 1], [1.14, 1])
  const tam = gancho.length <= 18 ? 118 : gancho.length <= 30 ? 96 : 80
  const textoAlto = 60 + 70 + tam * (gancho.length <= 18 ? 1.1 : 2.15)
  const top3d = Math.round(S.y + textoAlto + 20)
  const alto3d = Math.round((vertical ? H : S.y + S.h) - top3d)
  return (
    <Estudio haloY={((top3d + alto3d / 2) / H) * 100}>
      <AbsoluteFill style={{ top: top3d, height: alto3d }}>
        <Paleta3D width={W} height={alto3d} giro={giro} distancia={vertical ? 11.5 : 10.5} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center' }}>
        <Logo ancho={200} style={{ margin: '0 auto', display: 'block' }} />
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: SARO.accent, marginTop: 26 }}>{etiqueta}</div>
        <div
          style={{
            fontSize: tam,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1.02,
            marginTop: 14,
            transform: `scale(${escala})`,
            textWrap: 'balance',
          }}
        >
          {gancho}
        </div>
      </div>
    </Estudio>
  )
}

export const golpesGancho = () => [
  { f: 2, sfx: 'impacto', vol: 0.3 },
  { f: 1, sfx: 'swoosh', vol: 0.14, nivel: 'medio' },
  { f: 26, sfx: 'pelota', vol: 0.28, nivel: 'intenso' },
  { f: 48, sfx: 'pelota', vol: 0.22, nivel: 'intenso' },
]

// ---------- Un producto: foto + nombre, specs y precio ----------

// Cuadros (desde el inicio de la escena) en que entra cada cosa
const E = { nombre: 3, extras: 10, chips: 16, chipCada: 5, precio: 26 }

/**
 * `adelanto`: cuadros que la escena arranca "ya empezada" (para que el primer
 * cuadro del video no esté vacío cuando la escena abre el video).
 */
export const EscenaProducto = ({ producto: p, indice, adelanto = 0 }) => {
  const frame = useCurrentFrame() + adelanto
  const { fps } = useVideoConfig()
  const { H, S, vertical } = useMarco()
  const entra = d => spring({ frame: frame - d, fps, config: { damping: 200 } })
  const color = p.acento
  const nombre = sinSaro(p.nombre)
  const tit = entra(E.nombre)
  const sub = entra(E.extras)
  const precio = entra(E.precio)
  const extras = [p.enfoque, p.nivel].filter(Boolean)

  // Nombre: hasta 2 líneas. Estimación de las líneas para ubicar lo de abajo.
  const fNombre = nombre.length > 24 ? 62 : nombre.length > 16 ? 78 : 96
  const lineas = Math.min(2, Math.ceil((nombre.length * fNombre * 0.56) / S.w))
  const cabecera = 50
  const nombreTop = S.y + cabecera + 22
  const nombreAlto = lineas * fNombre * 1.04 + (extras.length ? 56 : 0)
  const cuerpoTop = Math.round(nombreTop + nombreAlto + 34)
  const cuerpoAlto = S.y + S.h - cuerpoTop
  const colFoto = Math.round(S.w * 0.52)
  const colDatos = S.w - colFoto - 28
  // En vertical la foto puede bajar a la franja que tapan las redes (es sólo imagen)
  const fotoAlto = cuerpoAlto + (vertical ? Math.round((H - S.y - S.h) * 0.4) : 0)
  const tamPrecio = letraQueEntra(pesos(p.precio), colDatos, 96, 0.6)
  const fondoTexto = nombre.split(' ')[0].toUpperCase()

  return (
    <Estudio color={color} haloY={((cuerpoTop + fotoAlto / 2) / H) * 100}>
      {/* Nombre gigante de fondo, en contorno, que se desliza */}
      <div
        style={{
          position: 'absolute',
          top: vertical ? S.y + S.h + 70 : cuerpoTop + 60,
          left: 0,
          whiteSpace: 'nowrap',
          fontSize: 300,
          fontWeight: 900,
          letterSpacing: -8,
          color: 'transparent',
          WebkitTextStroke: `3px ${color}40`,
          transform: `translateX(${interpolate(frame, [0, 200], [120, -320])}px)`,
        }}
      >
        {fondoTexto} {fondoTexto}
      </div>

      {/* Foto */}
      <div style={{ position: 'absolute', left: S.x, top: cuerpoTop, width: colFoto, height: fotoAlto }}>
        <PaletaFlotante producto={p} alto={fotoAlto} ancho={colFoto} delay={-adelanto} />
      </div>

      {/* Cabecera */}
      <div
        style={{
          position: 'absolute',
          top: S.y,
          left: S.x,
          width: S.w,
          height: cabecera,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, color: SARO.gris, letterSpacing: 4, opacity: tit }}>{indice}</div>
        {p.nuevo && (
          <div
            style={{
              padding: '8px 22px',
              borderRadius: 10,
              background: SARO.accent,
              color: SARO.dark,
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 4,
              opacity: tit,
            }}
          >
            NUEVO
          </div>
        )}
      </div>

      {/* Nombre y enfoque */}
      <div style={{ position: 'absolute', left: S.x, top: nombreTop, width: S.w }}>
        <div
          style={{
            fontSize: fNombre,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.04,
            maxHeight: fNombre * 1.04 * 2,
            overflow: 'hidden',
            opacity: tit,
            transform: `translateX(${(1 - tit) * -60}px)`,
          }}
        >
          {nombre}
        </div>
        {extras.length > 0 && (
          <div style={{ fontSize: 36, fontWeight: 600, color, marginTop: 12, opacity: sub }}>{extras.join(' · ')}</div>
        )}
      </div>

      {/* Specs y precio, a la derecha de la foto */}
      <div
        style={{
          position: 'absolute',
          left: S.x + colFoto + 28,
          top: cuerpoTop,
          width: colDatos,
          height: cuerpoAlto,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, paddingTop: 10 }}>
          {p.specs.slice(0, 6).map((s, i) => (
            <Chip key={s} texto={s} delay={E.chips + i * E.chipCada - adelanto} />
          ))}
        </div>
        <div style={{ opacity: precio, transform: `translateY(${(1 - precio) * 30}px)` }}>
          <div style={{ fontSize: 28, color: SARO.gris, fontWeight: 600, marginBottom: 4 }}>Precio al público</div>
          <PrecioAnimado valor={p.precio} delay={E.precio - adelanto} tamano={tamPrecio} />
          {p.promo && <div style={{ fontSize: 30, fontWeight: 800, color: SARO.accent, marginTop: 10 }}>{p.promo}</div>}
        </div>
      </div>
    </Estudio>
  )
}

/** Efectos de la escena de producto (relativos a su inicio). */
export const golpesProducto = (p, adelanto = 0) =>
  [
    { f: E.nombre, sfx: 'swoosh', vol: 0.13, nivel: 'medio' },
    ...p.specs.slice(0, 6).map((_, i) => ({ f: E.chips + i * E.chipCada, sfx: 'pop', vol: 0.11, nivel: 'medio' })),
    { f: E.precio + 24, sfx: 'ding', vol: 0.11, nivel: 'medio' },
    ...Array.from({ length: 8 }, (_, k) => ({ f: E.precio + k * 3, sfx: 'tick', vol: 0.07, nivel: 'intenso' })),
    ...(p.categoria === 'paleta' ? [{ f: 8, sfx: 'pelota', vol: 0.24, nivel: 'intenso' }] : []),
  ].map(g => ({ ...g, f: g.f - adelanto }))

// ---------- Fotos extra de un producto (Ficha) ----------

export const Galeria = ({ producto: p }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { S, H } = useMarco()
  const fotos = [p.imagen, ...p.extras].slice(0, 4)
  const tit = useEntrada(0)
  const n = fotos.length
  const ancho = Math.round(Math.min(S.w / Math.min(n, 2) - 30, n > 2 ? 440 : 520))
  const alto = Math.round(ancho * 1.25)
  const filas = n > 2 ? 2 : 1
  const altoGrilla = filas * alto + (filas - 1) * 30
  const top = S.y + 170 + Math.max(0, (S.h - 170 - 150 - altoGrilla) / 2)
  return (
    <Estudio color={p.acento} haloY={((top + altoGrilla / 2) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center', opacity: tit }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: SARO.accent }}>EN DETALLE</div>
        <div style={{ fontSize: letraQueEntra(sinSaro(p.nombre), S.w, 76, 0.58), fontWeight: 900, letterSpacing: -2, marginTop: 10 }}>
          {sinSaro(p.nombre)}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: S.x,
          top,
          width: S.w,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 30,
        }}
      >
        {fotos.map((src, i) => {
          const e = spring({ frame: frame - 4 - i * 6, fps, config: { damping: 15 } })
          const giro = (i % 2 ? 1 : -1) * 3
          return (
            <div
              key={src}
              style={{ opacity: Math.min(1, e * 1.5), transform: `translateY(${(1 - e) * 120}px) rotate(${giro * (1 - e * 0.6)}deg)` }}
            >
              <ImgProducto producto={{ ...p, imagen: src, recortada: i === 0 && p.recortada }} ancho={ancho} alto={alto} />
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: S.x, top: S.y + S.h - 110, width: S.w, textAlign: 'center' }}>
        <span style={{ fontSize: 76, fontWeight: 900, opacity: interpolate(frame, [20, 32], [0, 1], clamp) }}>{pesos(p.precio)}</span>
      </div>
    </Estudio>
  )
}

export const golpesGaleria = p => [
  ...[p.imagen, ...p.extras].slice(0, 4).map((_, i) => ({ f: 4 + i * 6, sfx: 'pop', vol: 0.12, nivel: 'medio' })),
  { f: 22, sfx: 'swoosh', vol: 0.12, nivel: 'intenso' },
]

// ---------- Toda la línea (grilla) ----------

/** Reparte los productos en `cuantas` filas parejas (5 → 3 + 2). */
const enFilas = (productos, cuantas) => {
  const porFila = Math.ceil(productos.length / cuantas)
  return Array.from({ length: cuantas }, (_, i) => productos.slice(i * porFila, (i + 1) * porFila)).filter(f => f.length)
}

export const Linea = ({ productos, eyebrow = 'TODA LA LÍNEA', titulo, subtitulo, conPrecio = true }) => {
  const frame = useCurrentFrame()
  const { S, H } = useMarco()
  const tit = useEntrada(0)
  const cabecera = subtitulo ? 250 : 190
  const textoCard = conPrecio ? 118 : 74
  const gap = 24
  // Medidas con 1, 2 o 3 filas: se queda con la que da las fotos más grandes
  const medir = cuantas => {
    const filas = enFilas(productos, cuantas)
    const porFila = Math.max(...filas.map(f => f.length))
    const altoFila = (S.h - cabecera - (filas.length - 1) * gap) / filas.length
    const ancho = Math.floor(Math.min((S.w - (porFila - 1) * 20) / porFila, (altoFila - textoCard) * 0.75))
    return { filas, altoFila, ancho }
  }
  const { filas, altoFila, ancho } = [1, 2, 3]
    .filter(c => c <= productos.length)
    .map(medir)
    .reduce((mejor, m) => (m.ancho > mejor.ancho ? m : mejor))
  const altoImg = Math.floor(Math.min(altoFila - textoCard, ancho / 0.62))
  const letra = ancho < 200 ? 22 : 26
  return (
    <Estudio haloY={((S.y + S.h * 0.6) / H) * 100}>
      <div style={{ position: 'absolute', left: S.x, top: S.y, width: S.w, textAlign: 'center', opacity: tit }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 10, color: SARO.accent }}>{eyebrow}</div>
        <div style={{ fontSize: letraQueEntra(titulo, S.w, 92, 0.55), fontWeight: 900, letterSpacing: -3, marginTop: 8 }}>{titulo}</div>
        {subtitulo && <div style={{ fontSize: 38, color: SARO.gris, marginTop: 6 }}>{subtitulo}</div>}
      </div>
      <div
        style={{
          position: 'absolute',
          left: S.x,
          top: S.y + cabecera,
          width: S.w,
          display: 'flex',
          flexDirection: 'column',
          gap,
        }}
      >
        {filas.map((fila, f) => (
          <div key={f} style={{ display: 'flex', justifyContent: 'center', gap: 20, height: altoFila }}>
            {fila.map((p, i) => {
              const n = f * filas[0].length + i
              const e = interpolate(frame, [6 + n * 4, 22 + n * 4], [0, 1], clamp)
              return (
                <div
                  key={p.id}
                  style={{ width: ancho, textAlign: 'center', opacity: e, transform: `translateY(${(1 - e) * 80}px)` }}
                >
                  <div style={{ height: altoImg, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <ImgProducto
                      producto={p}
                      ancho={ancho}
                      alto={p.recortada ? altoImg : Math.min(altoImg, Math.round((ancho * 4) / 3))}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: letra,
                      fontWeight: 700,
                      marginTop: 12,
                      lineHeight: 1.15,
                      maxHeight: letra * 1.15 * 2,
                      overflow: 'hidden',
                    }}
                  >
                    {sinSaro(p.nombre)}
                  </div>
                  {conPrecio && <div style={{ fontSize: letra + 4, fontWeight: 900, color: p.acento, marginTop: 4 }}>{pesos(p.precio)}</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Estudio>
  )
}

export const golpesLinea = productos =>
  productos.map((_, n) => ({ f: 8 + n * 4, sfx: 'pop', vol: 0.09, nivel: 'medio' }))

// ---------- Beneficios ----------

const Icono = ({ tipo }) => (
  <svg
    width={60}
    height={60}
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
    {tipo === 'estrella' && <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />}
    {tipo === 'caja' && <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Zm0 0 9 4.5 9-4.5M12 12v9" />}
  </svg>
)

export const BENEFICIOS_PUBLICO = [
  { titulo: 'Directo de fábrica', sub: '15 años haciendo pádel en Argentina', icono: 'fabrica' },
  { titulo: 'Envíos a todo el país', sub: 'Cotizá el envío en la web', icono: 'camion' },
  { titulo: 'Pedido simple', sub: 'Armás el carrito y lo cerrás por WhatsApp', icono: 'chat' },
]

const Beneficio = ({ titulo, sub, icono, delay, tam }) => {
  const e = useEntrada(delay)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 34, opacity: e, transform: `translateX(${(1 - e) * 80}px)` }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 34,
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
        <div style={{ fontSize: tam, fontWeight: 800, lineHeight: 1.1 }}>{titulo}</div>
        <div style={{ fontSize: 32, color: SARO.gris, marginTop: 6, lineHeight: 1.2 }}>{sub}</div>
      </div>
    </div>
  )
}

export const Beneficios = ({ eyebrow = 'POR QUÉ SARO', titulo = 'Calidad de fábrica,', resaltado = 'sin vueltas.', items = BENEFICIOS_PUBLICO }) => {
  const tit = useEntrada(0)
  const { S, H } = useMarco()
  const gap = items.length > 3 ? 38 : 56
  return (
    <Estudio haloY={((S.y + S.h * 0.3) / H) * 100}>
      <div
        style={{
          position: 'absolute',
          left: S.x + 20,
          top: S.y,
          width: S.w - 20,
          height: S.h,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 10, color: SARO.accent, opacity: tit }}>{eyebrow}</div>
        <div style={{ fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1.02, marginTop: 14, opacity: tit }}>
          {titulo}
          <br />
          <span style={{ color: '#93C5FD' }}>{resaltado}</span>
        </div>
        <div style={{ marginTop: items.length > 3 ? 64 : 90, display: 'flex', flexDirection: 'column', gap }}>
          {items.map((b, i) => (
            <Beneficio key={b.titulo} {...b} tam={items.length > 3 ? 46 : 52} delay={12 + i * 10} />
          ))}
        </div>
      </div>
    </Estudio>
  )
}

export const golpesBeneficios = (n = 3) =>
  Array.from({ length: n }, (_, i) => ({ f: 14 + i * 10, sfx: 'swoosh', vol: 0.1, nivel: 'medio' }))

// ---------- Cierre ----------

export const Cierre = ({ frase = 'Elegí la tuya en', ruta = '/paletas', boton, pie = 'Envíos a todo el país' }) => {
  const frame = useCurrentFrame()
  const { S, H } = useMarco()
  const a = useEntrada(0)
  const b = useEntrada(16, 10)
  const c = useEntrada(30)
  const pulso = 1 + Math.sin(frame / 5) * 0.025 * interpolate(frame, [30, 40], [0, 1], clamp)
  const url = `saro.com.ar${ruta}`
  return (
    <Estudio haloY={((S.y + S.h / 2) / H) * 100}>
      <div
        style={{
          position: 'absolute',
          left: S.x,
          top: S.y,
          width: S.w,
          height: S.h,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Logo ancho={460} opacity={a} />
        <div
          style={{
            fontSize: letraQueEntra(frase, S.w, 84, 0.56),
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1.08,
            marginTop: 70,
            opacity: a,
            transform: `translateY(${(1 - a) * 40}px)`,
          }}
        >
          {frase}
        </div>
        <div style={{ fontSize: letraQueEntra(url, S.w, 84, 0.56), fontWeight: 900, letterSpacing: -2, opacity: a }}>
          <span style={{ color: '#93C5FD' }}>saro.com.ar</span>
          <span style={{ color: SARO.gris }}>{ruta}</span>
        </div>
        <div style={{ marginTop: 80 }}>
          <BotonWhatsApp escala={b * pulso} texto={boton} />
        </div>
        {pie && <div style={{ marginTop: 50, fontSize: 32, color: SARO.gris, opacity: c }}>{pie}</div>}
      </div>
    </Estudio>
  )
}

export const golpesCierre = () => [{ f: 18, sfx: 'pop', vol: 0.14, nivel: 'medio' }]

/** Suma los efectos de cada escena con su inicio absoluto. */
export const enEscenas = (inicios, listas) =>
  listas.flatMap((lista, i) => (lista ?? []).map(g => ({ ...g, f: g.f + inicios[i] })))
