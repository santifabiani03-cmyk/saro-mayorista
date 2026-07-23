'use client'

import { useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useCart } from '../context/CartContext'
import HowToBuyModal from './HowToBuyModal'

export default function Header({ config }) {
  const { totalItems, isOpen, setIsOpen } = useCart()
  const [showHowTo, setShowHowTo] = useState(false)
  const pathname = usePathname()
  // En la landing el header flota transparente sobre el hero (sin barra de
  // compra mínima ni carrito). En el resto de las páginas es la barra sólida.
  const isLanding = pathname === '/'

  return (
    <>
      <header
        className={
          isLanding
            ? 'absolute top-0 inset-x-0 z-30'
            : 'bg-white/80 backdrop-blur-xl border-b border-gray-100/60 sticky top-0 z-30 shadow-sm'
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">

          {/* Logo */}
          <a href="/" className="flex-shrink-0" aria-label="SARO Mayorista - Inicio">
            <Image
              src="/assets/logo-icon.png"
              alt="SARO - Ropa deportiva y accesorios de padel mayorista"
              width={44}
              height={44}
              className="block sm:hidden h-11 w-auto object-contain"
              priority
            />
            <Image
              src="/assets/logo-horizontal.png"
              alt="SARO Mayorista - Indumentaria deportiva y padel al por mayor"
              width={220}
              height={56}
              className="hidden sm:block h-14 w-auto object-contain"
              priority
            />
          </a>

          <div className="flex items-center gap-2.5 sm:gap-3">

            {/* Badge mínimo de compra (no en la landing) */}
            {!isLanding && (
              <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-saro-light to-blue-50 text-saro-dark px-3.5 py-2 rounded-full text-sm font-medium border border-blue-100/60">
                <span className="text-saro-blue font-bold text-xs tracking-tight">Compra mín. sugerida:</span>
                <span className="font-extrabold text-saro-dark">
                  ${(config.suggestedMinPurchase ?? config.minPurchase).toLocaleString('es-AR')}
                </span>
              </div>
            )}

            {/* Botón ¿Cómo comprar? */}
            <button
              onClick={() => setShowHowTo(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border-2 border-saro-blue/20 text-saro-blue hover:bg-saro-blue hover:text-white hover:border-saro-blue transition-all duration-200 text-sm font-semibold btn-press"
              title="¿Cómo comprar?"
            >
              ¿Cómo comprar?
            </button>

            {/* Botón WhatsApp */}
            <a
              href={`https://wa.me/${config.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-all duration-200 shadow-md shadow-emerald-500/20 btn-press"
              title="Contactar por WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </a>

            {/* Botón carrito (no en la landing) */}
            {!isLanding && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center gap-2 bg-saro-dark hover:bg-saro-blue text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-saro-dark/20 btn-press"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <span className="hidden sm:inline">Carrito</span>
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-saro-accent text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold leading-none shadow-sm">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Badge móvil mínimo (no en la landing) */}
        {!isLanding && (
          <div className="sm:hidden bg-gradient-to-r from-saro-light to-blue-50 px-4 py-2 text-center text-xs text-saro-dark font-medium border-t border-blue-100/40">
            Compra mín. sugerida: <strong className="text-saro-blue">${(config.suggestedMinPurchase ?? config.minPurchase).toLocaleString('es-AR')}</strong>
          </div>
        )}
      </header>

      {/* Modal ¿Cómo comprar? */}
      {showHowTo && <HowToBuyModal onClose={() => setShowHowTo(false)} />}
    </>
  )
}
