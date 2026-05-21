import { CATEGORIA_LABELS, GENERO_LABELS, PARTE_LABELS } from '../utils/colors'

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
            onClick={() => setFilters({ categoria: '', genero: '', parteCuerpo: '' })}
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
    </div>
  )
}
