import { useState } from 'react'
import { useCart } from '../context/CartContext'

export default function Cart({ config }) {
  const { items, removeItem, updateQty, clearCart, total, totalItems, isOpen, setIsOpen } = useCart()
  const [copied, setCopied] = useState(false)

  const minPurchase = config.minPurchase
  const progress    = Math.min(100, (total / minPurchase) * 100)
  const remaining   = minPurchase - total
  const canSend     = total >= minPurchase

  const buildMessage = () => {
    let msg = `¡Hola SARO! 👋 Quiero hacer un pedido mayorista:\n\n`
    items.forEach(i => {
      msg += `• *${i.nombre}* — ${i.color} / ${i.talle} × ${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString('es-AR')}\n`
    })
    msg += `\n*TOTAL: $${total.toLocaleString('es-AR')}*\n\nGracias!`
    return msg
  }

  const sendWhatsApp = () => {
    if (items.length === 0) return
    window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(buildMessage())}`, '_blank')
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildMessage())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback para navegadores que no soportan clipboard API
      const ta = document.createElement('textarea')
      ta.value = buildMessage()
      ta.style.position = 'fixed'
      ta.style.opacity  = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-lg text-gray-900">
            Tu pedido
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({totalItems} unidades)</span>
            )}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-1.5 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
              <span className="text-5xl">🛒</span>
              <p className="text-sm">Tu carrito está vacío</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-saro-blue hover:underline mt-2"
              >
                Ver productos
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.color}-${item.talle}-${idx}`}
                className="flex items-center gap-3 bg-gray-50 rounded-xl p-3"
              >
                {/* Thumbnail: foto real del producto o emoji de respaldo */}
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {item.imagen
                    ? <img
                        src={item.imagen}
                        alt={item.nombre}
                        className="w-full h-full object-cover"
                        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
                      />
                    : null}
                  <span
                    className="text-2xl flex items-center justify-center w-full h-full"
                    style={{ display: item.imagen ? 'none' : 'flex' }}
                  >{item.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{item.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.color} · {item.talle}</p>
                  {/* Selector de cantidad */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <button
                      onClick={() => updateQty(item.productId, item.color, item.talle, -1)}
                      className="w-5 h-5 rounded-md bg-gray-200 hover:bg-red-100 hover:text-red-600 text-xs font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.color, item.talle, 1)}
                      className="w-5 h-5 rounded-md bg-gray-200 hover:bg-green-100 hover:text-green-700 text-xs font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-bold text-sm text-saro-blue">
                    ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                  </span>
                  <button
                    onClick={() => removeItem(item.productId, item.color, item.talle)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer con total + WhatsApp */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-4 flex-shrink-0 bg-white">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-extrabold text-saro-blue">
                ${total.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Barra de progreso (solo informativa) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {canSend
                    ? '✅ Mínimo alcanzado'
                    : `Faltan $${remaining.toLocaleString('es-AR')} para el mínimo sugerido`}
                </span>
                <span className="font-medium">${minPurchase.toLocaleString('es-AR')}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${canSend ? 'bg-green-500' : 'bg-saro-blue'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Botón WhatsApp */}
            <button
              onClick={sendWhatsApp}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 active:scale-95"
            >
              <span className="text-lg">📱</span>
              Enviar pedido por WhatsApp
            </button>

            {/* Botón copiar mensaje */}
            <button
              onClick={copyMessage}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all bg-gray-100 hover:bg-gray-200 text-gray-600 active:scale-95"
            >
              {copied
                ? <><span>✅</span> ¡Copiado!</>
                : <><span>📋</span> Copiar texto del pedido</>}
            </button>

            <button
              onClick={clearCart}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  )
}
