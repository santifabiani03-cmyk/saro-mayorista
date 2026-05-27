'use client'
import { useState, useMemo } from 'react'
import { COLOR_MAP, TAG_CONFIG, getProductTags, getSwatchStyle } from '../../utils/colors'

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

/** Chevron arriba/abajo para indicar orden */
function SortChevron({ active, dir }) {
  return (
    <span className={`inline-flex flex-col ml-1 leading-none ${active ? 'text-saro-blue' : 'text-gray-300'}`}>
      <svg viewBox="0 0 10 5" className={`w-2.5 h-1.5 ${active && dir === 'asc' ? 'text-saro-blue' : ''}`} fill="currentColor">
        <path d="M5 0l5 5H0z"/>
      </svg>
      <svg viewBox="0 0 10 5" className={`w-2.5 h-1.5 ${active && dir === 'desc' ? 'text-saro-blue' : ''}`} fill="currentColor">
        <path d="M5 5L0 0h10z"/>
      </svg>
    </span>
  )
}

export default function ProductList({ products, onEdit, onDelete, onToggleVisible, onToggleSinStock, saving }) {
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortKey, setSortKey]   = useState(null)   // 'nombre' | 'precio' | 'visible' | 'fecha'
  const [sortDir, setSortDir]   = useState('asc')  // 'asc' | 'desc'

  const handleSort = (key) => {
    if (sortKey === key) {
      // Mismo campo: toggle dirección
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      // Nuevo campo: activar ascendente
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase())
    const matchCat    = filterCat ? p.categoria === filterCat : true
    return matchSearch && matchCat
  })

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const mult = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'nombre':
          return mult * a.nombre.localeCompare(b.nombre, 'es')
        case 'precio':
          return mult * (Number(a.precio) - Number(b.precio))
        case 'visible': {
          const va = a.visible === false ? 0 : 1
          const vb = b.visible === false ? 0 : 1
          return mult * (va - vb)
        }
        case 'fecha': {
          const da = a.fechaPublicacion ? new Date(a.fechaPublicacion).getTime() : 0
          const db = b.fechaPublicacion ? new Date(b.fechaPublicacion).getTime() : 0
          return mult * (da - db)
        }
        default:
          return 0
      }
    })
  }, [filtered, sortKey, sortDir])

  const thClass = 'text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'
  const thButton = 'inline-flex items-center cursor-pointer hover:text-saro-blue transition-colors select-none'

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Buscar producto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saro-blue w-52"
          />
          {['', 'ropa', 'padel'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                filterCat === cat
                  ? 'bg-saro-blue border-saro-blue text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
              }`}
            >
              {cat === ''     ? 'Todos'    :
               cat === 'ropa' ? '👕 Ropa'  : '🏓 Pádel'}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
          {' · '}
          <span className="text-green-500 font-medium">{filtered.filter(p => p.visible !== false).length} visibles</span>
        </p>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No hay productos que coincidan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className={thClass}>
                  <button type="button" onClick={() => handleSort('nombre')} className={thButton}>
                    Producto
                    <SortChevron active={sortKey === 'nombre'} dir={sortDir} />
                  </button>
                </th>
                <th className={`${thClass} hidden sm:table-cell`}>Filtros</th>
                <th className={`${thClass} hidden md:table-cell`}>Variantes</th>
                <th className={`text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide`}>
                  <button type="button" onClick={() => handleSort('precio')} className={`${thButton} justify-end`}>
                    Precio
                    <SortChevron active={sortKey === 'precio'} dir={sortDir} />
                  </button>
                </th>
                <th className={`${thClass} hidden lg:table-cell`}>
                  <button type="button" onClick={() => handleSort('fecha')} className={thButton}>
                    Fechas
                    <SortChevron active={sortKey === 'fecha'} dir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button type="button" onClick={() => handleSort('visible')} className={thButton} title="Ordenar por visibilidad">
                    <EyeIcon />
                    <SortChevron active={sortKey === 'visible'} dir={sortDir} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map(p => {
                const ptags    = getProductTags(p).map(k => TAG_CONFIG[k]).filter(Boolean)
                const visible  = p.visible !== false
                const sinStock = p.sinStock === true
                return (
                  <tr key={p.id} className={`hover:bg-gray-50/60 transition-colors group ${!visible ? 'opacity-40' : ''}`}>

                    {/* Producto */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Thumb */}
                        {(() => {
                          const thumb = p.imagenes?.[0] ?? p.imagen
                          return (
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt={p.nombre}
                                  className="w-full h-full object-cover"
                                  onError={e => { e.target.style.display = 'none' }}
                                />
                              ) : (
                                <span className="text-xl">{p.emoji}</span>
                              )}
                              {(p.imagenes?.length ?? 0) > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] leading-none px-1 py-0.5 rounded-tl-lg">
                                  {p.imagenes.length}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                        <div>
                          <p className="font-semibold text-gray-900 leading-tight">{p.nombre}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {ptags.map((tag, i) => (
                              <span key={i} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tag.cls}`}>
                                {tag.label}
                              </span>
                            ))}
                            {!visible && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                                Oculto
                              </span>
                            )}
                            {sinStock && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-500 text-white">
                                Sin stock
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.descripcion}</p>
                        </div>
                      </div>
                    </td>

                    {/* Filtros */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-500 capitalize">{p.categoria}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.genero}</p>
                        <p className="text-xs text-gray-500 capitalize">{p.parteCuerpo}</p>
                      </div>
                    </td>

                    {/* Variantes */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-1.5">
                        {/* Swatches de colores */}
                        <div className="flex gap-1 flex-wrap">
                          {p.colores.slice(0, 8).map(c => (
                            <span
                              key={c}
                              title={c}
                              className="w-3.5 h-3.5 rounded-full border border-white shadow-sm"
                              style={getSwatchStyle(c)}
                            />
                          ))}
                          {p.colores.length > 8 && (
                            <span className="text-xs text-gray-400">+{p.colores.length - 8}</span>
                          )}
                        </div>
                        {/* Talles */}
                        <p className="text-xs text-gray-400">{p.talles.join(' · ')}</p>
                        {/* Sin stock */}
                        {p.noStock?.length > 0 && (
                          <p className="text-xs text-red-400">
                            {p.noStock.length} combo{p.noStock.length !== 1 ? 's' : ''} sin stock
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Precio */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-saro-blue">
                        ${Number(p.precio).toLocaleString('es-AR')}
                      </span>
                    </td>

                    {/* Fechas */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-1">
                        {p.fechaPublicacion ? (
                          <div>
                            <p className="text-xs text-gray-400">Publicado</p>
                            <p className="text-xs font-medium text-gray-600">
                              {new Date(p.fechaPublicacion).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 italic">Sin fecha</p>
                        )}
                        {p.fechaActualizacion && (
                          <div>
                            <p className="text-xs text-gray-400">Editado</p>
                            <p className="text-xs font-medium text-gray-500">
                              {new Date(p.fechaActualizacion).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end items-center">
                        {/* Toggle sin stock */}
                        <button
                          onClick={() => onToggleSinStock(p.id)}
                          disabled={saving}
                          title={sinStock ? 'Marcar con stock' : 'Marcar sin stock'}
                          className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${
                            sinStock
                              ? 'bg-gray-500 text-white hover:bg-gray-400'
                              : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          S
                        </button>

                        {/* Ojo: siempre visible */}
                        <button
                          onClick={() => onToggleVisible(p.id)}
                          disabled={saving}
                          title={visible ? 'Ocultar en tienda' : 'Mostrar en tienda'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            visible
                              ? 'text-gray-400 hover:text-saro-blue hover:bg-saro-light'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {visible ? <EyeIcon /> : <EyeOffIcon />}
                        </button>

                        {/* Editar y eliminar: solo al hover */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(p)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-saro-light text-saro-blue text-xs font-semibold hover:bg-saro-blue hover:text-white transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => onDelete(p.id)}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
