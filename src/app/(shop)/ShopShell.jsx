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
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <Image
              src="/assets/logo-icon.png"
              alt="SARO — Paletas de padel y ropa deportiva mayorista"
              width={40}
              height={40}
              className="h-10 w-auto mx-auto opacity-40"
              loading="lazy"
            />
            <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
              SARO Mayorista — Tu proveedor de paletas de padel, palas de padel,
              accesorios de padel (grips, cubre grips, pelotas, bolsos, mochilas)
              y ropa deportiva al por mayor en Argentina. Catalogo mayorista con
              precios exclusivos por cantidad y envios a todo el pais.
            </p>
            <nav className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-gray-300">
              <span>Paletas de padel</span>
              <span>&middot;</span>
              <span>Palas de padel</span>
              <span>&middot;</span>
              <span>Accesorios de padel</span>
              <span>&middot;</span>
              <span>Grips y cubre grips</span>
              <span>&middot;</span>
              <span>Bolsos de padel</span>
              <span>&middot;</span>
              <span>Ropa deportiva mayorista</span>
              <span>&middot;</span>
              <span>Indumentaria deportiva</span>
              <span>&middot;</span>
              <span>Mayorista Argentina</span>
            </nav>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
