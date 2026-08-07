'use client'

import { useState } from 'react'

const faqs = [
  {
    q: '¿Hacen envíos a todo el país?',
    a: 'Sí, realizamos envíos de paletas de padel, accesorios de padel y ropa deportiva a toda la Argentina a través de las principales empresas de logística. El costo de envío se coordina al momento de confirmar tu pedido.',
  },
  {
    q: '¿Cómo hago un pedido?',
    a: 'Es muy fácil: elegí los productos que necesitás (paletas, grips, bolsos, ropa), seleccioná colores, talles y cantidades, y enviá tu pedido por WhatsApp directamente desde el carrito. Nosotros te confirmamos stock y te indicamos cómo pagar.',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos transferencia bancaria y otros medios que se coordinan de forma directa. Una vez confirmado tu pedido, te compartimos los datos necesarios.',
  },
  {
    q: '¿Qué productos ofrecen?',
    a: 'Tenemos un catalogo completo de paletas de padel y palas de padel para todos los niveles, accesorios de padel (grips, cubre grips, pelotas, bolsos, mochilas), indumentaria deportiva (remeras, buzos, shorts, calzas, camperas) y accesorios deportivos en general. Todo con la calidad SARO y directo de fábrica.',
  },
  {
    q: '¿Puedo comprar por mayor o revender SARO?',
    a: 'Sí. Si tenés un comercio o querés revender nuestros productos, completá el formulario de "Trabajá con nosotros" en la página principal y nos ponemos en contacto para armar un acuerdo mayorista.',
  },
]

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100/80 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="text-sm font-semibold text-gray-800 group-hover:text-saro-blue transition-colors">{faq.q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-gray-500 leading-relaxed pb-4 pr-8">
            {faq.a}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function FaqSection() {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden">
      {/* Header colapsable */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Preguntas frecuentes</h2>
          <p className="text-sm text-gray-400 mt-0.5">Todo lo que necesitás saber para comprar en SARO</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Contenido desplegable */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100/80">
            {faqs.map((faq, i) => (
              <FaqItem key={i} faq={faq} />
            ))}
          </div>
        </div>
      </div>

      {/* JSON-LD FAQPage para Google Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: f.a,
              },
            })),
          }),
        }}
      />
    </section>
  )
}
