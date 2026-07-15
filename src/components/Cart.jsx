'use client'
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
    const grouped = {}
    items.forEach(i => {
      if (!grouped[i.productId]) {
        grouped[i.productId] = { nombre: i.nombre, precio: i.precio, promos: i.promos ?? [], items: [] }
      }
      grouped[i.productId].items.push(i)
    })

    let msg = `*Hola!* 📋 Quiero hacer un pedido mayorista:\n`

    Object.values(grouped).forEach(prod => {
      const totalQty = prod.items.reduce((s, i) => s + i.cantidad, 0)
      const applicable = prod.promos
        .filter(p => totalQty >= p.cantidad)
        .sort((a, b) => b.cantidad - a.cantidad)[0]
      const precioUnit = applicable
        ? Math.round(applicable.precioTotal / applicable.cantidad)
        : prod.precio
      const subtotal = Math.round(totalQty * precioUnit)

      msg += `\n*${prod.nombre}* $${prod.precio.toLocaleString('es-AR')} C/u\n\n`
      prod.items.forEach(i => {
        msg += `• ${i.color} - ${i.talle} x${i.cantidad}\n`
      })
      if (applicable) {
        msg += `= ${totalQty}u → promo ${applicable.cantidad}u: $${precioUnit.toLocaleString('es-AR')}/u = $${subtotal.toLocaleString('es-AR')}\n`
      } else {
        msg += `= ${totalQty} x $${prod.precio.toLocaleString('es-AR')} = $${subtotal.toLocaleString('es-AR')}\n`
      }
    })

    msg += `\n*TOTAL: $${total.toLocaleString('es-AR')}*\n\nGracias!`
    return msg
  }

  const sendWhatsApp = () => {
    if (items.length === 0) return
    fetch('/api/track-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, total, totalItems }),
    }).catch(() => {})
    window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(buildMessage())}`, '_blank')
  }

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildMessage())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
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
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Panel lateral */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-float transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/80 flex-shrink-0">
          <h2 className="font-bold text-lg text-gray-900 tracking-tight">
            Tu pedido
            {totalItems > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({totalItems} unidades)</span>
            )}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-2 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-gray-200">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-400">Tu carrito está vacío</p>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs text-saro-blue hover:text-saro-mid font-medium transition-colors"
              >
                Ver productos
              </button>
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={`${item.productId}-${item.color}-${item.talle}-${idx}`}
                className="flex items-center gap-3 bg-gray-50/80 rounded-xl p-3 border border-gray-100/60"
              >
                {/* Thumbnail */}
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
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-600 text-xs font-bold flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-5 text-center tabular-nums">{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.color, item.talle, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700 text-gray-600 text-xs font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-bold text-sm text-saro-blue">
                    ${(item.precio * item.cantidad).toLocaleString('es-AR')}
                  </span>
                  {item.promos?.length > 0 && (() => {
                    const prodQty = items.filter(x => x.productId === item.productId)
                      .reduce((s, x) => s + x.cantidad, 0)
                    const best = item.promos
                      .filter(p => prodQty >= p.cantidad)
                      .sort((a, b) => b.cantidad - a.cantidad)[0]
                    if (best) {
                      return (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          promo {best.cantidad}u
                        </span>
                      )
                    }
                    return null
                  })()}
                  <button
                    onClick={() => removeItem(item.productId, item.color, item.talle)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
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
          <div className="px-5 py-4 border-t border-gray-100/80 space-y-4 flex-shrink-0 bg-white">
            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-extrabold text-saro-dark tracking-tight">
                ${total.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-500">
                <span className="font-medium">
                  {canSend
                    ? '✅ Mínimo alcanzado'
                    : `Faltan $${remaining.toLocaleString('es-AR')} para el mínimo sugerido`}
                </span>
                <span className="font-semibold text-gray-400">${minPurchase.toLocaleString('es-AR')}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${canSend ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-saro-blue/70 to-saro-blue'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Botón WhatsApp */}
            <button
              onClick={sendWhatsApp}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 active:scale-[.98]"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Enviar pedido por WhatsApp
            </button>

            {/* Botón copiar mensaje */}
            <button
              onClick={copyMessage}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 active:scale-[.98]"
            >
              {copied
                ? <><span>✅</span> ¡Copiado!</>
                : <><span>📋</span> Copiar texto del pedido</>}
            </button>

            <button
              onClick={clearCart}
              className="w-full py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </div>
    </>
  )
}
