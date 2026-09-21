'use client'
import { useState } from 'react'
import { armarFeed, SITE } from '../../utils/feed'

const FEED_URL = `${SITE}/feed.xml`

function Switch({ on, onClick, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${on ? 'bg-saro-blue' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function Thumb({ p }) {
  const src = p.imagenes?.[0] ?? p.imagen
  return (
    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">{p.emoji}</span>}
    </div>
  )
}

/**
 * Qué productos salen en los anuncios de Meta y Google, y por qué el resto no.
 * Usa la misma regla que /feed.xml (utils/feed.js), así lo que se ve acá es lo
 * que va a leer Meta después de publicar.
 */
export default function PublicidadPanel({ products, onTogglePublicitar, onEdit, saving, isSynced }) {
  const [copiado, setCopiado] = useState(false)
  const { dentro, fuera } = armarFeed(products)
  const conAvisos = dentro.filter(d => d.avisos.length > 0).length

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Link del feed */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-saro-dark tracking-tight">📣 Productos en publicidad</h2>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
          Este link tiene tus productos listos para Meta (Instagram/Facebook) y Google. Se carga una sola vez
          en cada plataforma y se actualiza solo cada vez que tocás <strong>"Publicar en sitio"</strong>.
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <code className="flex-1 bg-saro-light text-saro-mid text-sm font-semibold rounded-xl px-4 py-3 break-all">
            {FEED_URL}
          </code>
          <button
            onClick={copiar}
            className="px-5 py-3 rounded-xl bg-saro-blue hover:bg-saro-mid text-white text-sm font-bold transition btn-press"
          >
            {copiado ? '✓ Copiado' : 'Copiar link'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{dentro.length}</p>
            <p className="text-[11px] font-semibold text-emerald-700">en los anuncios</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{conAvisos}</p>
            <p className="text-[11px] font-semibold text-amber-700">para mejorar</p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
            <p className="text-2xl font-extrabold text-gray-500">{fuera.length}</p>
            <p className="text-[11px] font-semibold text-gray-500">fuera</p>
          </div>
        </div>

        {!isSynced && (
          <p className="mt-4 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Tenés cambios sin publicar: el link todavía muestra la versión anterior hasta que toques "Publicar en sitio".
          </p>
        )}
      </div>

      {/* En los anuncios */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-saro-dark">En los anuncios ({dentro.length})</h3>
          <p className="text-xs text-gray-400 mt-0.5">Así se ven el título y el precio en Meta y Google.</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {dentro.map(({ producto: p, item, avisos }) => (
            <li key={p.id} className="px-5 py-3 flex items-center gap-3">
              <Thumb p={p} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs font-bold text-saro-blue">${Number(p.precioMinorista).toLocaleString('es-AR')}</p>
                {avisos.map(a => (
                  <button key={a} onClick={() => onEdit(p)} className="block text-left text-[11px] text-amber-700 hover:underline">
                    ⚠️ {a}
                  </button>
                ))}
              </div>
              <Switch on disabled={saving} label={`Dejar de publicitar ${p.nombre}`} onClick={() => onTogglePublicitar(p.id)} />
            </li>
          ))}
          {dentro.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-gray-400">Todavía no hay productos en los anuncios.</li>
          )}
        </ul>
      </div>

      {/* Fuera */}
      {fuera.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-saro-dark">Fuera de los anuncios ({fuera.length})</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Para sumar uno, tocá el motivo y corregilo (casi siempre es cargar el precio minorista).
            </p>
          </div>
          <ul className="divide-y divide-gray-50">
            {fuera.map(({ producto: p, motivo }) => (
              <li key={p.id} className={`px-5 py-3 flex items-center gap-3 ${p.visible === false ? 'opacity-60' : ''}`}>
                <Thumb p={p} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{p.nombre}</p>
                  <button onClick={() => onEdit(p)} className="text-left text-[11px] text-gray-500 hover:text-saro-blue hover:underline">
                    {motivo}
                  </button>
                </div>
                {p.publicitar === false && (
                  <Switch on={false} disabled={saving} label={`Volver a publicitar ${p.nombre}`} onClick={() => onTogglePublicitar(p.id)} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
