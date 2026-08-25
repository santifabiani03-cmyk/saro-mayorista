'use client'

import { useState } from 'react'
import { track } from '../utils/analytics'

// Cada provincia con una localidad de ejemplo (se usa como placeholder del campo Localidad)
const PROVINCIAS = {
  'Buenos Aires': 'San Isidro',
  'CABA': 'Palermo',
  'Catamarca': 'San Fernando del Valle',
  'Chaco': 'Resistencia',
  'Chubut': 'Puerto Madryn',
  'Córdoba': 'Villa Carlos Paz',
  'Corrientes': 'Goya',
  'Entre Ríos': 'Paraná',
  'Formosa': 'Clorinda',
  'Jujuy': 'San Salvador de Jujuy',
  'La Pampa': 'Santa Rosa',
  'La Rioja': 'Chilecito',
  'Mendoza': 'Godoy Cruz',
  'Misiones': 'Posadas',
  'Neuquén': 'San Martín de los Andes',
  'Río Negro': 'Bariloche',
  'Salta': 'San Ramón de la Nueva Orán',
  'San Juan': 'Rawson',
  'San Luis': 'Villa Mercedes',
  'Santa Cruz': 'Río Gallegos',
  'Santa Fe': 'Rosario',
  'Santiago del Estero': 'La Banda',
  'Tierra del Fuego': 'Ushuaia',
  'Tucumán': 'Yerba Buena',
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-saro-dark placeholder:text-gray-400 focus:outline-none focus:border-saro-blue focus:ring-2 focus:ring-saro-blue/10 transition'
const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5'

function Tab({ active, onClick, subtitle, title, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-2xl border p-5 sm:p-6 transition duration-200 ${
        active
          ? 'bg-white border-saro-blue/40 shadow-card-hover'
          : 'bg-white border-gray-100/80 shadow-card hover:-translate-y-0.5 hover:shadow-card-hover'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[.28em] mb-1 ${accent}`}>{subtitle}</p>
          <h3 className="text-lg sm:text-xl font-extrabold text-saro-dark tracking-tight">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${active ? 'rotate-180 text-saro-blue' : 'text-gray-400'}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </button>
  )
}

function Historia() {
  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12 text-sm text-gray-500 leading-relaxed">
      <div className="space-y-3">
        <h4 className="text-base font-bold text-saro-dark">Nuestra historia</h4>
        <p>
          SARO nació de la pasión por el pádel de <strong className="text-saro-dark font-semibold">Leonardo Fabiani</strong>,
          quien durante casi 20 años se desempeñó como vendedor mayorista de la marca Dabber en Argentina, junto a otros
          referentes del rubro. De esa experiencia y de una oportunidad que surgió con ese grupo de vendedores, decidió
          lanzar sus propias paletas bajo un nombre propio: <strong className="text-saro-blue font-semibold">SARO</strong>,
          que combina <strong className="text-saro-dark font-semibold">Santiago</strong> y{' '}
          <strong className="text-saro-dark font-semibold">Rocío</strong>, sus hijos.
        </p>
        <p>
          Desde aquellas primeras paletas, hace ya <strong className="text-saro-dark font-semibold">15 años</strong> que
          SARO es marca en el mercado. Con el tiempo fuimos sumando indumentaria y otros productos, y acompañando el
          crecimiento con presencia en torneos como forma de estar cerca de los jugadores y los clubes.
        </p>
      </div>
      <div className="space-y-3 md:border-l md:border-gray-100/80 md:pl-8 lg:pl-12">
        <h4 className="text-base font-bold text-saro-dark">Nuestra política</h4>
        <p>
          Aunque nacimos y crecimos de la mano del pádel, no nos definimos únicamente por ese deporte: nuestro objetivo
          es consolidarnos como <strong className="text-saro-dark font-semibold">manufactura textil de indumentaria
          deportiva</strong>, más allá del nicho de origen.
        </p>
        <p>
          Lo que nos identifica es la <strong className="text-saro-dark font-semibold">relación calidad-precio</strong> y
          el trato cercano con cada club y cliente. Trabajamos codo a codo con quienes nos compran, priorizando el
          vínculo por sobre la transacción — por eso la venta se maneja principalmente vía WhatsApp, de forma directa y
          personal.
        </p>
      </div>
    </div>
  )
}

function Formulario({ whatsappNumber }) {
  const [f, setF] = useState({ nombre: '', apellido: '', provincia: '', localidad: '', mensaje: '' })
  const on = k => e => setF(s => ({ ...s, [k]: e.target.value }))
  const valid = f.nombre.trim() && f.apellido.trim() && f.provincia && f.localidad.trim()

  const enviar = e => {
    e.preventDefault()
    if (!valid) return
    const l = ['*Hola SARO!* Me interesa comprar por mayor / trabajar con ustedes:', '']
    l.push(`• *Nombre:* ${f.nombre.trim()} ${f.apellido.trim()}`)
    l.push(`• *Provincia:* ${f.provincia}`)
    l.push(`• *Localidad:* ${f.localidad.trim()}`)
    if (f.mensaje.trim()) l.push(`• *Mensaje:* ${f.mensaje.trim()}`)
    track('trabaja_con_nosotros', { provincia: f.provincia })
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(l.join('\n'))}`, '_blank')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-sm text-gray-500 leading-relaxed mb-5 text-center">
        Si querés revender SARO o comprar por mayor, dejanos tus datos y te contactamos para armar un acuerdo.
      </p>
      <form onSubmit={enviar} className="space-y-4">
        {/* Cada etiqueta va atada a su campo con htmlFor/id: así el lector de
            pantalla la anuncia, y al tocar el texto se enfoca el campo. */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tcn-nombre" className={labelCls}>Nombre *</label>
            <input id="tcn-nombre" name="nombre" autoComplete="given-name" value={f.nombre} onChange={on('nombre')} required className={inputCls} placeholder="Juan" />
          </div>
          <div>
            <label htmlFor="tcn-apellido" className={labelCls}>Apellido *</label>
            <input id="tcn-apellido" name="apellido" autoComplete="family-name" value={f.apellido} onChange={on('apellido')} required className={inputCls} placeholder="Pérez" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tcn-provincia" className={labelCls}>Provincia *</label>
            <select id="tcn-provincia" name="provincia" value={f.provincia} onChange={on('provincia')} required className={`${inputCls} bg-white`}>
              <option value="">Elegí tu provincia…</option>
              {Object.keys(PROVINCIAS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="tcn-localidad" className={labelCls}>Localidad *</label>
            <input
              id="tcn-localidad"
              name="localidad"
              value={f.localidad}
              onChange={on('localidad')}
              required
              disabled={!f.provincia}
              className={inputCls}
              placeholder={f.provincia ? `Ej: ${PROVINCIAS[f.provincia]}` : 'Elegí primero la provincia'}
            />
          </div>
        </div>
        <div>
          <label htmlFor="tcn-mensaje" className={labelCls}>Mensaje</label>
          <textarea id="tcn-mensaje" name="mensaje" value={f.mensaje} onChange={on('mensaje')} rows={3} className={inputCls} placeholder="Contanos qué vendés o qué te interesa (opcional)" />
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition duration-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Enviar por WhatsApp
        </button>
      </form>
    </div>
  )
}

export default function HistoriaTrabaja({ whatsappNumber }) {
  const [active, setActive] = useState(null) // null | 'hist' | 'trab'
  const toggle = id => setActive(a => (a === id ? null : id))

  return (
    <section id="trabaja" className="relative bg-[#FAFBFC] py-16 sm:py-24 scroll-mt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Pestañas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Tab active={active === 'hist'} onClick={() => toggle('hist')} subtitle="La marca" title="Nuestra historia y política" accent="text-saro-blue" />
          <Tab active={active === 'trab'} onClick={() => toggle('trab')} subtitle="¿Tenés un comercio?" title="Trabajá con nosotros" accent="text-saro-accent" />
        </div>

        {/* Panel: ocupa todo el ancho, se despliega debajo */}
        <div className={`grid transition duration-300 ease-in-out ${active ? 'grid-rows-[1fr] opacity-100 mt-3 sm:mt-4' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="bg-white rounded-2xl border border-gray-100/80 shadow-card p-6 sm:p-8 lg:p-10">
              {active === 'hist' && <Historia />}
              {active === 'trab' && <Formulario whatsappNumber={whatsappNumber} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
