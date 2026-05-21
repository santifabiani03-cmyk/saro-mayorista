import { COLOR_MAP, TAG_CONFIG } from '../utils/colors'
import ImageCarousel from './ImageCarousel'

// Compatibilidad: soporta campo legacy `imagen` (string) y nuevo `imagenes` (array)
const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

export default function ProductCard({ product, onClick }) {
  const tag  = TAG_CONFIG[product.tag]
  const imgs = getImages(product)

  const totalCombos = product.colores.length * product.talles.length
  const sinStock    = product.noStock?.length === totalCombos

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Imagen / carrusel */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <ImageCarousel images={imgs} emoji={product.emoji} compact />

        {tag && (
          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-semibold ${tag.cls}`}>
            {tag.label}
          </span>
        )}

        {sinStock && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-700 text-white text-xs font-medium px-3 py-1 rounded-full">
              Sin stock
            </span>
          </div>
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
              style={{ backgroundColor: COLOR_MAP[c] ?? '#e5e7eb' }}
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
