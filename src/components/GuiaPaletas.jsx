'use client'

import { useState } from 'react'

const NIVELES = [
  { nivel: 'Principiante', peso: '345 – 365 g', forma: 'Redonda', cara: 'Fibra de vidrio', nucleo: 'EVA Soft' },
  { nivel: 'Intermedio', peso: '360 – 380 g', forma: 'Lágrima', cara: 'Carbono 3K', nucleo: 'EVA Media' },
  { nivel: 'Avanzado', peso: '365 – 385 g', forma: 'Lágrima / Diamante', cara: 'Carbono 12K', nucleo: 'EVA Media / Alta' },
  { nivel: 'Junior / Dama', peso: '280 – 340 g', forma: 'Redonda', cara: 'Fibra o Carbono 3K', nucleo: 'EVA Soft' },
]

const FORMAS = [
  {
    nombre: 'Redonda',
    punto: 'Punto dulce amplio y centrado',
    para: 'Control y salida de bola. La más perdonadora: ideal para empezar y para el juego defensivo.',
    icon: <circle cx="12" cy="10" r="6.5" />,
  },
  {
    nombre: 'Lágrima',
    punto: 'Punto dulce medio',
    para: 'El equilibrio entre control y potencia. La más elegida por el jugador todoterreno.',
    icon: <path d="M12 3.5c3.6 0 6.5 3 6.5 6.6 0 3.6-2.9 6.4-6.5 6.4s-6.5-2.8-6.5-6.4c0-3.6 2.9-6.6 6.5-6.6Z" />,
  },
  {
    nombre: 'Diamante',
    punto: 'Punto dulce alto y concentrado',
    para: 'Máxima potencia para el remate. Exige técnica: recomendada para nivel avanzado.',
    icon: <path d="M12 3.2 18.5 10 12 16.8 5.5 10 12 3.2Z" />,
  },
]

const MATERIALES = [
  { t: 'Fibra de vidrio', d: 'Cara más blanda y cómoda. Perdona los golpes descentrados y ayuda a la salida de bola.' },
  { t: 'Carbono 3K', d: 'Punto medio: más firme que la fibra, con buen tacto. Ideal para quien ya progresó.' },
  { t: 'Carbono 12K', d: 'Cara rígida y reactiva. Máxima transmisión de potencia para juego exigente.' },
  { t: 'Goma EVA Soft', d: 'Núcleo blando: más confort, menos exigencia en el brazo y mejor control.' },
  { t: 'Goma EVA Media / Alta', d: 'Núcleo más denso: respuesta rápida y potencia en el golpe.' },
]

export default function GuiaPaletas() {
  const [open, setOpen] = useState(false)

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
      <div className="bg-white rounded-2xl border border-gray-100/80 shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left hover:bg-gray-50/50 transition-colors"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.28em] text-saro-blue mb-1">
              Guía de compra
            </p>
            <h2 className="text-lg sm:text-xl font-extrabold text-saro-dark tracking-tight">
              ¿Cómo elegir tu paleta de pádel?
            </h2>
          </div>
          <svg
            className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-saro-blue' : 'text-gray-400'}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="px-5 sm:px-6 pb-6 pt-5 border-t border-gray-100/80 space-y-8">

              {/* Peso y perfil según nivel */}
              <div>
                <h3 className="text-base font-bold text-saro-dark mb-1">Peso y perfil según tu nivel</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Si dudás entre dos niveles, elegí el más bajo: es más fácil progresar con una paleta que
                  dominás que pelear con una que te queda grande.
                </p>
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                        <th className="py-2 px-2 font-semibold">Nivel</th>
                        <th className="py-2 px-2 font-semibold">Peso</th>
                        <th className="py-2 px-2 font-semibold">Forma</th>
                        <th className="py-2 px-2 font-semibold">Cara</th>
                        <th className="py-2 px-2 font-semibold">Núcleo</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      {NIVELES.map(n => (
                        <tr key={n.nivel} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 px-2 font-semibold text-saro-dark whitespace-nowrap">{n.nivel}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap font-medium text-saro-blue">{n.peso}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap">{n.forma}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap">{n.cara}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap">{n.nucleo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formas */}
              <div>
                <h3 className="text-base font-bold text-saro-dark mb-4">La forma define tu juego</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {FORMAS.map(f => (
                    <div key={f.nombre} className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-saro-light text-saro-blue mb-3">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
                          {f.icon}
                          <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
                        </svg>
                      </span>
                      <h4 className="font-bold text-saro-dark text-sm">{f.nombre}</h4>
                      <p className="text-[11px] font-semibold text-saro-blue mt-0.5">{f.punto}</p>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{f.para}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiales */}
              <div>
                <h3 className="text-base font-bold text-saro-dark mb-4">Materiales: qué significan</h3>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                  {MATERIALES.map(m => (
                    <div key={m.t} className="flex gap-3 text-sm">
                      <span className="text-saro-blue mt-1.5 flex-shrink-0">
                        <svg viewBox="0 0 8 8" className="w-1.5 h-1.5" fill="currentColor"><circle cx="4" cy="4" r="4" /></svg>
                      </span>
                      <p className="text-gray-500 leading-relaxed">
                        <strong className="text-saro-dark font-semibold">{m.t}:</strong> {m.d}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400 border-t border-gray-100/80 pt-4">
                ¿Seguís con dudas? Escribinos por WhatsApp y te ayudamos a elegir la paleta según tu nivel y tu juego.
              </p>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
