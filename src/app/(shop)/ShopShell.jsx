'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CartProvider } from '../../context/CartContext'
import Header from '../../components/Header'
import Cart from '../../components/Cart'
import ChatWidget from '../../components/ChatWidget'

export default function ShopShell({ config, children }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-[#FAFBFC]">
        {/* Primer elemento enfocable de la página: permite saltarse el
            encabezado sin recorrerlo con Tab en cada página. */}
        <a href="#contenido" className="saltar-al-contenido">Saltar al contenido</a>

        <Header config={config} />

        {/* <main> en vez de un div suelto: los lectores de pantalla lo usan para
            ir directo al contenido principal. */}
        <main id="contenido">
          {children}
        </main>

        <Cart config={config} />

        <ChatWidget whatsappNumber={config.whatsappNumber} />

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
            {/* Links reales a las secciones: los usa la gente y también Google
                para descubrir y conectar las páginas del sitio. */}
            <nav aria-label="Secciones" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold">
              <Link href="/paletas" className="text-gray-500 hover:text-saro-blue transition-colors">Paletas</Link>
              <Link href="/ropa-y-accesorios" className="text-gray-500 hover:text-saro-blue transition-colors">Ropa y accesorios</Link>
              <Link href="/ropa-y-accesorios/mayorista" className="text-gray-500 hover:text-saro-blue transition-colors">Catálogo mayorista</Link>
              <Link href="/revendedores" className="text-gray-500 hover:text-saro-blue transition-colors">Revendé SARO</Link>
            </nav>
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
