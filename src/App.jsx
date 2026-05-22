import { useState, useEffect } from 'react'
import { CartProvider } from './context/CartContext'
import Header       from './components/Header'
import Filters      from './components/Filters'
import ProductCard  from './components/ProductCard'
import ProductModal from './components/ProductModal'
import Cart         from './components/Cart'
import AdminPage    from './pages/AdminPage'

const IS_ADMIN = window.location.pathname.startsWith('/admin')

export default function App() {
  if (IS_ADMIN) return <AdminPage />

  const [products, setProducts]        = useState([])
  const [config,   setConfig]          = useState(null)
  const [filters,  setFilters]         = useState({ categoria: '', genero: '', parteCuerpo: '', tag: '' })
  const [selectedProduct, setSelected] = useState(null)
  const [loading,  setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/catalog').then(r => r.json()),
      fetch('/config.json').then(r => r.json()),
    ]).then(([prods, cfg]) => {
      setProducts(prods)
      setConfig(cfg)
      setLoading(false)
    })
  }, [])

  const filtered = products.filter(p => {
    if (p.visible === false) return false
    if (filters.categoria   && p.categoria   !== filters.categoria)   return false
    if (filters.genero      && p.genero      !== filters.genero)      return false
    if (filters.parteCuerpo && p.parteCuerpo !== filters.parteCuerpo) return false
    if (filters.tag) {
      const ptags = Array.isArray(p.tags) ? p.tags : p.tag ? [p.tag] : []
      if (!ptags.includes(filters.tag)) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="text-5xl animate-bounce">🏓</div>
          <p className="text-gray-500 font-medium">Cargando catálogo…</p>
        </div>
      </div>
    )
  }

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-50">
        <Header config={config} />

        <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          <Filters products={products} filters={filters} setFilters={setFilters} />

          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {filtered.length === products.length
                ? `${products.length} productos`
                : `${filtered.length} de ${products.length} productos`}
            </p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onClick={() => setSelected(p)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
              <span className="text-5xl">🔍</span>
              <p className="font-medium">No hay productos con esos filtros.</p>
              <button
                onClick={() => setFilters({ categoria: '', genero: '', parteCuerpo: '', tag: '' })}
                className="text-sm text-saro-blue hover:underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </main>

        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelected(null)} />
        )}

        <Cart config={config} />
      </div>
    </CartProvider>
  )
}
