'use client'

import Image from 'next/image'
import { CartProvider } from '../../context/CartContext'
import Header from '../../components/Header'
import Cart from '../../components/Cart'

export default function ShopShell({ config, children }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Header config={config} />

        {children}

        <Cart config={config} />

        {/* Footer SEO */}
        <footer className="bg-white border-t border-gray-100 mt-12 py-8 px-4">
          <div className="max-w-7xl mx-auto text-center space-y-3">
            <Image
              src="/assets/logo-icon.png"
              alt="SARO"
              width={40}
              height={40}
              className="h-10 w-auto mx-auto opacity-40"
              loading="lazy"
            />
            <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
              SARO Mayorista — Indumentaria deportiva, ropa de entrenamiento,
              paletas de padel, bolsos, mochilas y accesorios deportivos. Venta
              mayorista en Argentina con precios exclusivos por cantidad.
            </p>
            <p className="text-[10px] text-gray-300">
              Ropa deportiva mayorista &middot; Padel &middot; Accesorios
              &middot; Entrenamiento &middot; Argentina
            </p>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
