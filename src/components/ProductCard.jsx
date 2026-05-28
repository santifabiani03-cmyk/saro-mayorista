'use client'

import { COLOR_MAP, TAG_CONFIG, getProductTags, getSwatchStyle } from '../utils/colors'
import ImageCarousel from './ImageCarousel'

// Compatibilidad: soporta campo legacy `imagen` (string) y nuevo `imagenes` (array)
const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

/* ── Card estándar (ropa / padel) ───────────────────────────────── */
function StandardCard({ product, onClick, tags, imgs, sinStock }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Imagen / carrusel */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <ImageCarousel images={imgs} emoji={product.emoji} compact altText={product.nombre} />

        {tags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {tags.map((tag, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {sinStock && (
          <span className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
            Sin stock
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
          {product.nombre}
        </p>
        <p className="text-xs text-gray-400 capitalize">
          {product.categoria} · {product.genero}
        </p>

        {/* Swatches de colores */}
        <div className="flex items-center gap-1 flex-wrap">
          {product.colores.slice(0, 6).map(c => (
            <span
              key={c}
              title={c}
              className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0"
              style={getSwatchStyle(c, product.colorDefs)}
            />
          ))}
          {product.colores.length > 6 && (
            <span className="text-xs text-gray-400">+{product.colores.length - 6}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-saro-blue text-base">
            ${product.precio.toLocaleString('es-AR')}
          </span>
          <span className="text-xs bg-saro-light text-saro-blue px-2.5 py-1 rounded-full font-semibold">
            Ver →
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── Card especial para paletas ─────────────────────────────────── */
function PaletaCard({ product, onClick, tags, imgs, sinStock }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative">
        {/* Imagen de la paleta — aspect ratio más alto para mostrar la forma completa */}
        <div className="relative aspect-[3/4] bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden flex items-center justify-center p-4">
          {imgs.length > 0 ? (
            <img
              src={imgs[0]}
              alt={product.nombre}
              className="max-w-full max-h-full object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={e => { e.currentTarget.style.opacity = '0.3' }}
            />
          ) : (
            <span className="text-7xl select-none">🏓</span>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
              {tags.map((tag, i) => (
                <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${tag.cls}`}>
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Logo SR pequeño arriba derecha */}
          <img
            src="/assets/logo-icon.png"
            alt=""
            className="absolute top-2.5 right-2.5 w-7 h-7 opacity-20"
          />

          {sinStock && (
            <span className="absolute top-2 right-2 bg-gray-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm">
              Sin stock
            </span>
          )}
        </div>

        {/* Info overlay inferior */}
        <div className="p-3 space-y-2 border-t border-gray-50">
          {/* Nombre */}
          <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
            {product.nombre}
          </p>

          {/* Row: precio + colores */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-saro-blue text-base">
              ${product.precio.toLocaleString('es-AR')}
            </span>

            {/* Colores */}
            <div className="flex items-center gap-1">
              {product.colores.slice(0, 5).map(c => (
                <span
                  key={c}
                  title={c}
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={getSwatchStyle(c, product.colorDefs)}
                />
              ))}
              {product.colores.length > 5 && (
                <span className="text-xs text-gray-400 ml-0.5">+{product.colores.length - 5}</span>
              )}
            </div>
          </div>

          {/* Ver → */}
          <div className="flex justify-end">
            <span className="text-xs bg-saro-light text-saro-blue px-2.5 py-1 rounded-full font-semibold">
              Ver →
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Exportación principal ──────────────────────────────────────── */
export default function ProductCard({ product, onClick, onNavigate }) {
  const tags = getProductTags(product)
    .map(k => TAG_CONFIG[k]).filter(Boolean)
    .sort((a, b) => b.label.length - a.label.length)
  const imgs = getImages(product)

  // sinStock: campo explícito del admin, o calculado si todos los combos están sin stock
  const totalCombos = product.colores.length * product.talles.length
  const sinStock    = product.sinStock === true ||
                      (totalCombos > 0 && product.noStock?.length === totalCombos)

  const isPaleta = product.categoria === 'paleta'

  if (isPaleta) {
    return <PaletaCard product={product} onClick={onClick} tags={tags} imgs={imgs} sinStock={sinStock} />
  }

  return <StandardCard product={product} onClick={onClick} tags={tags} imgs={imgs} sinStock={sinStock} />
}
