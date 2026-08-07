'use client'

import Image from 'next/image'
import { CartProvider } from '../../context/CartContext'
import Header from '../../components/Header'
import Cart from '../../components/Cart'

export default function ShopShell({ config, children }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#FAFBFC]">
        <Header config={config} />

        {children}

        <Cart config={config} />

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100/80 mt-16 py-10 px-4">
          <div className="max-w-7xl mx-auto text-center space-y-5">
            <Image
              src="/assets/logo-icon.png"
              alt="SARO — Paletas de padel y ropa deportiva"
              width={40}
              height={40}
              className="h-10 w-auto mx-auto opacity-30"
              loading="lazy"
            />
            <p className="text-xs text-gray-400 max-w-xl mx-auto leading-relaxed">
              SARO — Paletas de padel, palas de padel, accesorios de padel
              (grips, cubre grips, pelotas, bolsos, mochilas) y ropa deportiva
              en Argentina. Directo de fábrica, con la calidad SARO y envios a
              todo el pais.
            </p>
            <nav className="flex flex-wrap justify-center gap-x-2 gap-y-1.5 text-[10px] text-gray-300 font-medium">
              <span>Paletas de padel</span>
              <span className="text-gray-200">/</span>
              <span>Palas de padel</span>
              <span className="text-gray-200">/</span>
              <span>Accesorios de padel</span>
              <span className="text-gray-200">/</span>
              <span>Grips y cubre grips</span>
              <span className="text-gray-200">/</span>
              <span>Bolsos de padel</span>
              <span className="text-gray-200">/</span>
              <span>Ropa deportiva</span>
              <span className="text-gray-200">/</span>
              <span>Indumentaria deportiva</span>
              <span className="text-gray-200">/</span>
              <span>Envíos a todo el país</span>
            </nav>
          </div>
        </footer>
      </div>
    </CartProvider>
  )
}
