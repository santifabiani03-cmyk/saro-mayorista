import { useState } from 'react'
import { CATEGORIA_LABELS, GENERO_LABELS, PARTE_LABELS, TAG_CONFIG, getProductTags } from '../utils/colors'

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
        active
          ? 'bg-saro-blue border-saro-blue text-white shadow-sm'
          : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue hover:text-saro-blue'
      }`}
    >
      {children}
    </button>
  )
}

export default function Filters({ products, filters, setFilters }) {
  const [open, setOpen]         = useState(true)
  const [tagsOpen, setTagsOpen] = useState(false)

  const uniq = key => [...new Set(products.map(p => p[key]).filter(Boolean))]

  const toggle = (key, val) =>
    setFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))

  const hasActive = Object.values(filters).some(Boolean)

  // Etiquetas presentes en el catálogo actual, ordenadas de más largo a más corto
  const activeTags = [...new Set(products.flatMap(p => getProductTags(p)))]
    .filter(k => TAG_CONFIG[k])
    .sort((a, b) => TAG_CONFIG[b].label.length - TAG_CONFIG[a].label.length)

  const Group = ({ label, values, filterKey, labelMap }) => (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <Chip key={v} active={filters[filterKey] === v} onClick={() => toggle(filterKey, v)}>
            {labelMap[v] ?? v}
          </Chip>
        ))}
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 font-semibold text-gray-800"
        >
          <span>🔎</span> Filtros
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {hasActive && (
          <button
            onClick={() => setFilters({ categoria: '', genero: '', parteCuerpo: '', tag: '' })}
            className="text-xs text-saro-blue hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Group label="Categoría"        values={uniq('categoria')}   filterKey="categoria"   labelMap={CATEGORIA_LABELS} />
            <Group label="Género"           values={uniq('genero')}      filterKey="genero"      labelMap={GENERO_LABELS}    />
            <Group label="Parte del cuerpo" values={uniq('parteCuerpo')} filterKey="parteCuerpo" labelMap={PARTE_LABELS}     />
          </div>

          {activeTags.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <button
                onClick={() => setTagsOpen(o => !o)}
                className="flex items-center justify-between w-full"
              >
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Etiquetas
                  {filters.tag && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-saro-blue text-white text-[10px] normal-case font-bold">
                      {TAG_CONFIG[filters.tag]?.label}
                    </span>
                  )}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${tagsOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {tagsOpen && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {activeTags.map(k => {
                    const tag = TAG_CONFIG[k]
                    return (
                      <button
                        key={k}
                        onClick={() => toggle('tag', k)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
                          filters.tag === k
                            ? 'bg-saro-blue border-saro-blue text-white shadow-sm'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue hover:text-saro-blue'
                        }`}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
