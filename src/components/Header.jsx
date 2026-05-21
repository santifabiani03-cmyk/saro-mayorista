import { useCart } from '../context/CartContext'

export default function Header({ config }) {
  const { totalItems, isOpen, setIsOpen } = useCart()

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

        {/* Logo */}
        <img
          src="/assets/logo.png"
          alt={config.storeName}
          className="h-10 w-auto object-contain"
          onError={e => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'block'
          }}
        />
        <span
          className="hidden text-2xl font-extrabold text-saro-blue tracking-tight"
          style={{ display: 'none' }}
        >
          SARO
        </span>

        <div className="flex items-center gap-3">
          {/* Badge mínimo de compra */}
          <div className="hidden sm:flex items-center gap-1.5 bg-saro-light text-saro-dark px-3 py-1.5 rounded-full text-sm font-medium">
            <span className="text-saro-blue font-bold">Compra mínima:</span>
            <span className="font-bold">
              ${config.minPurchase.toLocaleString('es-AR')}
            </span>
          </div>

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
        Compra mínima: <strong>${config.minPurchase.toLocaleString('es-AR')}</strong>
      </div>
    </header>
  )
}
