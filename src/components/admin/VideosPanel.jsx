'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { MUSICAS, PLANTILLAS_META, plantillaMeta, problemaDelPedido } from '../../videos/catalogo'
import { armarProps, seleccionInicial } from '../../videos/props'
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
const LIMITE_MIN = 40 // el workflow corta a los 30; esto es por si GitHub ni avisa

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
      // Un error pasajero se reintenta; si sigue fallando, se deja de consultar
      if (minutos > SIN_ARRANCAR_MIN) return { estado: 'error', mensaje: json.error ?? `Error ${res.status}` }
      return { detalle: `No se pudo consultar (${json.error ?? res.status}). Reintento en 10 s.` }
    }
    if (json.estado === 'en_cola' && !json.encontrado && minutos > SIN_ARRANCAR_MIN) {
      return { estado: 'error', mensaje: 'GitHub no arrancó el render. Probá generarlo de nuevo.' }
    }
    if (EN_CURSO.includes(json.estado) && minutos > LIMITE_MIN) {
      return { estado: 'error', mensaje: `Pasaron más de ${LIMITE_MIN} minutos sin terminar.`, logUrl: json.logUrl }
    }
    return { estado: json.estado, detalle: json.detalle, mensaje: json.mensaje, logUrl: json.logUrl, bytes: json.bytes }
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
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [preparando, setPreparando] = useState(null) // { id, texto }
  const [historial, setHistorial] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [errorRender, setErrorRender] = useState(null) // { mensaje, codigo }

  const meta = plantillaMeta(plantillaId)
  const musica = musicas[plantillaId] ?? meta.musica

  // Sólo cuentan los que siguen siendo elegibles (si le sacaste el precio a uno, sale solo)
  const ids = useMemo(() => {
    const elegibles = new Set(
      products.filter(p => esElegible(p) && (!meta.soloPaletas || p.categoria === 'paleta')).map(p => p.id),
    )
    const elegidos = selecciones[plantillaId] ?? seleccionInicial(meta, products).map(p => p.id)
    return elegidos.filter(id => elegibles.has(id))
  }, [selecciones, plantillaId, meta, products])

  const props = useMemo(() => armarProps(meta, products, ids, musica), [meta, products, ids, musica])
  const problema = problemaDelPedido(meta, props)
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
    const consultar = async () => {
      const pendientes = historialRef.current.filter(x => EN_CURSO.includes(x.estado))
      for (const h of pendientes) {
        const cambios = await consultarEstado(h)
        if (!vivo) return
        guardarHistorial(lista => lista.map(x => (x.requestId === h.requestId ? { ...x, ...cambios } : x)))
      }
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
    } else if (meta.max === 1) {
      setSelecciones(s => ({ ...s, [plantillaId]: [p.id] }))
    } else if (ids.length >= meta.max) {
      onToast(`${meta.nombre} usa hasta ${meta.max} productos. Sacá uno para sumar otro.`, 'error')
    } else {
      setSelecciones(s => ({ ...s, [plantillaId]: [...ids, p.id] }))
    }
  }

  const prepararFoto = async p => {
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
      onToast('✅ Foto lista para video. Tocá "Publicar en sitio" para que quede guardada.', 'ok', 7000)
    } catch (e) {
      onToast(`❌ ${e?.message ?? 'No se pudo preparar la foto'}`, 'error', 8000)
    } finally {
      setPreparando(null)
    }
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
        body: JSON.stringify({ pin: pin(), plantilla: plantillaId, props }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        setErrorRender({ mensaje: json.error ?? `Error ${res.status}`, codigo: json.codigo })
        return
      }
      guardarHistorial(h => [
        {
          requestId: json.requestId,
          plantilla: meta.nombre,
          productos: props.productos.map(p => p.nombre).join(', '),
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

  const descargar = async h => {
    try {
      const res = await fetch(`/api/videos/descargar?request_id=${encodeURIComponent(h.requestId)}`, {
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
                  {t.formato} · {t.min === t.max ? `${t.max} producto` : `hasta ${t.max} productos`}
                </p>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">{t.descripcion}</p>
              </button>
            ))}
          </div>

          <label className="block mt-5">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Música</span>
            <select
              value={musica}
              onChange={e => setMusicas(m => ({ ...m, [plantillaId]: e.target.value }))}
              className="w-full sm:w-80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue"
            >
              {MUSICAS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold text-saro-dark">
                Productos{' '}
                <span className="text-saro-blue">
                  ({ids.length}/{meta.max})
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
          {props.productos.length > 0 ? (
            <VistaPreviaVideo plantillaId={plantillaId} props={props} />
          ) : (
            <div className="aspect-[9/16] rounded-2xl bg-gray-50 flex items-center justify-center text-center text-sm text-gray-400 p-6">
              Elegí al menos un producto para ver la vista previa.
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2 text-center">
            {meta.formato} · {meta.ancho}×{meta.alto}
          </p>

          <button
            type="button"
            onClick={generar}
            disabled={enviando || hayEnCurso || !!problema}
            className="mt-3 w-full py-3 rounded-xl bg-saro-blue hover:bg-saro-mid text-white text-sm font-bold transition btn-press disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Enviando…' : hayEnCurso ? 'Hay un video generándose…' : '🎞️ Generar MP4'}
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
            guardan los últimos 30.
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
                    <div className="flex items-center gap-3">
                      {h.estado === 'listo' && (
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
