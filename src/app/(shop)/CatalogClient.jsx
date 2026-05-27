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
    return true
  })

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <Filters products={products} filters={filters} setFilters={setFilters} />

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {(() => {
              const totalVisible = products.filter(p => p.visible !== false).length
              return filtered.length === totalVisible
                ? `${totalVisible} productos`
                : `${filtered.length} de ${totalVisible} productos`
            })()}
          </p>

          <button
            onClick={() =>
              setPriceSort(s => (s === null ? 'asc' : s === 'asc' ? 'desc' : null))
            }
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-all ${
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
