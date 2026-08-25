'use client'

import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext(null)
const CART_KEY = 'saro_cart_v1'

export function CartProvider({ children }) {
  // Arranca vacío y el carrito guardado se lee YA EN EL NAVEGADOR.
  // Leer localStorage al inicializar el estado parece más directo, pero ese
  // código también corre en el servidor, donde localStorage no existe: el
  // servidor devolvía el carrito vacío, el navegador lo devolvía con productos,
  // y React se quejaba de que no coincidían (los errores de hidratación).
  const [items, setItems] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  // Hasta no haber leído lo guardado no se escribe nada: si no, el primer
  // guardado pisaría el carrito real con la lista vacía del arranque.
  const [leido, setLeido] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      if (saved) setItems(JSON.parse(saved))
    } catch {}
    setLeido(true)
  }, [])

  // Persistir cada vez que cambia el carrito, ya con lo guardado a la vista
  useEffect(() => {
    if (!leido) return
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)) } catch {}
  }, [items, leido])

  const addItems = (product, selections) => {
    // Guardar la primera imagen para mostrarla en el carrito
    const imagen = product.imagenes?.[0] ?? product.imagen ?? null

    setItems(prev => {
      const next = [...prev]
      selections.forEach(({ color, talle, cantidad }) => {
        const idx = next.findIndex(
          i => i.productId === product.id && i.color === color && i.talle === talle
        )
        if (idx >= 0) {
          next[idx] = { ...next[idx], cantidad: next[idx].cantidad + cantidad }
        } else {
          next.push({
            productId: product.id,
            nombre:    product.nombre,
            emoji:     product.emoji,
            imagen,
            precio:    product.precio,
            promos:    product.promos ?? [],
            peso:      product.peso ?? 0,   // gramos, para cotizar el envío
            modo:      product.modo ?? 'mayorista',  // catálogo del que salió (define la compra mínima)
            color,
            talle,
            cantidad,
          })
        }
      })
      return next.filter(i => i.cantidad > 0)
    })
    setIsOpen(true)
  }

  const removeItem = (productId, color, talle) =>
    setItems(prev => prev.filter(
      i => !(i.productId === productId && i.color === color && i.talle === talle)
    ))

  const updateQty = (productId, color, talle, delta) =>
    setItems(prev =>
      prev
        .map(i =>
          i.productId === productId && i.color === color && i.talle === talle
            ? { ...i, cantidad: Math.max(0, i.cantidad + delta) }
            : i
        )
        .filter(i => i.cantidad > 0)
    )

  const clearCart = () => setItems([])

  // Agrupar por producto para aplicar promos
  const getPromoTotals = () => {
    const grouped = {}
    items.forEach(i => {
      if (!grouped[i.productId]) grouped[i.productId] = { precio: i.precio, promos: i.promos ?? [], qty: 0 }
      grouped[i.productId].qty += i.cantidad
    })
    let sum = 0
    Object.values(grouped).forEach(g => {
      const applicable = g.promos
        .filter(p => g.qty >= p.cantidad)
        .sort((a, b) => b.cantidad - a.cantidad)[0]
      if (applicable) {
        sum += g.qty * (applicable.precioTotal / applicable.cantidad)
      } else {
        sum += g.qty * g.precio
      }
    })
    return Math.round(sum)
  }

  const total      = getPromoTotals()
  const totalItems = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, addItems, removeItem, updateQty, clearCart, total, totalItems, isOpen, setIsOpen }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
