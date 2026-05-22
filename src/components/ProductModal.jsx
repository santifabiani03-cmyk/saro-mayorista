import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { COLOR_MAP, TAG_CONFIG, SIZE_ORDER, getProductTags, getSwatchStyle } from '../utils/colors'
import ImageCarousel from './ImageCarousel'

// Compatibilidad: soporta campo legacy `imagen` (string) y nuevo `imagenes` (array)
const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

function buildMatrix(colores, talles) {
  const m = {}
  colores.forEach(c => { m[c] = {}; talles.forEach(t => { m[c][t] = 0 }) })
  return m
}

export default function ProductModal({ product, onClose }) {
  const { addItems } = useCart()

  // Talles ordenados canónicamente (XS → S → M → L → XL → XXL …)
  const sortedTalles = [...product.talles].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a)
    const ib = SIZE_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })

  const [matrix, setMatrix] = useState(() => buildMatrix(product.colores, sortedTalles))
  const imgs = getImages(product)

  // Bloquear scroll del body mientras el modal esté abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const isNoStock = (color, talle) =>
    product.noStock?.some(ns => ns.color === color && ns.talle === talle)

  const updateQty = (color, talle, delta) => {
    if (isNoStock(color, talle)) return
    setMatrix(prev => ({
      ...prev,
      [color]: { ...prev[color], [talle]: Math.max(0, (prev[color][talle] ?? 0) + delta) },
    }))
  }

  const totalUnidades = product.colores.reduce(
    (s, c) => s + sortedTalles.reduce((ss, t) => ss + (matrix[c]?.[t] ?? 0), 0), 0
  )

  const handleAgregar = () => {
    const selections = []
    product.colores.forEach(color =>
      sortedTalles.forEach(talle => {
        const qty = matrix[color]?.[talle] ?? 0
        if (qty > 0) selections.push({ color, talle, cantidad: qty })
      })
    )
    if (selections.length > 0) addItems(product, selections)
    onClose()
  }

  const tags = getProductTags(product).map(k => TAG_CONFIG[k]).filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{product.nombre}</h2>
              {tags.map((tag, i) => (
                <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tag.cls}`}>
                  {tag.label}
                </span>
              ))}
            </div>
            <p className="text-2xl font-extrabold text-saro-blue mt-0.5">
              ${product.precio.toLocaleString('es-AR')}
              <span className="text-sm font-normal text-gray-400 ml-1">c/u</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl p-1.5 text-xl leading-none transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* ── Cuerpo ── */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* ── Galería con carrusel ── */}
            <div className="space-y-3">
              <ImageCarousel images={imgs} emoji={product.emoji} thumbs />
              <p className="text-sm text-gray-600 leading-relaxed">{product.descripcion}</p>
            </div>

            {/* ── Matriz color × talle ── */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800">Seleccioná cantidades</h3>

              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm min-w-max">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium text-xs">Color</th>
                      {sortedTalles.map(t => (
                        <th key={t} className="py-2 px-2 text-center text-gray-500 font-medium text-xs min-w-[68px]">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.colores.map((color, ci) => (
                      <tr key={color} className={ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                              style={getSwatchStyle(color, product.colorDefs)}
                            />
                            <span className="text-xs text-gray-700 whitespace-nowrap">{color}</span>
                          </div>
                        </td>
                        {sortedTalles.map(talle => {
                          const noStock = isNoStock(color, talle)
                          const qty     = matrix[color]?.[talle] ?? 0
                          return (
                            <td key={talle} className="py-1.5 px-1 text-center">
                              {noStock ? (
                                <span className="text-gray-300 text-base">✕</span>
                              ) : (
                                <div className="flex items-center justify-center gap-0.5">
                                  <button
                                    onClick={() => updateQty(color, talle, -1)}
                                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-red-100 hover:text-red-600 text-gray-600 text-xs font-bold transition-colors flex items-center justify-center"
                                  >−</button>
                                  <span className={`w-6 text-center text-xs font-bold tabular-nums ${qty > 0 ? 'text-saro-blue' : 'text-gray-300'}`}>
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => updateQty(color, talle, 1)}
                                    className="w-6 h-6 rounded-md bg-gray-100 hover:bg-green-100 hover:text-green-700 text-gray-600 text-xs font-bold transition-colors flex items-center justify-center"
                                  >+</button>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {product.sinStock && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="text-red-500 text-base flex-shrink-0 mt-0.5">⚠️</span>
                  <p className="text-xs text-red-700 leading-relaxed">
                    <span className="font-bold">Es muy probable que ya no contemos con stock de este producto.</span>
                    {' '}Igualmente podés consultarnos, con gusto te ayudamos a encontrar una alternativa.
                  </p>
                </div>
              )}

              {/* Promos por cantidad */}
              {product.promos?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500">🔥 Promos por cantidad:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.promos.map((p, i) => {
                      const ppu = p.precioTotal / p.cantidad
                      const active = totalUnidades >= p.cantidad
                      return (
                        <span key={i} className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                          active
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}>
                          {p.cantidad}u → ${p.precioTotal.toLocaleString('es-AR')} (${Math.round(ppu).toLocaleString('es-AR')}/u)
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {totalUnidades > 0 && (() => {
                const promos = product.promos ?? []
                const applicable = promos
                  .filter(p => totalUnidades >= p.cantidad)
                  .sort((a, b) => b.cantidad - a.cantidad)[0]
                const precioUnit = applicable
                  ? applicable.precioTotal / applicable.cantidad
                  : product.precio
                const totalConPromo = Math.round(totalUnidades * precioUnit)
                const totalSinPromo = totalUnidades * product.precio
                const ahorro = totalSinPromo - totalConPromo

                return (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between bg-saro-light rounded-xl px-4 py-3">
                      <span className="text-sm font-medium text-saro-dark">
                        {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''} seleccionada{totalUnidades !== 1 ? 's' : ''}
                      </span>
                      <div className="text-right">
                        {ahorro > 0 && (
                          <span className="text-xs text-gray-400 line-through mr-2">
                            ${totalSinPromo.toLocaleString('es-AR')}
                          </span>
                        )}
                        <span className="font-extrabold text-saro-blue">
                          ${totalConPromo.toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                    {ahorro > 0 && (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                        <span className="text-xs text-green-700 font-medium">
                          💰 Ahorrás ${ahorro.toLocaleString('es-AR')} con la promo de {applicable.cantidad}u
                        </span>
                        <span className="text-xs font-bold text-green-600">
                          ${Math.round(precioUnit).toLocaleString('es-AR')}/u
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgregar}
            disabled={totalUnidades === 0}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-colors ${
              totalUnidades > 0
                ? 'bg-saro-blue hover:bg-saro-dark text-white shadow-sm'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {totalUnidades > 0
              ? `Agregar ${totalUnidades} al carrito`
              : 'Seleccioná cantidades'}
          </button>
        </div>
      </div>
    </div>
  )
}
