'use client'
import { useEffect } from 'react'

const steps = [
  {
    number: '1',
    icon: '🛍️',
    title: 'Explorá el catálogo',
    desc: 'Navegá los productos, elegí colores y talles, y agregá todo lo que quieras al carrito.',
  },
  {
    number: '2',
    icon: '📲',
    title: 'Enviá tu pedido por WhatsApp',
    desc: 'Desde el carrito, tocá "Enviar pedido por WhatsApp". Te lleva directo al chat con el resumen listo.',
  },
  {
    number: '3',
    icon: '✅',
    title: 'Confirmamos el stock',
    desc: 'Nosotros vamos a revisar tu pedido y te confirmamos qué productos están disponibles en ese momento.',
  },
  {
    number: '4',
    icon: '💳',
    title: 'Te indicamos cómo pagar',
    desc: 'Te compartimos los datos de la cuenta para realizar la transferencia o el pago acordado.',
  },
  {
    number: '5',
    icon: '📦',
    title: '¡Listo! Confirmamos el envío',
    desc: 'Una vez acreditado el pago, confirmamos el envío y te damos seguimiento hasta que llegue.',
  },
]

export default function HowToBuyModal({ onClose }) {
  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

          {/* Header del modal */}
          <div className="sticky top-0 bg-white rounded-t-2xl px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-saro-dark">¿Cómo comprar?</h2>
                <p className="text-sm text-gray-400 mt-0.5">Seguí estos pasos y tu pedido llega rápido 🚀</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-1.5 text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Pasos */}
          <div className="px-6 py-5 space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-4">

                {/* Línea conectora + número */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-saro-blue flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-saro-blue/30">
                    {step.number}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 h-full min-h-[20px] bg-gray-100 mt-1" />
                  )}
                </div>

                {/* Contenido */}
                <div className="pb-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{step.icon}</span>
                    <p className="font-bold text-gray-900 text-sm">{step.title}</p>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <div className="bg-saro-light rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-saro-dark font-medium">
                ¿Tenés alguna duda? Escribinos directo por WhatsApp 💬
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 py-3 bg-saro-blue hover:bg-saro-dark text-white font-bold rounded-xl transition-colors text-sm"
            >
              ¡Entendido, voy a comprar!
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
