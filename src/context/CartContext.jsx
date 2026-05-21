import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems]   = useState([])
  const [isOpen, setIsOpen] = useState(false)

  const addItems = (product, selections) => {
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
            precio:    product.precio,
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

  const total      = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
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
