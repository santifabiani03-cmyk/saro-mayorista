'use client'

import { useState } from 'react'
import { CATEGORIA_LABELS, GENERO_LABELS, PARTE_LABELS, TAG_CONFIG, getProductTags } from '../utils/colors'

/* ── Íconos SVG pequeños para las categorías ─────────────────────── */
const CATEGORIA_ICONS = {
  ropa: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
    </svg>
  ),
  padel: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <circle cx="12" cy="12" r="4.5"/>
    </svg>
  ),
  paleta: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <ellipse cx="12" cy="9" rx="6" ry="8"/>
      <line x1="12" y1="17" x2="12" y2="23" strokeLinecap="round"/>
      <circle cx="10" cy="7" r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="14" cy="7" r="0.7" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="10" r="0.7" fill="currentColor" stroke="none"/>
    </svg>
  ),
}

const PARTE_ICONS = {
  torso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/>
    </svg>
  ),
  piernas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <path d="M6 2h12v6l-2 14H8L6 8V2z"/>
    </svg>
  ),
  accesorio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5">
      <path d="M4 20V10a8 8 0 0116 0v10M4 14h16"/>
      <path d="M8 14v4m8-4v4"/>
    </svg>
  ),
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap ${
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

  // Etiquetas presentes en el catálogo actual
  const activeTags = [...new Set(products.flatMap(p => getProductTags(p)))]
    .filter(k => TAG_CONFIG[k])
    .sort((a, b) => TAG_CONFIG[b].label.length - TAG_CONFIG[a].label.length)

  const Group = ({ label, values, filterKey, labelMap, iconMap }) => (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <div className="flex flex-wrap gap-2">
        {values.map(v => (
          <Chip key={v} active={filters[filterKey] === v} onClick={() => toggle(filterKey, v)}>
            {iconMap?.[v] || null}
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          Filtros
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
            <Group label="Categoría"        values={uniq('categoria')}   filterKey="categoria"   labelMap={CATEGORIA_LABELS} iconMap={CATEGORIA_ICONS} />
            <Group label="Género"           values={uniq('genero')}      filterKey="genero"      labelMap={GENERO_LABELS}    />
            <Group label="Parte del cuerpo" values={uniq('parteCuerpo')} filterKey="parteCuerpo" labelMap={PARTE_LABELS}     iconMap={PARTE_ICONS}     />
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
