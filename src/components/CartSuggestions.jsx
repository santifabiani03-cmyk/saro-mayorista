'use client'

import { useEffect, useState } from 'react'
import { useCart } from '../context/CartContext'
import { suggestFillers } from '../utils/cartSuggestions'

/**
 * Bloque "Completa tu pedido": cuando al carrito le falta plata para llegar
 * a la compra minima, propone productos concretos con la cantidad exacta
 * que cierra la brecha, para agregar en un solo tap.
 *
 * Trae el catalogo solo (y una unica vez) cuando hace falta, asi no
 * penaliza a quien nunca abre el carrito.
 */
export default function CartSuggestions({ gap }) {
  const { items, addItems } = useCart()
  const [products, setProducts] = useState(null)
  const [agregado, setAgregado] = useState(null)

  const necesitaSugerencias = gap > 0 && items.length > 0

  useEffect(() => {
    if (!necesitaSugerencias || products) return
    let cancelado = false
    fetch('/api/catalog')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (!cancelado) setProducts(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelado) setProducts([]) })
    return () => { cancelado = true }
  }, [necesitaSugerencias, products])

  if (!necesitaSugerencias || !products?.length) return null

  const sugerencias = suggestFillers(products, items, gap)
  if (!sugerencias.length) return null

  const agregar = ({ product, qty, variant }) => {
    addItems(product, [{ color: variant.color, talle: variant.talle, cantidad: qty }])
    setAgregado(product.id)
    setTimeout(() => setAgregado(null), 1500)
  }

  return (
    <div className="rounded-xl border border-saro-blue/15 bg-saro-light/50 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-saro-mid leading-snug">
        Sumá ${gap.toLocaleString('es-AR')} y llegás al mínimo:
      </p>

      <div className="space-y-1.5">
        {sugerencias.map(s => (
          <div
            key={s.product.id}
            className="flex items-center gap-2.5 bg-white rounded-lg p-2 border border-gray-100/80"
          >
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
              {s.product.imagenes?.[0]
                ? <img
                    src={s.product.imagenes[0]}
                    alt={s.product.nombre}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={e => { e.currentTarget.style.display = 'none' }}
                  />
                : <span className="text-base">{s.product.emoji ?? '🎾'}</span>}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                {s.product.nombre.trim()}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                {s.qty}u · +${s.subtotal.toLocaleString('es-AR')}
              </p>
            </div>

            <button
              onClick={() => agregar(s)}
              className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-saro-blue hover:bg-saro-mid text-white transition-colors active:scale-[.97]"
            >
              {agregado === s.product.id ? '✓' : 'Agregar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
