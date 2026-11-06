// El mensaje de WhatsApp que llega cuando alguien finaliza un pedido, con una
// paleta real del catálogo. Reemplaza la fila de "3 pasos numerados" de la
// landing: en vez de contar el proceso, muestra lo que se entrega al final.
//
// ⚠️ Copia el formato de buildMessage() en Cart.jsx (pedido de 1 unidad, sin
// promo ni envío). Si cambia el mensaje del carrito, cambiarlo acá también.

const pesos = n => `$${Math.round(n).toLocaleString('es-AR')}`

// *negrita* y _cursiva_ como las muestra WhatsApp
function Linea({ texto }) {
  const partes = texto.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean)
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('*') ? <strong key={i}>{p.slice(1, -1)}</strong>
        : p.startsWith('_') ? <em key={i} className="text-tinta-500">{p.slice(1, -1)}</em>
        : <span key={i}>{p}</span>
      )}
    </>
  )
}

export default function MensajePedido({ producto }) {
  const { nombre, precio, color, talle } = producto
  const lineas = [
    '*Hola!* 📋 Quiero hacer este pedido:',
    '👤 _Tu nombre y apellido_',
    '',
    `*${nombre}* ${pesos(precio)} C/u`,
    '',
    `• ${color} - ${talle} x1`,
    `= 1 x ${pesos(precio)} = ${pesos(precio)}`,
    '',
    `*TOTAL: ${pesos(precio)}*`,
    '',
    'Gracias!',
  ]

  return (
    <figure className="w-full max-w-[420px] mx-auto">
      <div className="rounded-[28px] overflow-hidden border border-tinta-200 shadow-float bg-white">
        {/* Barra del chat */}
        <div className="flex items-center gap-3 px-4 py-3 bg-wa-700 text-white">
          <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
            <img src="/assets/logo-icon.png" alt="" className="w-6 h-6 object-contain" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">SARO</p>
            <p className="text-[11px] text-wa-100">WhatsApp</p>
          </div>
        </div>

        {/* Conversación: el pedido sale del carrito como mensaje propio */}
        <div className="bg-[#EFEAE2] px-3 sm:px-4 py-6">
          <div className="ml-auto max-w-[88%] rounded-xl rounded-tr-sm bg-[#D9FDD3] px-3 pt-2 pb-1.5 shadow-sm text-[13px] text-tinta-900 leading-snug">
            {lineas.map((l, i) =>
              l === '' ? <div key={i} className="h-2" /> : <p key={i}><Linea texto={l} /></p>
            )}
            <p className="text-right text-[10px] text-tinta-500 mt-1">✓✓</p>
          </div>
        </div>
      </div>
      <figcaption className="text-xs text-tinta-500 mt-4 text-center leading-relaxed">
        Así nos llega tu pedido. Ejemplo con la {nombre} del catálogo.
      </figcaption>
    </figure>
  )
}
