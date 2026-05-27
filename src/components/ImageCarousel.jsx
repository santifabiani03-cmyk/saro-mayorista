import { useState, useEffect, useCallback } from 'react'

/* ── Lightbox fullscreen ──────────────────────────────────────────── */
function Lightbox({ images, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx)
  const [touchX, setTouchX] = useState(null)
  const n = images.length

  const go = useCallback((dir) => {
    setIdx(i => (i + dir + n) % n)
  }, [n])

  // Bloquear scroll y manejar teclado
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, go])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      {/* Contador */}
      {n > 1 && (
        <span className="absolute top-4 left-4 text-white/70 text-sm font-medium">
          {idx + 1} / {n}
        </span>
      )}

      {/* Imagen */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4 sm:p-10"
        onClick={e => e.stopPropagation()}
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
          className="max-w-full max-h-full object-contain rounded-lg select-none"
          draggable={false}
          decoding="async"
          onClick={onClose}
        />
      </div>

      {/* Flechas de navegación */}
      {n > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); go(-1) }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); go(1) }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
          >
            ›
          </button>
        </>
      )}

      {/* Thumbs en lightbox */}
      {n > 1 && (
        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2 px-4">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all
                ${i === idx
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-50 hover:opacity-80'}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
  altText = '',
}) {
  const [idx, setIdx]     = useState(0)
  const [touchX, setTouchX] = useState(null)
  const [lightbox, setLightbox] = useState(false)
  const n = images.length

  const go = (dir, e) => {
    e?.stopPropagation()
    setIdx(i => (i + dir + n) % n)
  }

  const openLightbox = (e) => {
    e?.stopPropagation()
    setLightbox(true)
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
        ${compact ? 'w-full h-full' : 'aspect-square rounded-2xl cursor-zoom-in'}`}
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
        alt={altText ? `${altText} - imagen ${idx + 1}` : ''}
        className={`w-full h-full object-cover
          ${compact ? 'transition-transform duration-200 group-hover:scale-105' : ''}`}
        loading="lazy"
        decoding="async"
        onError={e => { e.currentTarget.style.opacity = '0.3' }}
        onClick={compact ? undefined : openLightbox}
      />

      {/* Ícono de zoom (solo en modo no-compact) */}
      {!compact && (
        <button
          onClick={openLightbox}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover/car:opacity-100"
          title="Ampliar imagen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" />
          </svg>
        </button>
      )}

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

  /* ── Modo completo: imagen + thumbs + lightbox ──────────────────── */
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
              <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox fullscreen */}
      {lightbox && (
        <Lightbox
          images={images}
          startIdx={idx}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  )
}
