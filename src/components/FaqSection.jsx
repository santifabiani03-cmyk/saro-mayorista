'use client'

import { useState } from 'react'

const faqs = [
  {
    q: '¿Cuál es la compra mínima?',
    a: 'Sugerimos una compra mínima que se indica en la parte superior de la página. Esto nos permite ofrecerte los mejores precios mayoristas del mercado.',
  },
  {
    q: '¿Hacen envíos a todo el país?',
    a: 'Sí, realizamos envíos a toda la Argentina a través de las principales empresas de logística. El costo de envío se coordina al momento de confirmar tu pedido.',
  },
  {
    q: '¿Cómo hago un pedido?',
    a: 'Es muy fácil: elegí los productos que necesitás, seleccioná colores, talles y cantidades, y enviá tu pedido por WhatsApp directamente desde el carrito. Nosotros te confirmamos stock y te indicamos cómo pagar.',
  },
  {
    q: '¿Qué medios de pago aceptan?',
    a: 'Aceptamos transferencia bancaria y otros medios que se coordinan de forma directa. Una vez confirmado tu pedido, te compartimos los datos necesarios.',
  },
  {
    q: '¿Qué productos ofrecen?',
    a: 'Tenemos un catálogo completo de indumentaria deportiva (remeras, buzos, shorts, calzas, camperas), accesorios de pádel (paletas, bolsos, mochilas) y accesorios deportivos en general. Todo con la calidad SARO.',
  },
  {
    q: '¿Puedo revender los productos?',
    a: 'Por supuesto, nuestros precios están pensados para comerciantes y revendedores. Cuanto mayor sea tu pedido, mejores precios podemos ofrecerte a través de nuestras promos por cantidad.',
  },
]

function FaqItem({ faq }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="text-sm font-semibold text-gray-800">{faq.q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <p className="text-sm text-gray-500 leading-relaxed pb-4 pr-8">
          {faq.a}
        </p>
      )}
    </div>
  )
}

export default function FaqSection() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">Preguntas frecuentes</h2>
      <p className="text-sm text-gray-400 mb-4">Todo lo que necesitás saber para comprar en SARO Mayorista</p>
      <div>
        {faqs.map((faq, i) => (
          <FaqItem key={i} faq={faq} />
        ))}
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
