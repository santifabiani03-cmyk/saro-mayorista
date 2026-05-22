import { useState } from 'react'
import { useCart } from '../context/CartContext'
import HowToBuyModal from './HowToBuyModal'

export default function Header({ config }) {
  const { totalItems, isOpen, setIsOpen } = useCart()
  const [showHowTo, setShowHowTo] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Logo — ícono SR en mobile, horizontal completo en desktop */}
          <img
            src="/assets/logo-icon.png"
            alt={config.storeName}
            className="block sm:hidden h-11 w-auto object-contain"
          />
          <img
            src="/assets/logo-horizontal.png"
            alt={config.storeName}
            className="hidden sm:block h-14 w-auto object-contain"
          />

          <div className="flex items-center gap-3">

            {/* Badge mínimo de compra */}
            <div className="hidden sm:flex items-center gap-1.5 bg-saro-light text-saro-dark px-3 py-1.5 rounded-full text-sm font-medium">
              <span className="text-saro-blue font-bold">Compra mín. sugerida:</span>
              <span className="font-bold">
                ${config.minPurchase.toLocaleString('es-AR')}
              </span>
            </div>

            {/* Botón ¿Cómo comprar? */}
            <button
              onClick={() => setShowHowTo(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-saro-blue text-saro-blue hover:bg-saro-blue hover:text-white transition-colors text-sm font-semibold"
              title="¿Cómo comprar?"
            >
              ¿Cómo comprar?
            </button>

            {/* Botón WhatsApp */}
            <a
              href={`https://wa.me/${config.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 transition-colors shadow-sm shadow-green-200"
              title="Contactar por WhatsApp"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </a>

            {/* Botón carrito */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="relative flex items-center gap-2 bg-saro-blue hover:bg-saro-dark text-white px-4 py-2 rounded-xl font-semibold text-sm transition-colors"
            >
              <span className="text-base">🛒</span>
              <span className="hidden sm:inline">Carrito</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold leading-none">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Badge móvil mínimo */}
        <div className="sm:hidden bg-saro-light px-4 py-1.5 text-center text-xs text-saro-dark font-medium border-t border-saro-light">
          Compra mín. sugerida: <strong>${config.minPurchase.toLocaleString('es-AR')}</strong>
        </div>
      </header>

      {/* Modal ¿Cómo comprar? */}
      {showHowTo && <HowToBuyModal onClose={() => setShowHowTo(false)} />}
    </>
  )
}
