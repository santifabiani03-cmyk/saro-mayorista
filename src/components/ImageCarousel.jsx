import { useState } from 'react'

/**
 * ImageCarousel
 *
 * compact=true  → llena el contenedor padre (sin aspect-ratio propio).
 *                 Ideal para ProductCard — el padre define el tamaño.
 * compact=false → se autodimensiona (aspect-square).
 *                 Ideal para ProductModal.
 * thumbs=true   → muestra tira de miniaturas debajo (solo cuando compact=false).
 */
export default function ImageCarousel({
  images = [],
  emoji  = '📦',
  compact = false,
  thumbs  = false,
}) {
  const [idx, setIdx]     = useState(0)
  const [touchX, setTouchX] = useState(null)
  const n = images.length

  const go = (dir, e) => {
    e?.stopPropagation()
    setIdx(i => (i + dir + n) % n)
  }

  /* ── Sin imágenes: emoji ─────────────────────────────────────────── */
  if (!n) {
    return compact
      ? (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-6xl select-none">{emoji}</span>
        </div>
      ) : (
        <div className="aspect-square rounded-2xl bg-gray-50 flex items-center justify-center">
          <span className="text-9xl select-none">{emoji}</span>
        </div>
      )
  }

  const canNav = n > 1

  /* ── Área de imagen principal ────────────────────────────────────── */
  const main = (
    <div
      className={`relative overflow-hidden group/car
        ${compact ? 'w-full h-full' : 'aspect-square rounded-2xl'}`}
      onTouchStart={e => setTouchX(e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchX == null) return
        const dx = e.changedTouches[0].clientX - touchX
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        setTouchX(null)
      }}
    >
      <img
        src={images[idx]}
        alt=""
        className={`w-full h-full object-cover
          ${compact ? 'transition-transform duration-200 group-hover:scale-105' : ''}`}
        onError={e => { e.currentTarget.style.opacity = '0.3' }}
      />

      {canNav && (
        <>
          {/* Flechas */}
          <button
            onClick={e => go(-1, e)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white
              rounded-full shadow flex items-center justify-center text-gray-800 font-semibold
              transition-all select-none
              ${compact
                ? 'w-7 h-7 text-base opacity-0 group-hover/car:opacity-100'
                : 'w-9 h-9 text-xl'}`}
          >‹</button>
          <button
            onClick={e => go(1, e)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white
              rounded-full shadow flex items-center justify-center text-gray-800 font-semibold
              transition-all select-none
              ${compact
                ? 'w-7 h-7 text-base opacity-0 group-hover/car:opacity-100'
                : 'w-9 h-9 text-xl'}`}
          >›</button>

          {/* Dots — siempre visibles para indicar que hay más fotos */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <span
                key={i}
                className={`rounded-full bg-white transition-all duration-200
                  ${i === idx
                    ? compact ? 'w-3 h-1.5' : 'w-4 h-1.5'
                    : 'w-1.5 h-1.5 opacity-50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )

  if (compact) return main

  /* ── Modo completo: imagen + thumbs ──────────────────────────────── */
  return (
    <div className="space-y-2">
      {main}
      {thumbs && canNav && (
        <div className="flex gap-1.5 flex-wrap">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all
                ${i === idx
                  ? 'border-saro-blue scale-105'
                  : 'border-gray-100 opacity-60 hover:opacity-100 hover:border-gray-300'}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
