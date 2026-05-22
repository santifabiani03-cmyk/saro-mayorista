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
  const uniq = key => [...new Set(products.map(p => p[key]))]

  const toggle = (key, val) =>
    setFilters(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }))

  const hasActive = Object.values(filters).some(Boolean)

  // Etiquetas presentes en el catálogo actual
  const activeTags = [...new Set(products.flatMap(p => getProductTags(p)))]
    .filter(k => TAG_CONFIG[k])

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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span>🔎</span> Filtros
        </h2>
        {hasActive && (
          <button
            onClick={() => setFilters({ categoria: '', genero: '', parteCuerpo: '', tag: '' })}
            className="text-xs text-saro-blue hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Group label="Categoría"       values={uniq('categoria')}   filterKey="categoria"   labelMap={CATEGORIA_LABELS} />
        <Group label="Género"          values={uniq('genero')}      filterKey="genero"      labelMap={GENERO_LABELS}    />
        <Group label="Parte del cuerpo" values={uniq('parteCuerpo')} filterKey="parteCuerpo" labelMap={PARTE_LABELS}     />
      </div>

      {activeTags.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Etiquetas</span>
            <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      )}
    </div>
  )
}
