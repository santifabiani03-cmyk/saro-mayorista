'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Filters from '../../components/Filters'
import ProductCard from '../../components/ProductCard'
import ProductModal from '../../components/ProductModal'
import FaqSection from '../../components/FaqSection'
import { toSlug } from '../../utils/slug'

export default function CatalogClient({ products }) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    categoria: '',
    genero: '',
    parteCuerpo: '',
    tag: '',
  })
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelected] = useState(null)
  const [priceSort, setPriceSort] = useState(null)

  const filtered = products.filter(p => {
    if (p.visible === false) return false
    if (filters.categoria && p.categoria !== filters.categoria) return false
    if (filters.genero && p.genero !== filters.genero) return false
    if (filters.parteCuerpo && p.parteCuerpo !== filters.parteCuerpo) return false
    if (filters.tag) {
      const ptags = Array.isArray(p.tags) ? p.tags : p.tag ? [p.tag] : []
      if (!ptags.includes(filters.tag)) return false
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const hay = [p.nombre, p.categoria, p.genero, p.descripcion]
        .filter(Boolean)
        .some(s => s.toLowerCase().includes(q))
      if (!hay) return false
    }
    return true
  })

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* H1 SEO — visible, compacto, no molesta al usuario */}
        <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
          Catalogo mayorista de paletas de padel, accesorios y ropa deportiva
        </h1>

        <Filters products={products} filters={filters} setFilters={setFilters} />

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500 flex-shrink-0">
            {(() => {
              const totalVisible = products.filter(p => p.visible !== false).length
              return filtered.length === totalVisible
                ? `${totalVisible} productos`
                : `${filtered.length} de ${totalVisible} productos`
            })()}
          </p>

          <div className="flex items-center gap-2">
            {/* Buscador compacto */}
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-32 sm:w-40 pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-700 placeholder-gray-300 focus:outline-none focus:border-saro-blue focus:bg-white focus:w-48 sm:focus:w-56 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 text-[10px] flex items-center justify-center transition-colors leading-none"
                >
                  x
                </button>
              )}
            </div>

            <button
              onClick={() =>
                setPriceSort(s => (s === null ? 'asc' : s === 'asc' ? 'desc' : null))
              }
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-all flex-shrink-0 ${
                priceSort
                  ? 'border-saro-blue text-saro-blue bg-saro-light font-semibold'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span>Precio</span>
              <svg viewBox="0 0 10 14" className="w-3 h-3.5" fill="currentColor">
                <path
                  d="M5 0l4 5H1z"
                  className={priceSort === 'asc' ? 'text-saro-blue' : 'text-gray-300'}
                />
                <path
                  d="M5 14l-4-5h8z"
                  className={priceSort === 'desc' ? 'text-saro-blue' : 'text-gray-300'}
                />
              </svg>
            </button>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(() => {
              const list = priceSort
                ? [...filtered].sort(
                    (a, b) =>
                      (priceSort === 'asc' ? 1 : -1) *
                      (Number(a.precio) - Number(b.precio))
                  )
                : filtered
              return list.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onClick={() => setSelected(p)}
                  onNavigate={() =>
                    router.push(`/producto/${toSlug(p.nombre, p.id)}`)
                  }
                />
              ))
            })()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-4">
            <span className="text-5xl">🔍</span>
            <p className="font-medium">No hay productos con esos filtros.</p>
            <button
              onClick={() =>
                setFilters({ categoria: '', genero: '', parteCuerpo: '', tag: '' })
              }
              className="text-sm text-saro-blue hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        <FaqSection />
      </main>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
