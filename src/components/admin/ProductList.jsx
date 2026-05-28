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

/* ── Card mobile para cada producto ── */
function MobileProductCard({ p, onEdit, onDelete, onToggleVisible, onToggleSinStock, saving }) {
  const ptags    = getProductTags(p).map(k => TAG_CONFIG[k]).filter(Boolean)
  const visible  = p.visible !== false
  const sinStock = p.sinStock === true
  const thumb    = p.imagenes?.[0] ?? p.imagen

  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-3 shadow-sm ${!visible ? 'opacity-50' : ''}`}>
      <div className="flex gap-3">
        {/* Thumb */}
        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
          {thumb ? (
            <img src={thumb} alt={p.nombre} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
          ) : (
            <span className="text-2xl">{p.emoji}</span>
          )}
          {(p.imagenes?.length ?? 0) > 1 && (
            <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] leading-none px-1 py-0.5 rounded-tl-lg">
              {p.imagenes.length}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{p.nombre}</p>
            <span className="font-bold text-saro-blue text-sm whitespace-nowrap">
              ${Number(p.precio).toLocaleString('es-AR')}
            </span>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {ptags.map((tag, i) => (
              <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
            {!visible && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Oculto</span>
            )}
            {sinStock && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-gray-500 text-white">Sin stock</span>
            )}
            <span className="text-[10px] text-gray-400 capitalize">{p.categoria} · {p.genero}</span>
          </div>

          {/* Colores */}
          {p.colores?.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {p.colores.slice(0, 6).map(c => (
                <span key={c} title={c} className="w-3 h-3 rounded-full border border-white shadow-sm" style={getSwatchStyle(c)} />
              ))}
              {p.colores.length > 6 && <span className="text-[10px] text-gray-400">+{p.colores.length - 6}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Fechas en mobile */}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
        {p.fechaPublicacion && (
          <span>📅 Pub: {new Date(p.fechaPublicacion).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })}</span>
        )}
        {p.fechaActualizacion && (
          <span>✏️ Edit: {new Date(p.fechaActualizacion).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'2-digit' })}</span>
        )}
      </div>

      {/* Acciones — siempre visibles en mobile */}
      <div className="flex items-center gap-2 mt-2 pt-2.5 border-t border-gray-50">
        <button
          onClick={() => onEdit(p)}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-saro-light text-saro-blue text-xs font-semibold hover:bg-saro-blue hover:text-white transition-colors text-center"
        >
          ✏️ Editar
        </button>
        <button
          onClick={() => onToggleSinStock(p.id)}
          disabled={saving}
          title={sinStock ? 'Marcar con stock' : 'Marcar sin stock'}
          className={`p-2 rounded-lg transition-colors text-xs font-bold ${
            sinStock ? 'bg-gray-500 text-white' : 'text-gray-300 hover:text-gray-600 bg-gray-50'
          }`}
        >
          S
        </button>
        <button
          onClick={() => onToggleVisible(p.id)}
          disabled={saving}
          title={visible ? 'Ocultar' : 'Mostrar'}
          className={`p-2 rounded-lg transition-colors ${
            visible ? 'text-gray-400 bg-gray-50 hover:text-saro-blue' : 'text-gray-400 bg-gray-50 hover:text-green-600'
          }`}
        >
          {visible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
        <button
          onClick={() => onDelete(p.id)}
          disabled={saving}
          className="p-2 rounded-lg bg-red-50 text-red-400 text-xs hover:bg-red-500 hover:text-white transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  )
}

export default function ProductList({ products, onEdit, onDelete, onToggleVisible, onToggleSinStock, saving }) {
  const [search, setSearch]     = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortKey, setSortKey]   = useState('fecha')
  const [sortDir, setSortDir]   = useState('desc')

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc')
      } else {
        // Tercer toque: volver al default
        setSortKey('fecha')
        setSortDir('desc')
      }
    } else {
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
        case 'stock': {
          const sa = a.sinStock ? 0 : 1
          const sb = b.sinStock ? 0 : 1
          return mult * (sa - sb)
        }
        case 'fecha': {
          const da = a.fechaActualizacion
            ? new Date(a.fechaActualizacion).getTime()
            : a.fechaPublicacion ? new Date(a.fechaPublicacion).getTime() : 0
          const db = b.fechaActualizacion
            ? new Date(b.fechaActualizacion).getTime()
            : b.fechaPublicacion ? new Date(b.fechaPublicacion).getTime() : 0
          return mult * (da - db)
        }
        default:
          return 0
      }
    })
  }, [filtered, sortKey, sortDir])

  const SORT_OPTIONS = [
    { key: 'nombre', label: 'Nombre' },
    { key: 'precio', label: 'Precio' },
    { key: 'fecha',  label: 'Fecha' },
    { key: 'visible', label: 'Visibilidad' },
    { key: 'stock',  label: 'Stock' },
  ]

  const thClass = 'text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'
  const thButton = 'inline-flex items-center cursor-pointer hover:text-saro-blue transition-colors select-none'

  return (
    <div className="space-y-5">
      {/* Controles */}
      <div className="space-y-2.5">
        {/* Búsqueda + filtro categoría + contador */}
        <div className="flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
          <div className="flex gap-2 flex-wrap flex-1 min-w-0">
            <input
              type="text"
              placeholder="Buscar producto…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saro-blue w-full sm:w-52"
            />
            <div className="flex gap-1.5">
              {['', 'ropa', 'padel'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
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
          </div>
          <p className="text-xs sm:text-sm text-gray-400 flex-shrink-0">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
            {' · '}
            <span className="text-green-500 font-medium">{filtered.filter(p => p.visible !== false).length} visibles</span>
          </p>
        </div>

        {/* Barra de ordenamiento */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] sm:text-xs text-gray-400 flex-shrink-0 mr-0.5">Ordenar:</span>
          {SORT_OPTIONS.map(opt => {
            const active = sortKey === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => handleSort(opt.key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-medium border transition-all flex-shrink-0 ${
                  active
                    ? 'border-saro-blue text-saro-blue bg-saro-light'
                    : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
                }`}
              >
                {opt.label}
                {active && (
                  <svg viewBox="0 0 10 14" className="w-2.5 h-3" fill="currentColor">
                    <path d="M5 0l4 5H1z" className={sortDir === 'asc' ? 'text-saro-blue' : 'text-gray-300'} />
                    <path d="M5 14l-4-5h8z" className={sortDir === 'desc' ? 'text-saro-blue' : 'text-gray-300'} />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No hay productos que coincidan.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile: Cards ── */}
          <div className="sm:hidden space-y-2">
            {sorted.map(p => (
              <MobileProductCard
                key={p.id}
                p={p}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleVisible={onToggleVisible}
                onToggleSinStock={onToggleSinStock}
                saving={saving}
              />
            ))}
          </div>

          {/* ── Desktop: Table ── */}
          <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thClass}>
                    <button type="button" onClick={() => handleSort('nombre')} className={thButton}>
                      Producto
                      <SortChevron active={sortKey === 'nombre'} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>Filtros</th>
                  <th className={`${thClass} hidden md:table-cell`}>Variantes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <button type="button" onClick={() => handleSort('precio')} className={`${thButton} justify-end`}>
                      Precio
                      <SortChevron active={sortKey === 'precio'} dir={sortDir} />
                    </button>
                  </th>
                  <th className={thClass}>
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
                          {(() => {
                            const thumb = p.imagenes?.[0] ?? p.imagen
                            return (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                                {thumb ? (
                                  <img src={thumb} alt={p.nombre} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
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
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">Oculto</span>
                              )}
                              {sinStock && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-500 text-white">Sin stock</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.descripcion}</p>
                          </div>
                        </div>
                      </td>

                      {/* Filtros */}
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="text-xs text-gray-500 capitalize">{p.categoria}</p>
                          <p className="text-xs text-gray-500 capitalize">{p.genero}</p>
                          <p className="text-xs text-gray-500 capitalize">{p.parteCuerpo}</p>
                        </div>
                      </td>

                      {/* Variantes */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="space-y-1.5">
                          <div className="flex gap-1 flex-wrap">
                            {p.colores.slice(0, 8).map(c => (
                              <span key={c} title={c} className="w-3.5 h-3.5 rounded-full border border-white shadow-sm" style={getSwatchStyle(c)} />
                            ))}
                            {p.colores.length > 8 && <span className="text-xs text-gray-400">+{p.colores.length - 8}</span>}
                          </div>
                          <p className="text-xs text-gray-400">{p.talles.join(' · ')}</p>
                          {p.noStock?.length > 0 && (
                            <p className="text-xs text-red-400">{p.noStock.length} combo{p.noStock.length !== 1 ? 's' : ''} sin stock</p>
                          )}
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-saro-blue">${Number(p.precio).toLocaleString('es-AR')}</span>
                      </td>

                      {/* Fechas */}
                      <td className="px-4 py-3">
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
                          <button
                            onClick={() => onToggleSinStock(p.id)}
                            disabled={saving}
                            title={sinStock ? 'Marcar con stock' : 'Marcar sin stock'}
                            className={`p-1.5 rounded-lg transition-colors text-xs font-bold ${
                              sinStock ? 'bg-gray-500 text-white hover:bg-gray-400' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            S
                          </button>
                          <button
                            onClick={() => onToggleVisible(p.id)}
                            disabled={saving}
                            title={visible ? 'Ocultar en tienda' : 'Mostrar en tienda'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              visible ? 'text-gray-400 hover:text-saro-blue hover:bg-saro-light' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {visible ? <EyeIcon /> : <EyeOffIcon />}
                          </button>
                          {/* Editar y eliminar: hover en desktop */}
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
        </>
      )}
    </div>
  )
}
