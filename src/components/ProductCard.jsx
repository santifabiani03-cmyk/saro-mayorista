'use client'

import { COLOR_MAP, TAG_CONFIG, getProductTags, getSwatchStyle } from '../utils/colors'
import ImageCarousel from './ImageCarousel'

const getImages = p => p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []

/* ── Card estándar (ropa / padel) ───────────────────────────────── */
function StandardCard({ product, onClick, tags, imgs, sinStock }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden cursor-pointer group hover:shadow-card-hover hover:-translate-y-1 transition duration-300 ease-out"
    >
      {/* Imagen / carrusel */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-hidden">
        <ImageCarousel images={imgs} emoji={product.emoji} compact altText={product.nombre} />

        {tags.length > 0 && (
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start">
            {tags.map((tag, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${tag.cls}`}>
                {tag.label}
              </span>
            ))}
          </div>
        )}

        {/* Logo SR */}
        <img
          src="/assets/logo-icon.png"
          alt=""
          className="absolute top-2.5 right-2.5 w-9 h-9 opacity-35 z-10 object-contain"
        />

        {sinStock && (
          <span className="absolute top-2 right-2 bg-gray-800/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-20">
            Sin stock
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-2">
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 tracking-tight">
          {product.nombre}
        </p>
        <p className="text-[11px] text-gray-400 capitalize font-medium">
          {product.categoria} · {product.genero}
        </p>

        {/* Swatches de colores */}
        <div className="flex items-center gap-1 flex-wrap">
          {product.colores.slice(0, 6).map(c => (
            <span
              key={c}
              title={c}
              className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0 ring-1 ring-gray-200/60"
              style={getSwatchStyle(c, product.colorDefs)}
            />
          ))}
          {product.colores.length > 6 && (
            <span className="text-[10px] text-gray-400 font-medium">+{product.colores.length - 6}</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1.5">
          <span className="font-extrabold text-saro-blue text-base tracking-tight">
            ${product.precio.toLocaleString('es-AR')}
          </span>
          <span className="text-[11px] bg-saro-dark text-white px-2.5 py-1 rounded-lg font-semibold group-hover:bg-saro-blue transition-colors duration-300">
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
      className="relative bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden cursor-pointer group hover:shadow-card-hover hover:-translate-y-1 transition duration-300 ease-out"
    >
      {/* Estructura invisible: replica la altura de StandardCard */}
      <div className="invisible" aria-hidden="true">
        <div className="aspect-square" />
        <div className="p-3.5 space-y-2">
          <p className="font-semibold text-sm leading-tight line-clamp-2">&nbsp;<br />&nbsp;</p>
          <p className="text-[11px]">&nbsp;</p>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center justify-between pt-1.5">
            <span className="font-extrabold text-base">&nbsp;</span>
            <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold">&nbsp;</span>
          </div>
        </div>
      </div>

      {/* Imagen: cubre toda la card */}
      {imgs.length > 0 ? (
        <img
          src={imgs[0]}
          alt={product.nombre}
          className="absolute inset-0 w-full h-full object-cover object-bottom transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={e => { e.currentTarget.style.opacity = '0.3' }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
          <span className="text-7xl select-none">🏓</span>
        </div>
      )}

      {/* Fondo gradiente sutil por si la imagen no carga */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-100 -z-10" />

      {/* Tags arriba izquierda */}
      {tags.length > 0 && (
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {tags.map((tag, i) => (
            <span key={i} className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm ${tag.cls}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Logo SR arriba derecha */}
      <img
        src="/assets/logo-icon.png"
        alt=""
        className="absolute top-2.5 right-2.5 w-9 h-9 opacity-35 z-10 object-contain"
      />

      {sinStock && (
        <span className="absolute top-2 right-2 bg-gray-800/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10">
          Sin stock
        </span>
      )}

      {/* Info superpuesta abajo con gradiente oscuro */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-14 pb-3.5 px-3.5 z-10">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-sm flex-1 tracking-tight">
            {product.nombre}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {product.colores.slice(0, 4).map(c => (
              <span
                key={c}
                title={c}
                className="w-3.5 h-3.5 rounded-full border-2 border-white/50 shadow-sm flex-shrink-0"
                style={getSwatchStyle(c, product.colorDefs)}
              />
            ))}
            {product.colores.length > 4 && (
              <span className="text-[10px] text-white/70">+{product.colores.length - 4}</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <span className="font-extrabold text-white text-base drop-shadow-sm tracking-tight">
            ${product.precio.toLocaleString('es-AR')}
          </span>
          <span className="text-[11px] bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg font-semibold border border-white/20 group-hover:bg-white/30 transition-colors duration-300">
            Ver →
          </span>
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

  const totalCombos = product.colores.length * product.talles.length
  const sinStock    = product.sinStock === true ||
                      (totalCombos > 0 && product.noStock?.length === totalCombos)

  const isPaleta = product.categoria === 'paleta'

  if (isPaleta) {
    return <PaletaCard product={product} onClick={onClick} tags={tags} imgs={imgs} sinStock={sinStock} />
  }

  return <StandardCard product={product} onClick={onClick} tags={tags} imgs={imgs} sinStock={sinStock} />
}
