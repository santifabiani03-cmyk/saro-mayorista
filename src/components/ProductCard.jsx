import { COLOR_MAP, TAG_CONFIG, getProductTags, getSwatchStyle } from '../utils/colors'
import ImageCarousel from './ImageCarousel'

// Compatibilidad: soporta campo legacy `imagen` (string) y nuevo `imagenes` (array)
const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

export default function ProductCard({ product, onClick }) {
  const tags = getProductTags(product)
    .map(k => TAG_CONFIG[k]).filter(Boolean)
    .sort((a, b) => b.label.length - a.label.length)
  const imgs = getImages(product)

  // sinStock: campo explícito del admin, o calculado si todos los combos están sin stock
  const totalCombos = product.colores.length * product.talles.length
  const sinStock    = product.sinStock === true ||
                      (totalCombos > 0 && product.noStock?.length === totalCombos)

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Imagen / carrusel */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <ImageCarousel images={imgs} emoji={product.emoji} compact />

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
              style={getSwatchStyle(c)}
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
