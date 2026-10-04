'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  CAMPOS_TEXTO,
  EFECTOS_DEFECTO,
  FONDOS_FOTO,
  FORMATOS,
  MUSICAS,
  NIVELES_EFECTOS,
  PLANTILLAS_META,
  plantillaMeta,
  problemaDelPedido,
} from '../../videos/catalogo'
import { armarLote, armarProps, seleccionInicial } from '../../videos/props'
import { textosDeFabrica } from '../../videos/textos'
import { avisosVideo, esElegible, fotoOriginal, precioPublico } from '../../utils/videoProductos'
import { recortarParaVideo } from '../../utils/recorteVideo'

// Remotion y las plantillas bajan recién al abrir esta pestaña
const VistaPreviaVideo = dynamic(() => import('./VistaPreviaVideo'), {
  ssr: false,
  loading: () => <div className="aspect-[9/16] rounded-2xl bg-gray-100 animate-pulse" />,
})

const CLAVE_HISTORIAL = 'saro_videos_historial'
const EN_CURSO = ['en_cola', 'renderizando']
const CADA_MS = 10_000
const SIN_ARRANCAR_MIN = 5 // si GitHub no lo tomó en este tiempo, se da por perdido
const LIMITE_MIN = 50 // el workflow corta a los 40; esto es por si GitHub ni avisa
const FALLOS_MAX = 6 // consultas fallidas seguidas (un minuto) antes de darlo por perdido

const CATEGORIAS = { paleta: 'Paletas', padel: 'Accesorios', ropa: 'Ropa' }
const ESTADOS = {
  en_cola: { texto: 'En cola', clase: 'bg-amber-50 text-amber-700 border-amber-200' },
  renderizando: { texto: 'Generando…', clase: 'bg-saro-light text-saro-blue border-blue-200' },
  listo: { texto: 'Listo', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  error: { texto: 'Error', clase: 'bg-red-50 text-red-600 border-red-200' },
}

const pin = () => sessionStorage.getItem('saro_admin_pin') ?? ''
const pesos = n => `$${Number(n).toLocaleString('es-AR')}`
const megas = b => `${(b / 1024 / 1024).toFixed(1)} MB`
const hora = t => new Date(t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

function Thumb({ p }) {
  const src = fotoOriginal(p)
  return (
    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{p.emoji}</span>}
    </div>
  )
}

/** Textos que propone Gemini: 3 opciones para usar con un clic, la publicación y avisos. */
function Sugerencias({ datos, campos, onUsar, onCopiar }) {
  if (!datos || datos.cargando) return null
  if (datos.error) return <p className="text-xs text-red-600">❌ {datos.error}</p>
  return (
    <div className="rounded-xl border border-blue-100 bg-saro-light/60 p-3 space-y-2.5">
      {datos.opciones?.length === 0 && <p className="text-xs text-gray-500">Gemini no propuso textos que respeten los límites. Probá de nuevo.</p>}
      {datos.opciones?.map((o, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg bg-white border border-gray-100 p-2.5">
          <div className="flex-1 min-w-0 text-xs space-y-0.5">
            {campos.map(c => (
              <p key={c}>
                <span className="text-gray-400">{CAMPOS_TEXTO[c].nombre}:</span> <span className="font-semibold text-gray-800">{o[c]}</span>
              </p>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onUsar(o)}
            className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-saro-blue hover:bg-saro-mid text-white text-[11px] font-bold transition"
          >
            Usar
          </button>
        </div>
      ))}
      {datos.publicacion && (
        <div className="rounded-lg bg-white border border-gray-100 p-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-gray-500">Texto para la publicación</span>
            <button type="button" onClick={() => onCopiar(datos.publicacion)} className="text-[11px] font-bold text-saro-blue hover:underline">
              Copiar
            </button>
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-line">{datos.publicacion}</p>
        </div>
      )}
      {datos.avisos?.map(a => (
        <p key={a} className="text-[11px] text-amber-800">
          ⚠️ {a}
        </p>
      ))}
      <p className="text-[10px] text-gray-400">Lo propone Gemini con los datos de los productos. Revisalo antes de publicar.</p>
    </div>
  )
}

const VEREDICTOS = {
  listo: { texto: '✅ Listo para publicar', clase: 'text-emerald-700' },
  mejorable: { texto: '🟡 Se puede mejorar', clase: 'text-amber-700' },
  corregir: { texto: '🔴 Conviene corregir', clase: 'text-red-600' },
}

/** Lo que vio Gemini en el MP4: veredicto, problemas con su segundo y textos mejores. */
function Revision({ rev, titulo, onAplicar, onRepetir }) {
  const v = VEREDICTOS[rev.veredicto] ?? VEREDICTOS.mejorable
  const hayTextos = rev.textos && Object.keys(rev.textos).length > 0
  return (
    <div className="mt-1 rounded-xl border border-gray-100 bg-gray-50 p-2.5 space-y-1.5">
      <p className={`font-bold ${v.clase}`}>
        {v.texto}
        {titulo && <span className="font-normal text-gray-400"> · {titulo}</span>}
      </p>
      {rev.resumen && <p className="text-gray-600 leading-snug">{rev.resumen}</p>}
      {rev.problemas?.length > 0 && (
        <ul className="space-y-1.5">
          {rev.problemas.map((p, i) => (
            <li key={i} className="leading-snug">
              <span className="font-bold text-gray-700">
                {p.segundo != null ? `${p.segundo}s` : '•'}
                {p.tipo ? ` · ${p.tipo}` : ''}:
              </span>{' '}
              <span className="text-gray-600">{p.detalle}</span>
              {p.sugerencia && <span className="block text-saro-blue">→ {p.sugerencia}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {hayTextos && (
          <button
            type="button"
            onClick={onAplicar}
            className="px-2.5 py-1 rounded-lg bg-saro-blue hover:bg-saro-mid text-white text-[11px] font-bold transition"
            title={Object.values(rev.textos).join(' · ')}
          >
            Aplicar textos sugeridos
          </button>
        )}
        <button type="button" onClick={onRepetir} className="text-[11px] text-gray-400 hover:text-saro-blue underline">
          Revisar de nuevo
        </button>
      </div>
      <p className="text-[10px] text-gray-400">Es la opinión de Gemini: puede equivocarse. Lo de diseño fijo (zona segura, precio que cuenta) no se toca desde acá.</p>
    </div>
  )
}

/** Pide a la API el estado de un render y devuelve los campos a actualizar. */
async function consultarEstado(h) {
  const minutos = (Date.now() - h.creado) / 60_000
  try {
    const res = await fetch(`/api/videos/estado?request_id=${encodeURIComponent(h.requestId)}`, {
      headers: { 'x-admin-pin': pin() },
      cache: 'no-store',
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 401) return { estado: 'error', mensaje: 'La sesión venció: salí y volvé a entrar con el PIN.' }
    if (!res.ok) {
      // Un error pasajero se reintenta; si falla un minuto seguido, se deja de consultar
      const fallos = (h.fallos ?? 0) + 1
      if (fallos >= FALLOS_MAX) return { estado: 'error', mensaje: json.error ?? `Error ${res.status}`, fallos }
      return { detalle: `No se pudo consultar (${json.error ?? res.status}). Reintento en 10 s.`, fallos }
    }
    if (json.estado === 'en_cola' && !json.encontrado && minutos > SIN_ARRANCAR_MIN) {
      return { estado: 'error', mensaje: 'GitHub no arrancó el render. Probá generarlo de nuevo.' }
    }
    if (EN_CURSO.includes(json.estado) && minutos > LIMITE_MIN) {
      return { estado: 'error', mensaje: `Pasaron más de ${LIMITE_MIN} minutos sin terminar.`, logUrl: json.logUrl }
    }
    return { estado: json.estado, detalle: json.detalle, mensaje: json.mensaje, logUrl: json.logUrl, bytes: json.bytes, fallos: 0 }
  } catch {
    return { detalle: 'Sin conexión. Reintento en 10 s.' }
  }
}

/**
 * Pestaña "🎬 Videos": elegir plantilla, productos y música, ver la vista
 * previa y generar el MP4 (lo renderiza una GitHub Action, ver CLAUDE.md §8).
 */
export default function VideosPanel({ products, onUpdateProduct, onToast }) {
  const [plantillaId, setPlantillaId] = useState(PLANTILLAS_META[0].id)
  const [selecciones, setSelecciones] = useState({}) // { [plantilla]: ids en orden }
  const [musicas, setMusicas] = useState({}) // { [plantilla]: id de música }
  const [formatos, setFormatos] = useState({}) // { [plantilla]: id de formato }
  const [textos, setTextos] = useState({}) // { [plantilla]: { campo: texto } }
  const [efectos, setEfectos] = useState(EFECTOS_DEFECTO)
  const [fondo, setFondo] = useState('sin')
  const [recortandoTodas, setRecortandoTodas] = useState(null) // "2 de 5", mientras recorta las que faltan
  const [enLote, setEnLote] = useState(false) // Ficha: una por producto
  const [verLote, setVerLote] = useState(0) // cuál ficha del lote se ve en la vista previa
  const [guia, setGuia] = useState(false)
  const [sugerencias, setSugerencias] = useState({}) // { [plantilla]: { cargando } | { error } | { opciones, publicacion, avisos } }
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [preparando, setPreparando] = useState(null) // { id, texto }
  const [historial, setHistorial] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [errorRender, setErrorRender] = useState(null) // { mensaje, codigo }

  const meta = plantillaMeta(plantillaId)
  const musica = musicas[plantillaId] ?? meta.musica
  const formato = formatos[plantillaId] ?? meta.formatos[0]
  const textosPropios = textos[plantillaId] ?? {}
  const lote = enLote && !!meta.lote
  const maximo = lote ? meta.lote : meta.max

  // Sólo cuentan los que siguen siendo elegibles (si le sacaste el precio a uno, sale solo)
  const ids = useMemo(() => {
    const elegibles = new Set(
      products.filter(p => esElegible(p) && (!meta.soloPaletas || p.categoria === 'paleta')).map(p => p.id),
    )
    const elegidos = selecciones[plantillaId] ?? seleccionInicial(meta, products).map(p => p.id)
    return elegidos.filter(id => elegibles.has(id)).slice(0, maximo)
  }, [selecciones, plantillaId, meta, products, maximo])

  // Lo que se manda a generar (un video, o un lote de fichas) y lo que se ve
  const pedido = useMemo(() => {
    const opciones = { musica, efectos, formato, textos: textosPropios, fondo }
    return lote ? armarLote(meta, products, ids, opciones) : armarProps(meta, products, ids, opciones)
  }, [meta, products, ids, musica, efectos, formato, textosPropios, lote, fondo])
  // Elegidos que todavía no tienen la foto recortada (con "Sin fondo" salen en tarjeta)
  const sinRecorte = ids.map(id => products.find(p => p.id === id)).filter(p => p && !p.imagenVideo)
  const props = lote ? pedido.lote[Math.min(verLote, pedido.lote.length - 1)] ?? { productos: [] } : pedido
  const fabrica = textosDeFabrica(meta.id, props.productos)
  const problema = problemaDelPedido(meta, pedido)
  const hayEnCurso = historial.some(h => EN_CURSO.includes(h.estado))

  // ── Historial (sessionStorage, como la pestaña activa) ──
  useEffect(() => {
    try {
      setHistorial(JSON.parse(sessionStorage.getItem(CLAVE_HISTORIAL) ?? '[]'))
    } catch {}
  }, [])

  const guardarHistorial = cambio =>
    setHistorial(h => {
      const nuevo = cambio(h).slice(0, 10)
      try {
        sessionStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(nuevo))
      } catch {}
      return nuevo
    })

  // Mientras haya un render en curso, se consulta cada 10 s
  const historialRef = useRef(historial)
  historialRef.current = historial
  useEffect(() => {
    if (!hayEnCurso) return
    let vivo = true
    let ocupado = false // si una consulta tarda más de 10 s, no se le encima la siguiente
    const consultar = async () => {
      if (ocupado) return
      ocupado = true
      const pendientes = historialRef.current.filter(x => EN_CURSO.includes(x.estado))
      for (const h of pendientes) {
        const cambios = await consultarEstado(h)
        if (!vivo) break
        guardarHistorial(lista => lista.map(x => (x.requestId === h.requestId ? { ...x, ...cambios } : x)))
      }
      ocupado = false
    }
    consultar()
    const t = setInterval(consultar, CADA_MS)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [hayEnCurso])

  // ── Productos ──
  const visibles = products.filter(p => p.visible !== false && (!meta.soloPaletas || p.categoria === 'paleta'))
  const categorias = [...new Set(visibles.map(p => p.categoria))].filter(Boolean)
  const q = busqueda.trim().toLowerCase()
  const lista = visibles
    .filter(p => (categoria === 'todas' || p.categoria === categoria) && (!q || p.nombre.toLowerCase().includes(q)))
    .sort((a, b) => Number(esElegible(b)) - Number(esElegible(a)))

  const alternar = p => {
    if (!esElegible(p)) return
    if (ids.includes(p.id)) {
      setSelecciones(s => ({ ...s, [plantillaId]: ids.filter(x => x !== p.id) }))
    } else if (maximo === 1) {
      setSelecciones(s => ({ ...s, [plantillaId]: [p.id] }))
    } else if (ids.length >= maximo) {
      onToast(`${lote ? 'El lote' : meta.nombre} usa hasta ${maximo} productos. Sacá uno para sumar otro.`, 'error')
    } else {
      setSelecciones(s => ({ ...s, [plantillaId]: [...ids, p.id] }))
    }
  }

  /** Recorta el fondo de la foto y la guarda en el producto. Devuelve true si salió. */
  const prepararFoto = async (p, { avisar = true } = {}) => {
    setPreparando({ id: p.id, texto: 'Empezando…' })
    try {
      const { base64, ext } = await recortarParaVideo(fotoOriginal(p), texto => setPreparando({ id: p.id, texto }))
      setPreparando({ id: p.id, texto: 'Subiendo…' })
      const slug = p.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto'
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `video-${slug}-${Date.now()}.${ext}`, data: base64, pin: pin() }),
      })
      const json = await res.json().catch(() => ({}))
      const url = json.rawUrl ?? json.path
      if (!res.ok || !url) throw new Error(json.error ?? `No se pudo subir la foto (error ${res.status})`)
      await onUpdateProduct(p.id, { imagenVideo: url, imagenVideoOrigen: fotoOriginal(p) })
      if (avisar) onToast('✅ Foto lista para video. Tocá "Publicar en sitio" para que quede guardada.', 'ok', 7000)
      return true
    } catch (e) {
      onToast(`❌ ${p.nombre}: ${e?.message ?? 'No se pudo preparar la foto'}`, 'error', 8000)
      return false
    } finally {
      setPreparando(null)
    }
  }

  // De a una (el recorte usa mucha memoria del navegador)
  const prepararFaltantes = async () => {
    const lista = [...sinRecorte]
    let listas = 0
    for (const [i, p] of lista.entries()) {
      setRecortandoTodas(`${i + 1} de ${lista.length}`)
      if (await prepararFoto(p, { avisar: false })) listas++
    }
    setRecortandoTodas(null)
    if (listas) onToast(`✅ ${listas} foto(s) listas para video. Tocá "Publicar en sitio" para que queden guardadas.`, 'ok', 8000)
  }

  // ── Render ──
  const generar = async () => {
    if (problema) {
      setErrorRender({ mensaje: problema })
      return
    }
    setEnviando(true)
    setErrorRender(null)
    try {
      const res = await fetch('/api/videos/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin(), plantilla: plantillaId, props: pedido }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setErrorRender({ mensaje: json.error ?? `Error ${res.status}`, codigo: json.codigo })
        return
      }
      guardarHistorial(h => [
        {
          requestId: json.requestId,
          plantilla: lote ? `${meta.nombre} ×${pedido.lote.length}` : meta.nombre,
          productos: (lote ? pedido.lote.map(x => x.productos[0]) : props.productos).map(p => p.nombre).join(', '),
          nombres: lote ? pedido.lote.map(x => x.productos[0].nombre) : null,
          // Para "Revisar con IA": con qué plantilla y props se hizo cada video
          plantillaId,
          videos: lote ? pedido.lote : [pedido],
          creado: Date.now(),
          estado: 'en_cola',
          detalle: 'Pedido enviado a GitHub',
        },
        ...h,
      ])
    } catch {
      setErrorRender({ mensaje: 'Error de conexión. Probá de nuevo.' })
    } finally {
      setEnviando(false)
    }
  }

  // ── Gemini: guiar (sugerir textos) y corregir (revisar el MP4) ──
  const sugerir = async () => {
    setSugerencias(s => ({ ...s, [plantillaId]: { cargando: true } }))
    try {
      const res = await fetch('/api/videos/sugerir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin(), plantilla: plantillaId, props }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) throw new Error(json.error ?? `Error ${res.status}`)
      setSugerencias(s => ({ ...s, [plantillaId]: json }))
    } catch (e) {
      setSugerencias(s => ({ ...s, [plantillaId]: { error: e.message } }))
    }
  }

  const aplicarTextos = (id, nuevos) => {
    setTextos(t => ({ ...t, [id]: { ...(t[id] ?? {}), ...nuevos } }))
    if (id !== plantillaId) setPlantillaId(id)
    onToast('✍️ Textos aplicados: mirá la vista previa y generá de nuevo.', 'ok', 6000)
  }

  const copiar = async texto => {
    try {
      await navigator.clipboard.writeText(texto)
      onToast('📋 Copiado', 'ok', 2500)
    } catch {
      onToast('No se pudo copiar: seleccioná el texto a mano.', 'error')
    }
  }

  // n = número de video dentro del pedido (1 si no es un lote)
  const revisar = async (h, n = 1) => {
    const cambiar = rev => guardarHistorial(l => l.map(x => (x.requestId === h.requestId ? { ...x, revisiones: { ...x.revisiones, [n]: rev } } : x)))
    cambiar({ cargando: true })
    try {
      const res = await fetch('/api/videos/revisar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin(), plantilla: h.plantillaId, request_id: h.requestId, n, props: h.videos[n - 1] }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) throw new Error(json.error ?? `Error ${res.status}`)
      cambiar(json)
    } catch (e) {
      cambiar({ error: e.message })
    }
  }

  const descargar = async (h, n) => {
    try {
      const res = await fetch(`/api/videos/descargar?request_id=${encodeURIComponent(h.requestId)}${n ? `&n=${n}` : ''}`, {
        headers: { 'x-admin-pin': pin() },
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(json.error ?? `Error ${res.status}`)
      window.location.href = json.url
    } catch (e) {
      onToast(`❌ ${e.message}`, 'error', 7000)
    }
  }

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
      <div className="space-y-5 min-w-0">
        {/* Plantilla y música */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
          <h2 className="text-lg font-extrabold text-saro-dark tracking-tight">🎬 Videos de productos</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Elegí una plantilla y los productos. La vista previa se actualiza sola; cuando te guste, tocá{' '}
            <strong>"Generar MP4"</strong> y en unos minutos lo descargás. Los precios son los del público.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 mt-5">
            {PLANTILLAS_META.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPlantillaId(t.id)}
                aria-pressed={t.id === plantillaId}
                className={`text-left rounded-xl border-2 p-3.5 transition ${
                  t.id === plantillaId ? 'border-saro-blue bg-saro-light' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <p className="font-bold text-sm text-saro-dark">{t.nombre}</p>
                <p className="text-[11px] font-semibold text-saro-blue mt-0.5">
                  {t.formatos.map(f => FORMATOS[f].nombre.split(' ').pop()).join(' / ')} ·{' '}
                  {t.min === t.max ? `${t.max} producto` : `${t.min}–${t.max} productos`}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{t.descripcion}</p>
              </button>
            ))}
          </div>

          {/* Formato */}
          {meta.formatos.length > 1 && (
            <div className="mt-5">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Formato</span>
              <div className="flex flex-wrap gap-2">
                {meta.formatos.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFormatos(f => ({ ...f, [plantillaId]: id }))}
                    aria-pressed={formato === id}
                    className={`px-3.5 py-2 rounded-xl border-2 text-left transition ${
                      formato === id ? 'border-saro-blue bg-saro-light' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="block text-sm font-bold text-saro-dark">{FORMATOS[id].nombre}</span>
                    <span className="block text-[11px] text-gray-500">{FORMATOS[id].uso}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            <label className="block">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Música</span>
              <select
                value={musica}
                onChange={e => setMusicas(m => ({ ...m, [plantillaId]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue"
              >
                {MUSICAS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {m.animo ? ` · ${m.animo}` : ''}
                    {m.id === meta.musica ? ' (recomendada)' : ''}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] text-gray-400 mt-1">
                {MUSICAS.find(m => m.id === musica)?.bpm
                  ? 'Los cambios de escena caen sobre el ritmo.'
                  : 'Sin música, las escenas duran lo de siempre.'}
              </span>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Efectos de sonido</span>
              <select
                value={efectos}
                onChange={e => setEfectos(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue"
              >
                {NIVELES_EFECTOS.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.nombre}
                  </option>
                ))}
              </select>
              <span className="block text-[11px] text-gray-400 mt-1">{NIVELES_EFECTOS.find(n => n.id === efectos)?.detalle}</span>
            </label>
          </div>

          {/* Fondo de las fotos de producto */}
          <div className="mt-5">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Fotos de producto</span>
            <div className="flex flex-wrap gap-2">
              {FONDOS_FOTO.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFondo(f.id)}
                  aria-pressed={fondo === f.id}
                  className={`px-3.5 py-2 rounded-xl border-2 text-left transition ${
                    fondo === f.id ? 'border-saro-blue bg-saro-light' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="block text-sm font-bold text-saro-dark">{f.nombre}</span>
                  <span className="block text-[11px] text-gray-500">{f.detalle}</span>
                </button>
              ))}
            </div>
            {fondo === 'sin' && sinRecorte.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-800">
                <span className="flex-1 min-w-[12rem]">
                  {sinRecorte.length === 1 ? '1 producto elegido no tiene' : `${sinRecorte.length} productos elegidos no tienen`} la
                  foto recortada: {sinRecorte.length === 1 ? 'sale' : 'salen'} con fondo blanco igual.
                </span>
                <button
                  type="button"
                  onClick={prepararFaltantes}
                  disabled={!!preparando || !!recortandoTodas}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition disabled:opacity-50"
                >
                  {recortandoTodas ? `Recortando ${recortandoTodas}…` : 'Recortar las que faltan'}
                </button>
              </div>
            )}
          </div>

          {/* Textos editables */}
          {meta.textos.length > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Textos <span className="normal-case font-normal text-gray-400">(vacío = el de fábrica, en gris)</span>
                </span>
                <button
                  type="button"
                  onClick={sugerir}
                  disabled={!!problemaDelPedido(meta, props) || sugerencias[plantillaId]?.cargando}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-saro-blue text-saro-blue text-xs font-bold hover:bg-saro-light transition disabled:opacity-50"
                >
                  {sugerencias[plantillaId]?.cargando ? 'Pensando…' : '✨ Sugerir con IA'}
                </button>
              </div>
              <Sugerencias
                datos={sugerencias[plantillaId]}
                campos={meta.textos}
                onUsar={o => aplicarTextos(plantillaId, o)}
                onCopiar={copiar}
              />
              {meta.textos.map(campo => {
                const def = CAMPOS_TEXTO[campo]
                const valor = textosPropios[campo] ?? ''
                return (
                  <label key={campo} className="block">
                    <span className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                      {def.nombre}
                      <span className={`font-normal ${valor.length > def.max - 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {valor.length}/{def.max}
                      </span>
                    </span>
                    <input
                      type="text"
                      value={valor}
                      maxLength={def.max}
                      placeholder={fabrica[campo] ?? ''}
                      onChange={e =>
                        setTextos(t => ({ ...t, [plantillaId]: { ...(t[plantillaId] ?? {}), [campo]: e.target.value.replace(/\s+/g, ' ') } }))
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue placeholder:text-gray-400"
                    />
                    <span className="block text-[11px] text-gray-400 mt-0.5">{def.ayuda}</span>
                  </label>
                )
              })}
            </div>
          )}

          {/* Lote: una Ficha por producto */}
          {meta.lote && (
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-gray-100 p-3.5 cursor-pointer hover:border-gray-200">
              <input
                type="checkbox"
                checked={enLote}
                onChange={e => {
                  setEnLote(e.target.checked)
                  setVerLote(0)
                }}
                className="w-4 h-4 mt-0.5 accent-saro-blue flex-shrink-0"
              />
              <span>
                <span className="block text-sm font-bold text-saro-dark">Una ficha por producto (lote)</span>
                <span className="block text-[11px] text-gray-500 leading-snug">
                  Elegí hasta {meta.lote} productos y se genera un MP4 de cada uno, con la misma música, efectos y textos.
                </span>
              </span>
            </label>
          )}
        </div>

        {/* Productos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold text-saro-dark">
                Productos{' '}
                <span className="text-saro-blue">
                  ({ids.length}/{maximo})
                </span>
              </h3>
              {meta.soloPaletas && <p className="text-[11px] text-gray-400">Esta plantilla es sólo de paletas</p>}
            </div>
            <input
              type="search"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre…"
              aria-label="Buscar producto"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue"
            />
            {categorias.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {['todas', ...categorias].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategoria(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      categoria === c
                        ? 'bg-saro-blue border-saro-blue text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
                    }`}
                  >
                    {c === 'todas' ? 'Todas' : CATEGORIAS[c] ?? c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="divide-y divide-gray-50 max-h-[34rem] overflow-y-auto">
            {lista.map(p => {
              const elegible = esElegible(p)
              const elegido = ids.includes(p.id)
              const avisos = avisosVideo(p)
              const esteSePrepara = preparando?.id === p.id
              return (
                <li key={p.id} className={`px-5 py-3 flex items-center gap-3 ${elegible ? '' : 'opacity-60'}`}>
                  <input
                    type="checkbox"
                    checked={elegido}
                    disabled={!elegible}
                    onChange={() => alternar(p)}
                    aria-label={`Usar ${p.nombre} en el video`}
                    className="w-4 h-4 accent-saro-blue flex-shrink-0"
                  />
                  <Thumb p={p} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {elegido && <span className="text-saro-blue">{ids.indexOf(p.id) + 1}. </span>}
                      {p.nombre}
                    </p>
                    <p className="text-xs font-bold text-saro-blue">
                      {precioPublico(p) > 0 ? pesos(precioPublico(p)) : <span className="text-amber-600">sin precio minorista</span>}
                      {p.imagenVideo && <span className="ml-2 font-semibold text-emerald-600">✂️ foto recortada</span>}
                    </p>
                    {avisos.map(a => (
                      <p key={a.texto} className={`text-[11px] ${a.bloquea ? 'text-red-500' : 'text-amber-700'}`}>
                        ⚠️ {a.texto}
                      </p>
                    ))}
                  </div>
                  {fotoOriginal(p) && (
                    <button
                      type="button"
                      onClick={() => prepararFoto(p)}
                      disabled={!!preparando}
                      className="flex-shrink-0 max-w-[9.5rem] px-3 py-2 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-600 hover:border-saro-blue hover:text-saro-blue transition disabled:opacity-50"
                    >
                      {esteSePrepara ? preparando.texto : p.imagenVideo ? 'Rehacer foto para video' : 'Preparar foto para video'}
                    </button>
                  )}
                </li>
              )
            })}
            {lista.length === 0 && <li className="px-5 py-8 text-center text-sm text-gray-400">No hay productos con ese filtro.</li>}
          </ul>
        </div>
      </div>

      {/* Vista previa y render */}
      <aside className="space-y-5 lg:sticky lg:top-20">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {lote && pedido.lote.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {pedido.lote.map((x, i) => (
                <button
                  key={x.productos[0].id}
                  type="button"
                  onClick={() => setVerLote(i)}
                  title={x.productos[0].nombre}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    i === Math.min(verLote, pedido.lote.length - 1)
                      ? 'bg-saro-blue border-saro-blue text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
                  }`}
                >
                  Ficha {i + 1}
                </button>
              ))}
            </div>
          )}
          {props.productos.length > 0 ? (
            <VistaPreviaVideo plantillaId={plantillaId} props={guia ? { ...props, guia: true } : props} />
          ) : (
            <div
              className="rounded-2xl bg-gray-50 flex items-center justify-center text-center text-sm text-gray-400 p-6"
              style={{ aspectRatio: `${FORMATOS[formato].ancho} / ${FORMATOS[formato].alto}` }}
            >
              Elegí al menos {meta.min > 1 ? `${meta.min} productos` : 'un producto'} para ver la vista previa.
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            {FORMATOS[formato].nombre} · {FORMATOS[formato].ancho}×{FORMATOS[formato].alto}
          </p>
          {formato !== 'horizontal' && (
            <label className="mt-2 flex items-center justify-center gap-2 text-[11px] text-gray-500 cursor-pointer">
              <input type="checkbox" checked={guia} onChange={e => setGuia(e.target.checked)} className="accent-saro-blue" />
              Mostrar lo que tapan Instagram y TikTok (no sale en el MP4)
            </label>
          )}

          <button
            type="button"
            onClick={generar}
            disabled={enviando || hayEnCurso || !!problema}
            className="mt-3 w-full py-3 rounded-xl bg-saro-blue hover:bg-saro-mid text-white text-sm font-bold transition btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando
              ? 'Enviando…'
              : hayEnCurso
                ? 'Hay un video generándose…'
                : lote
                  ? `🎞️ Generar ${pedido.lote.length} MP4`
                  : '🎞️ Generar MP4'}
          </button>
          {problema && props.productos.length > 0 && <p className="mt-2 text-xs text-amber-700">{problema}</p>}
          {errorRender && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700 leading-relaxed">
              <p className="font-bold">No se pudo generar</p>
              <p className="mt-0.5">{errorRender.mensaje}</p>
            </div>
          )}
          <p className="mt-3 text-[11px] text-gray-400 leading-relaxed">
            El MP4 lo arma GitHub en unos minutos (podés seguir usando el admin). Queda disponible para descargar; se
            guardan los últimos 40.
          </p>
        </div>

        {historial.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-bold text-saro-dark text-sm">Videos de esta sesión</h3>
            </div>
            <ul className="divide-y divide-gray-50">
              {historial.map(h => {
                const e = ESTADOS[h.estado] ?? ESTADOS.en_cola
                return (
                  <li key={h.requestId} className="px-4 py-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-gray-800">
                        {h.plantilla} <span className="font-normal text-gray-400">· {hora(h.creado)}</span>
                      </p>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${e.clase}`}>{e.texto}</span>
                    </div>
                    <p className="text-gray-500 truncate" title={h.productos}>
                      {h.productos}
                    </p>
                    {EN_CURSO.includes(h.estado) && h.detalle && <p className="text-gray-400">{h.detalle}</p>}
                    {h.estado === 'error' && <p className="text-red-600">{h.mensaje}</p>}
                    {h.estado === 'listo' && h.nombres && (
                      <div className="flex flex-wrap gap-1.5">
                        {h.nombres.map((nombre, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => descargar(h, i + 1)}
                            title={nombre}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition btn-press max-w-[10rem] truncate"
                          >
                            ⬇ {nombre}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      {h.estado === 'listo' && !h.nombres && (
                        <button
                          type="button"
                          onClick={() => descargar(h)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition btn-press"
                        >
                          ⬇ Descargar MP4{h.bytes ? ` (${megas(h.bytes)})` : ''}
                        </button>
                      )}
                      {h.logUrl && (
                        <a href={h.logUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-saro-blue underline">
                          Ver el log
                        </a>
                      )}
                    </div>
                    {/* Revisión con Gemini (los videos de antes de esta versión no guardaron sus datos) */}
                    {h.estado === 'listo' &&
                      h.videos?.map((_, i) => {
                        const n = i + 1
                        const rev = h.revisiones?.[n]
                        return (
                          <div key={n} className="pt-1">
                            {!rev?.veredicto && (
                              <button
                                type="button"
                                onClick={() => revisar(h, n)}
                                disabled={rev?.cargando}
                                className="px-2.5 py-1.5 rounded-lg border border-saro-blue text-saro-blue font-bold hover:bg-saro-light transition disabled:opacity-60"
                              >
                                {rev?.cargando
                                  ? 'Gemini está mirando el video… (≈30 s)'
                                  : `🔍 Revisar con IA${h.videos.length > 1 ? ` · ${h.nombres?.[i] ?? `ficha ${n}`}` : ''}`}
                              </button>
                            )}
                            {rev?.error && <p className="text-red-600 mt-1">{rev.error}</p>}
                            {rev?.veredicto && (
                              <Revision
                                rev={rev}
                                titulo={h.videos.length > 1 ? h.nombres?.[i] : null}
                                onAplicar={() => aplicarTextos(h.plantillaId, rev.textos)}
                                onRepetir={() => revisar(h, n)}
                              />
                            )}
                          </div>
                        )
                      })}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
