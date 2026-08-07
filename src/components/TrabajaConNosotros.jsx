'use client'

import { useState } from 'react'

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-saro-dark placeholder:text-gray-400 focus:outline-none focus:border-saro-blue focus:ring-2 focus:ring-saro-blue/10 transition'
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5'

export default function TrabajaConNosotros({ whatsappNumber }) {
  const [f, setF] = useState({
    nombre: '', apellido: '', localidad: '', comercio: '', rubro: '', mensaje: '',
  })
  const on = k => e => setF(s => ({ ...s, [k]: e.target.value }))
  const valid = f.nombre.trim() && f.apellido.trim() && f.localidad.trim()

  const enviar = e => {
    e.preventDefault()
    if (!valid) return
    const l = ['*Hola SARO!* Me interesa comprar por mayor / trabajar con ustedes:', '']
    l.push(`• *Nombre:* ${f.nombre.trim()} ${f.apellido.trim()}`)
    l.push(`• *Localidad:* ${f.localidad.trim()}`)
    if (f.comercio.trim()) l.push(`• *Comercio:* ${f.comercio.trim()}`)
    if (f.rubro.trim()) l.push(`• *Rubro:* ${f.rubro.trim()}`)
    if (f.mensaje.trim()) l.push(`• *Mensaje:* ${f.mensaje.trim()}`)
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(l.join('\n'))}`, '_blank')
  }

  return (
    <section id="trabaja" className="relative bg-white py-20 sm:py-28 border-y border-gray-100/80 scroll-mt-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div data-reveal className="reveal text-center mb-10 sm:mb-12">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-blue mb-3">
            ¿Tenés un comercio?
          </p>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark tracking-tight leading-[1.08]">
            Trabajá con nosotros
          </h2>
          <p className="text-sm sm:text-base text-gray-500 mt-4 leading-relaxed">
            Si querés revender SARO o comprar por mayor, dejanos tus datos y te contactamos para
            armar un acuerdo. Directo de fábrica.
          </p>
        </div>

        <form
          onSubmit={enviar}
          data-reveal
          className="reveal bg-[#FAFBFC] rounded-2xl border border-gray-100/80 p-6 sm:p-8 space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre *</label>
              <input value={f.nombre} onChange={on('nombre')} required className={inputCls} placeholder="Juan" />
            </div>
            <div>
              <label className={labelCls}>Apellido *</label>
              <input value={f.apellido} onChange={on('apellido')} required className={inputCls} placeholder="Pérez" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Localidad / Provincia *</label>
            <input value={f.localidad} onChange={on('localidad')} required className={inputCls} placeholder="Córdoba Capital" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nombre del comercio</label>
              <input value={f.comercio} onChange={on('comercio')} className={inputCls} placeholder="(opcional)" />
            </div>
            <div>
              <label className={labelCls}>Rubro</label>
              <input value={f.rubro} onChange={on('rubro')} className={inputCls} placeholder="(opcional)" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Mensaje</label>
            <textarea
              value={f.mensaje}
              onChange={on('mensaje')}
              rows={3}
              className={inputCls}
              placeholder="Contanos qué vendés o qué te interesa (opcional)"
            />
          </div>

          <button
            type="submit"
            disabled={!valid}
            className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
            </svg>
            Enviar por WhatsApp
          </button>
          <p className="text-[11px] text-gray-400 text-center">
            Se abre WhatsApp con tus datos ya cargados para enviárnoslos.
          </p>
        </form>
      </div>
    </section>
  )
}
