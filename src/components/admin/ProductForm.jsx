'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  COLOR_MAP, PREDEFINED_COLORS, PREDEFINED_TALLES,
  getAutoEmoji, TAG_CONFIG, getProductTags, getSwatchStyle,
} from '../../utils/colors'

// ── Background removal & logo watermark ──────────────────────────────────────
const LOGO_URL = '/assets/logo-icon.png'
const BG_OPTIONS = {
  gradient: { label: 'Gradiente gris (sutil)', colors: [{ pos: 0, color: '#f8f9fa' }, { pos: 1, color: '#e9ecef' }] },
  white:    { label: 'Blanco puro',    colors: [{ pos: 0, color: '#ffffff' }, { pos: 1, color: '#ffffff' }] },
}

/** Carga una imagen por URL y devuelve un HTMLImageElement listo */
function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`No se pudo cargar: ${url}`))
    img.src = url
  })
}

/**
 * Encuentra el bounding box del contenido visible (no-transparente) de una imagen.
 * Devuelve { x, y, w, h } del rectángulo que contiene el producto.
 */
function getTrimBounds(img) {
  const c = document.createElement('canvas')
  c.width = img.width; c.height = img.height
  const ctx = c.getContext('2d')
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, c.width, c.height).data
  let top = c.height, left = c.width, bottom = 0, right = 0
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 10) { // alpha > 10
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }
  if (bottom < top) return { x: 0, y: 0, w: img.width, h: img.height } // sin contenido
  return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
}

/**
 * Remueve el fondo de una imagen y la coloca sobre un fondo estandarizado.
 * Recorta automáticamente el espacio transparente y centra el producto.
 * bgType: 'gradient' | 'white'
 * isPaleta: si es true, genera un canvas 3:4 (portrait) en vez de cuadrado
 */
async function removeAndStandardize(imageUrl, onProgress, bgType = 'gradient', isPaleta = false) {
  onProgress?.('Descargando imagen…')
  const resp = await fetch(imageUrl)
  if (!resp.ok) throw new Error(`Error ${resp.status} descargando imagen`)
  const srcBlob = await resp.blob()

  onProgress?.('Cargando modelo IA… (primera vez descarga ~30MB)')
  const { removeBackground } = await import('@imgly/background-removal')

  onProgress?.('Removiendo fondo…')
  const blob = await removeBackground(srcBlob, {
    progress: (key, current, total) => {
      if (key === 'compute:inference') {
        const pct = total > 0 ? Math.round((current / total) * 100) : 0
        onProgress?.(`Procesando… ${pct}%`)
      }
    },
  })

  onProgress?.('Ajustando producto…')
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject })

  // Detectar bounding box real del producto (sin transparencia)
  const bounds = getTrimBounds(img)

  // Canvas siempre cuadrado 1:1 — se agrega fondo a los costados si hace falta
  const paddingPct = isPaleta ? 0.04 : 0.10
  const productSize = Math.max(bounds.w, bounds.h)
  const padding = Math.round(productSize * paddingPct)
  const canvasSize = productSize + padding * 2
  const canvasW = canvasSize
  const canvasH = canvasSize
  const canvas = document.createElement('canvas')
  canvas.width = canvasW; canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  // Fondo
  const bgCfg = BG_OPTIONS[bgType] ?? BG_OPTIONS.gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvasH)
  bgCfg.colors.forEach(s => grad.addColorStop(s.pos, s.color))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvasW, canvasH)

  // Posicionar producto: paletas ancladas abajo (mango al fondo), resto centrado
  const drawX = (canvasW - bounds.w) / 2
  const drawY = isPaleta
    ? canvasH - bounds.h - padding   // paleta: pegada abajo con margen mínimo
    : (canvasH - bounds.h) / 2       // ropa/padel: centrado vertical
  ctx.drawImage(img, bounds.x, bounds.y, bounds.w, bounds.h, drawX, drawY, bounds.w, bounds.h)
  URL.revokeObjectURL(img.src)

  return new Promise(resolve => { canvas.toBlob(b => resolve(b), 'image/webp', 0.95) })
}

/**
 * Aplica el logo SR como watermark en la esquina superior derecha.
 * Devuelve un Blob (webp). Tamaño del logo: ~12% del ancho de la imagen.
 */
async function applyLogoWatermark(imageUrl, onProgress) {
  onProgress?.('Descargando…')
  const resp = await fetch(imageUrl)
  if (!resp.ok) throw new Error(`Error ${resp.status}`)
  const imgBlob = await resp.blob()
  const imgSrc = URL.createObjectURL(imgBlob)

  onProgress?.('Aplicando logo…')
  const img = await loadImg(imgSrc)
  const logo = await loadImg(LOGO_URL)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  // Logo: 12% del ancho, esquina superior derecha con margen 3%
  const logoW = Math.round(canvas.width * 0.12)
  const logoH = Math.round(logoW * (logo.naturalHeight / logo.naturalWidth))
  const margin = Math.round(canvas.width * 0.03)
  ctx.globalAlpha = 0.35
  ctx.drawImage(logo, canvas.width - logoW - margin, margin, logoW, logoH)
  ctx.globalAlpha = 1

  URL.revokeObjectURL(imgSrc)
  return new Promise(resolve => { canvas.toBlob(b => resolve(b), 'image/webp', 0.92) })
}


/* ── Helpers para edición de imagen en lightbox ──────────────────── */

/** Rota una imagen 90° en sentido horario y devuelve un Blob webp */
async function rotateImage90(imageUrl) {
  const img = await loadImg(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalHeight
  canvas.height = img.naturalWidth
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/webp', 0.92))
}

/** Recorta una imagen según un rect {x,y,w,h} en coordenadas normalizadas (0-1) */
async function cropImage(imageUrl, rect) {
  const img = await loadImg(imageUrl)
  const sx = Math.round(rect.x * img.naturalWidth)
  const sy = Math.round(rect.y * img.naturalHeight)
  const sw = Math.round(rect.w * img.naturalWidth)
  const sh = Math.round(rect.h * img.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = sw; canvas.height = sh
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
  return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/webp', 0.92))
}

/* ── Crop overlay interactivo ──────────────────────────────────────── */
function CropOverlay({ imageUrl, onConfirm, onCancel }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null) // null | 'move' | 'nw' | 'ne' | 'sw' | 'se'
  const [rect, setRect] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const startRef = useRef({ rect: null, px: 0, py: 0 })

  const getRelPos = (e) => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box) return { rx: 0, ry: 0 }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { rx: (clientX - box.left) / box.width, ry: (clientY - box.top) / box.height }
  }

  const handleDown = (e, type) => {
    e.stopPropagation(); e.preventDefault()
    const { rx, ry } = getRelPos(e)
    startRef.current = { rect: { ...rect }, px: rx, py: ry }
    setDragging(type)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const { rx, ry } = getRelPos(e)
      const { rect: sr, px, py } = startRef.current
      const dx = rx - px, dy = ry - py
      setRect(() => {
        let { x, y, w, h } = { ...sr }
        if (dragging === 'move') {
          x = Math.max(0, Math.min(1 - w, x + dx))
          y = Math.max(0, Math.min(1 - h, y + dy))
        } else {
          if (dragging.includes('w')) { x = Math.max(0, x + dx); w = Math.max(0.05, w - dx) }
          if (dragging.includes('e')) { w = Math.max(0.05, Math.min(1 - x, w + dx)) }
          if (dragging.includes('n')) { y = Math.max(0, y + dy); h = Math.max(0.05, h - dy) }
          if (dragging.includes('s')) { h = Math.max(0.05, Math.min(1 - y, h + dy)) }
        }
        return { x, y, w, h }
      })
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [dragging])

  const handleStyle = 'w-4 h-4 sm:w-3.5 sm:h-3.5 bg-white rounded-full border-2 border-saro-blue absolute z-10 touch-none'

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4">
      <p className="text-white text-sm mb-3 font-medium">Arrastrá las esquinas para recortar</p>
      <div ref={containerRef} className="relative max-w-full max-h-[65vh] select-none" style={{ touchAction: 'none' }}>
        <img src={imageUrl} alt="" className="max-w-full max-h-[65vh] object-contain rounded-lg" draggable={false} />
        {/* Oscurecer fuera del recorte */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bg-transparent"
            style={{
              left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`, height: `${rect.h * 100}%`,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              border: '2px solid white',
            }}
          />
        </div>
        {/* Área draggable para mover */}
        <div
          className="absolute cursor-move touch-none"
          style={{
            left: `${rect.x * 100}%`, top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`, height: `${rect.h * 100}%`,
          }}
          onMouseDown={e => handleDown(e, 'move')}
          onTouchStart={e => handleDown(e, 'move')}
        />
        {/* Handles de esquinas */}
        <div className={handleStyle} style={{ left: `calc(${rect.x * 100}% - 8px)`, top: `calc(${rect.y * 100}% - 8px)`, cursor: 'nw-resize' }}
          onMouseDown={e => handleDown(e, 'nw')} onTouchStart={e => handleDown(e, 'nw')} />
        <div className={handleStyle} style={{ left: `calc(${(rect.x + rect.w) * 100}% - 8px)`, top: `calc(${rect.y * 100}% - 8px)`, cursor: 'ne-resize' }}
          onMouseDown={e => handleDown(e, 'ne')} onTouchStart={e => handleDown(e, 'ne')} />
        <div className={handleStyle} style={{ left: `calc(${rect.x * 100}% - 8px)`, top: `calc(${(rect.y + rect.h) * 100}% - 8px)`, cursor: 'sw-resize' }}
          onMouseDown={e => handleDown(e, 'sw')} onTouchStart={e => handleDown(e, 'sw')} />
        <div className={handleStyle} style={{ left: `calc(${(rect.x + rect.w) * 100}% - 8px)`, top: `calc(${(rect.y + rect.h) * 100}% - 8px)`, cursor: 'se-resize' }}
          onMouseDown={e => handleDown(e, 'se')} onTouchStart={e => handleDown(e, 'se')} />
      </div>
      <div className="flex gap-3 mt-4">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors">
          Cancelar
        </button>
        <button onClick={() => onConfirm(rect)} className="px-5 py-2.5 rounded-xl bg-saro-blue text-white text-sm font-bold hover:bg-saro-dark transition-colors">
          Recortar
        </button>
      </div>
    </div>
  )
}

/* ── Lightbox para admin ──────────────────────────────────────────── */
function AdminLightbox({ images, startIdx, onClose, onUpdateImage }) {
  const [idx, setIdx] = useState(startIdx)
  const [touchX, setTouchX] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [cropping, setCropping] = useState(false)
  const n = images.length

  const go = useCallback((dir) => {
    setIdx(i => (i + dir + n) % n)
  }, [n])

  const handleRotate = async () => {
    if (processing || !onUpdateImage) return
    setProcessing(true)
    try {
      const blob = await rotateImage90(images[idx])
      const file = new File([blob], 'rotated.webp', { type: 'image/webp' })
      const url = await uploadFile(file, 'rotated')
      if (url) onUpdateImage(idx, url)
    } catch (e) {
      console.error('Error rotando imagen:', e)
    } finally {
      setProcessing(false)
    }
  }

  const handleCropConfirm = async (rect) => {
    setCropping(false)
    if (processing || !onUpdateImage) return
    setProcessing(true)
    try {
      const blob = await cropImage(images[idx], rect)
      const file = new File([blob], 'cropped.webp', { type: 'image/webp' })
      const url = await uploadFile(file, 'cropped')
      if (url) onUpdateImage(idx, url)
    } catch (e) {
      console.error('Error recortando imagen:', e)
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (cropping) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, go, cropping])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
      >
        ✕
      </button>

      {n > 1 && (
        <span className="absolute top-4 left-4 text-white/70 text-sm font-medium">
          {idx + 1} / {n}
        </span>
      )}

      {/* Botones de edición: rotar y recortar */}
      {onUpdateImage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          <button
            onClick={e => { e.stopPropagation(); handleRotate() }}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/30 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
            title="Rotar 90°"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38L21.5 8"/>
            </svg>
            <span>{processing ? '…' : 'Rotar'}</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); setCropping(true) }}
            disabled={processing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/30 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
            title="Recortar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/>
            </svg>
            <span>Recortar</span>
          </button>
        </div>
      )}

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
          onClick={onClose}
        />
      </div>

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
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Overlay de recorte */}
      {cropping && (
        <CropOverlay
          imageUrl={images[idx]}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropping(false)}
        />
      )}
    </div>
  )
}

const BLANK = {
  nombre: '', precio: '', descripcion: '', tags: [],
  categoria: '', genero: '', parteCuerpo: '',
  colores: [], talles: [], noStock: [], emoji: '📦',
  promos: [],
}

/**
 * Comprime una imagen usando Canvas:
 * - Redimensiona al ancho máximo (por defecto 1200px)
 * - Convierte a WebP (con fallback a JPEG si el browser no lo soporta)
 * - Devuelve { base64, ext } o null si falla
 */
async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null) }
    img.onload  = () => {
      URL.revokeObjectURL(objectUrl)

      const ratio = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width  * ratio)
      const h = Math.round(img.height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

      // Intentar WebP primero
      canvas.toBlob(webpBlob => {
        const isRealWebP = webpBlob?.type === 'image/webp' && webpBlob.size > 100
        if (isRealWebP) {
          const reader = new FileReader()
          reader.onload = e => resolve({ base64: e.target.result.split(',')[1], ext: 'webp' })
          reader.readAsDataURL(webpBlob)
        } else {
          // Fallback a JPEG
          canvas.toBlob(jpgBlob => {
            if (!jpgBlob) { resolve(null); return }
            const reader = new FileReader()
            reader.onload = e => resolve({ base64: e.target.result.split(',')[1], ext: 'jpg' })
            reader.readAsDataURL(jpgBlob)
          }, 'image/jpeg', quality)
        }
      }, 'image/webp', quality)
    }

    img.src = objectUrl
  })
}

/** Comprime y sube un archivo al serverless /api/upload-image. Retorna la URL o null. */
async function uploadFile(file, productName) {
  const compressed = await compressImage(file)
  if (!compressed) return null

  const { base64, ext } = compressed
  const slug = (productName || 'imagen').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'img'
  const name = `${slug}-${Date.now()}.${ext}`
  const pin  = sessionStorage.getItem('saro_admin_pin') ?? ''

  try {
    const res  = await fetch('/api/upload-image', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, data: base64, pin }),
    })
    const json = await res.json()
    // Preferir la URL directa de GitHub (funciona al instante, sin esperar redeploy)
    return json.rawUrl ?? json.path ?? null
  } catch { return null }
}

// ── Sub-componentes inline ────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function Field({ children, className = '' }) {
  return <div className={`space-y-1 ${className}`}>{children}</div>
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ val, label }) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            value === val
              ? 'bg-saro-blue border-saro-blue text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Multi-image uploader ──────────────────────────────────────────────────────

function MultiImageUploader({ images, onChange, productName, applyLogo }) {
  const inputRef    = useRef()
  const [pending, setPending] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  // ── Drag & drop para reordenar ──
  const [dragIdx, setDragIdx]     = useState(null)
  const [overIdx, setOverIdx]     = useState(null)

  const handleFiles = async (files) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!list.length) return
    setPending(p => p + list.length)

    const urls = []
    for (const f of list) {
      let url = await uploadFile(f, productName)
      if (url && applyLogo) {
        try {
          const logoBlob = await applyLogoWatermark(url, () => {})
          const logoFile = new File([logoBlob], 'logo.webp', { type: 'image/webp' })
          const logoUrl = await uploadFile(logoFile, productName)
          if (logoUrl) url = logoUrl
        } catch (e) {
          console.error('Error aplicando logo al subir:', e)
        }
      }
      if (url) urls.push(url)
    }

    onChange([...images, ...urls])
    setPending(p => p - list.length)
    inputRef.current.value = ''
  }

  const remove = (i) => onChange(images.filter((_, j) => j !== i))

  const moveImage = (from, to) => {
    if (from === to || to < 0 || to >= images.length) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onChange(next)
  }

  // Drag handlers para reordenar entre thumbnails
  const onThumbDragStart = (e, i) => {
    setDragIdx(i)
    e.dataTransfer.effectAllowed = 'move'
    // Usar un thumbnail transparente para no confundir con drop de archivos
    e.dataTransfer.setData('text/plain', `reorder:${i}`)
  }
  const onThumbDragOver = (e, i) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(i)
  }
  const onThumbDrop = (e, i) => {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('text/plain')
    if (data.startsWith('reorder:')) {
      const from = parseInt(data.split(':')[1], 10)
      moveImage(from, i)
    }
    setDragIdx(null)
    setOverIdx(null)
  }
  const onThumbDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  // Detectar si el drag externo es de archivos (no reorden interno)
  const isFileDrag = (e) => e.dataTransfer?.types?.includes('Files')

  return (
    <div
      onDragOver={e => { if (isFileDrag(e)) { e.preventDefault(); setDragging(true) } }}
      onDragLeave={e => { if (isFileDrag(e)) setDragging(false) }}
      onDrop={e => {
        if (isFileDrag(e) && !e.dataTransfer.getData('text/plain').startsWith('reorder:')) {
          e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files)
        }
      }}
    >
      {/* Grid de imágenes */}
      <div className={`grid grid-cols-3 gap-2 p-2 rounded-2xl transition-colors ${dragging ? 'bg-saro-light border-2 border-saro-blue border-dashed' : ''}`}>

        {/* Imágenes existentes */}
        {images.map((url, i) => (
          <div
            key={url + i}
            draggable
            onDragStart={e => onThumbDragStart(e, i)}
            onDragOver={e => onThumbDragOver(e, i)}
            onDrop={e => onThumbDrop(e, i)}
            onDragEnd={onThumbDragEnd}
            className={`relative aspect-square rounded-xl overflow-hidden bg-gray-100 group transition-all
              ${dragIdx === i ? 'opacity-40 scale-95' : ''}
              ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'ring-2 ring-saro-blue ring-offset-1' : ''}
              ${dragIdx !== null ? 'cursor-grabbing' : 'cursor-grab'}`}
            onClick={() => { if (dragIdx === null) setLightboxIdx(i) }}
          >
            <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors pointer-events-none" />

            {/* Badge "Principal" en la primera */}
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] bg-saro-blue text-white px-1.5 py-0.5 rounded-full font-semibold pointer-events-none">
                Principal
              </span>
            )}

            {/* Botones de reorden: ← → */}
            <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {i > 0 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); moveImage(i, i - 1) }}
                  className="w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full text-[10px] flex items-center justify-center shadow"
                  title="Mover antes"
                >◀</button>
              )}
              {i < images.length - 1 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); moveImage(i, i + 1) }}
                  className="w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full text-[10px] flex items-center justify-center shadow"
                  title="Mover después"
                >▶</button>
              )}
            </div>

            {/* Botón eliminar */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); remove(i) }}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >✕</button>

            {/* Indicador de posición */}
            {images.length > 1 && (
              <span className="absolute top-1 left-1 text-[9px] bg-black/50 text-white/80 w-4 h-4 rounded-full flex items-center justify-center font-semibold pointer-events-none">
                {i + 1}
              </span>
            )}
          </div>
        ))}

        {/* Placeholders de carga */}
        {Array.from({ length: pending }).map((_, i) => (
          <div key={`loading-${i}`} className="aspect-square rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="text-2xl animate-pulse">⏳</span>
          </div>
        ))}

        {/* Botón agregar */}
        <button
          type="button"
          onClick={() => inputRef.current.click()}
          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-saro-blue hover:bg-saro-light text-gray-400 hover:text-saro-blue transition-all flex flex-col items-center justify-center gap-1 select-none"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-xs font-medium">Agregar</span>
        </button>
      </div>

      {images.length === 0 && pending === 0 && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Clic en + o arrastrá imágenes aquí · JPG, PNG, WEBP
        </p>
      )}
      {images.length > 1 && (
        <p className="text-[10px] text-gray-400 text-center mt-1">
          Arrastrá para reordenar · La primera imagen es la principal del catálogo
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      {lightboxIdx !== null && images.length > 0 && (
        <AdminLightbox
          images={images}
          startIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onUpdateImage={(idx, newUrl) => {
            const updated = [...images]
            updated[idx] = newUrl
            onChange(updated)
          }}
        />
      )}
    </div>
  )
}

// ── Generador de escenas con IA (Gemini) ─────────────────────────────────────
// Toma una imagen del producto y genera una foto lifestyle: producto en uso,
// en cancha, en tienda, etc. La imagen generada se puede sumar a la galería.

const AI_SCENES = [
  { key: 'accion',    icon: '🎾', label: 'En acción',  desc: 'Jugador usándolo en cancha' },
  { key: 'lifestyle', icon: '🏙️', label: 'Lifestyle',  desc: 'Escena urbana deportiva' },
  { key: 'estudio',   icon: '💡', label: 'Estudio',    desc: 'Fondo premium con luces' },
  { key: 'tienda',    icon: '🏬', label: 'En tienda',  desc: 'Exhibido en local deportivo' },
]

function base64ToFile(b64, mime) {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') ? 'jpg' : 'webp'
  return new File([arr], `ia-escena.${ext}`, { type: mime })
}

function AiSceneSection({ images, onChange, productName }) {
  const [srcIdx, setSrcIdx]       = useState(0)
  const [scene, setScene]         = useState('accion')
  const [generating, setGenerating] = useState(false)
  const [results, setResults]     = useState([]) // { dataUrl, b64, mime, adding, added }
  const [error, setError]         = useState(null)
  const [open, setOpen]           = useState(false)

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: sessionStorage.getItem('saro_admin_pin') ?? '',
          imageUrl: images[srcIdx],
          scene,
          productName,
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error desconocido')
      setResults(prev => [{
        dataUrl: `data:${json.mimeType};base64,${json.image}`,
        b64: json.image,
        mime: json.mimeType,
        adding: false,
        added: false,
      }, ...prev])
    } catch (e) {
      setError(e.message ?? 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const addToGallery = async (idx) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, adding: true } : r))
    try {
      const file = base64ToFile(results[idx].b64, results[idx].mime)
      const url = await uploadFile(file, productName)
      if (!url) throw new Error('No se pudo subir')
      onChange([...images, url])
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, adding: false, added: true } : r))
    } catch {
      setResults(prev => prev.map((r, i) => i === idx ? { ...r, adding: false } : r))
      setError('No se pudo subir la imagen generada. Probá de nuevo.')
    }
  }

  return (
    <div className="border border-violet-200 bg-violet-50/50 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <div>
            <p className="text-sm font-bold text-violet-800">Generar escena con IA</p>
            <p className="text-[11px] text-violet-500">Foto del producto en uso, en cancha o en tienda</p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-violet-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Imagen de origen */}
          {images.length > 1 && (
            <div>
              <p className="text-[11px] font-semibold text-violet-600 mb-1.5">Imagen base:</p>
              <div className="flex gap-1.5 flex-wrap">
                {images.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => setSrcIdx(i)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      srcIdx === i ? 'border-violet-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Escenas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {AI_SCENES.map(s => (
              <button
                key={s.key}
                type="button"
                onClick={() => setScene(s.key)}
                className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-all ${
                  scene === s.key
                    ? 'border-violet-500 bg-white shadow-sm'
                    : 'border-violet-100 bg-white/60 hover:border-violet-300'
                }`}
              >
                <span className="text-sm">{s.icon} <span className="font-semibold text-xs text-gray-800">{s.label}</span></span>
                <span className="text-[10px] text-gray-400 leading-tight">{s.desc}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={generating || images.length === 0}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            {generating ? '✨ Generando… (puede tardar ~15s)' : '✨ Generar imagen'}
          </button>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Resultados */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {results.map((r, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-violet-100 bg-white">
                  <img src={r.dataUrl} alt="Imagen generada por IA" className="w-full aspect-square object-cover" />
                  <div className="p-1.5">
                    {r.added ? (
                      <p className="text-center text-[11px] font-semibold text-green-600 py-1">✅ Agregada</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToGallery(i)}
                        disabled={r.adding}
                        className="w-full py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 text-[11px] font-bold transition-colors disabled:opacity-50"
                      >
                        {r.adding ? 'Subiendo…' : '+ Agregar a la galería'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-violet-400 leading-relaxed">
            La IA mantiene el diseño del producto pero puede tener variaciones — revisá el resultado antes de agregarlo.
            Usa tu API de Gemini (misma que las descripciones).
          </p>
        </div>
      )}
    </div>
  )
}

// ── Selector de colores ───────────────────────────────────────────────────────

// ── Contador de usos diarios de IA (para generador de descripciones con Gemini) ─
const AI_USAGE_KEY = 'saro_ai_usage'
const AI_DAILY_LIMIT = 25

function getAiUsage() {
  try {
    const data = JSON.parse(localStorage.getItem(AI_USAGE_KEY) || '{}')
    const today = new Date().toISOString().slice(0, 10)
    if (data.date !== today) return { date: today, count: 0 }
    return data
  } catch { return { date: new Date().toISOString().slice(0, 10), count: 0 } }
}

function incrementAiUsage() {
  const usage = getAiUsage()
  usage.count++
  localStorage.setItem(AI_USAGE_KEY, JSON.stringify(usage))
  return usage.count
}

// ── Sección de remoción de fondo ─────────────────────────────────────────────

function BgRemovalSection({ images, onChange, productName, applyLogo, isPaleta = false }) {
  const [processing, setProcessing] = useState({}) // { [index]: 'status' }
  const [selected, setSelected] = useState(new Set())
  const [bgType, setBgType] = useState('gradient') // 'gradient' | 'white'

  // Ref para tener siempre el array actualizado (evita stale closure al procesar múltiples)
  const imagesRef = useRef(images)
  useEffect(() => { imagesRef.current = images }, [images])

  const toggle = (i) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const processOne = async (i) => {
    const url = imagesRef.current[i]
    setProcessing(prev => ({ ...prev, [i]: 'Iniciando…' }))
    try {
      const resultBlob = await removeAndStandardize(url, (msg) => {
        setProcessing(prev => ({ ...prev, [i]: msg }))
      }, bgType, isPaleta)
      setProcessing(prev => ({ ...prev, [i]: 'Subiendo…' }))
      const file = new File([resultBlob], 'processed.webp', { type: 'image/webp' })
      let newUrl = await uploadFile(file, productName)
      // Re-aplicar logo SR si está activado (el bg removal lo borra)
      if (newUrl && applyLogo) {
        setProcessing(prev => ({ ...prev, [i]: 'Aplicando logo…' }))
        try {
          const logoBlob = await applyLogoWatermark(newUrl, () => {})
          const logoFile = new File([logoBlob], 'logo.webp', { type: 'image/webp' })
          const logoUrl = await uploadFile(logoFile, productName)
          if (logoUrl) newUrl = logoUrl
        } catch {}
      }
      if (newUrl) {
        // Usar imagesRef.current para siempre tener la versión más actual
        const next = [...imagesRef.current]
        next[i] = newUrl
        onChange(next)
      }
      setProcessing(prev => { const n = { ...prev }; delete n[i]; return n })
      setSelected(prev => { const n = new Set(prev); n.delete(i); return n })
    } catch (e) {
      console.error('Error removing background:', e)
      const errMsg = e?.message?.slice(0, 60) || 'Error desconocido'
      setProcessing(prev => ({ ...prev, [i]: `❌ ${errMsg}` }))
      setTimeout(() => setProcessing(prev => { const n = { ...prev }; delete n[i]; return n }), 5000)
    }
  }

  const processSelected = async () => {
    const indices = [...selected].sort()
    for (const i of indices) {
      await processOne(i)
    }
  }

  const anyProcessing = Object.keys(processing).length > 0

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🪄</span>
        <div>
          <h4 className="text-sm font-bold text-violet-800">Quitar fondo</h4>
          <p className="text-[11px] text-violet-500">Seleccioná imágenes para quitar fondo con IA · 100% gratis</p>
        </div>
      </div>

      {/* Selector de tipo de fondo */}
      <div className="flex gap-2">
        {Object.entries(BG_OPTIONS).map(([key, opt]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBgType(key)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              bgType === key
                ? 'bg-violet-500 border-violet-500 text-white'
                : 'bg-white border-violet-200 text-violet-600 hover:border-violet-400'
            }`}
          >
            {key === 'gradient' ? '◐' : '○'} {opt.label}
          </button>
        ))}
      </div>

      {/* Grid de miniaturas seleccionables */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((url, i) => {
          const isProc = !!processing[i]
          const isSel = selected.has(i)
          return (
            <button
              key={url + i}
              type="button"
              disabled={isProc}
              onClick={() => !isProc && toggle(i)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                isProc ? 'border-violet-300 opacity-70'
                : isSel ? 'border-violet-500 ring-2 ring-violet-300'
                : 'border-transparent hover:border-violet-300'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {isProc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                  <span className="text-base animate-pulse">🪄</span>
                  <span className="text-[9px] font-medium text-violet-600 mt-0.5 px-1 text-center leading-tight">{processing[i]}</span>
                </div>
              )}
              {isSel && !isProc && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-violet-500 text-white rounded-full text-xs flex items-center justify-center shadow">
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Botón de procesar */}
      <button
        type="button"
        disabled={selected.size === 0 || anyProcessing}
        onClick={processSelected}
        className={`w-full py-2 rounded-xl text-sm font-bold transition-all ${
          selected.size > 0 && !anyProcessing
            ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
            : 'bg-violet-100 text-violet-300 cursor-not-allowed'
        }`}
      >
        {anyProcessing
          ? 'Procesando…'
          : selected.size > 0
            ? `Quitar fondo de ${selected.size} imagen${selected.size > 1 ? 'es' : ''}`
            : 'Seleccioná imágenes arriba'}
      </button>
    </div>
  )
}

const PINNED_KEY = 'saro_pinned_colors'
const CUSTOM_DEFS_KEY = 'saro_custom_color_defs'
const loadPinned     = () => { try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]') } catch { return [] } }
const savePinned     = (arr) => localStorage.setItem(PINNED_KEY, JSON.stringify(arr))
const loadCustomDefs = () => { try { return JSON.parse(localStorage.getItem(CUSTOM_DEFS_KEY) || '{}') } catch { return {} } }
const saveCustomDefs = (obj) => localStorage.setItem(CUSTOM_DEFS_KEY, JSON.stringify(obj))

function ColorPicker({ selected, onChange }) {
  const [customName, setCustomName]         = useState('')
  const [customBasePick, setCustomBasePick] = useState([])   // 1-2 base colors for the visual
  const [pinned, setPinned]                 = useState(loadPinned)
  const [customDefs, setCustomDefs]         = useState(loadCustomDefs)

  // Colores base (sin combos)
  const baseColors   = PREDEFINED_COLORS.filter(c => !c.includes('/'))
  const predefinedSet = new Set(PREDEFINED_COLORS)

  // Lista de personalizados = custom en selected + fijados
  const customList = [...new Set([
    ...selected.filter(c => !predefinedSet.has(c)),
    ...pinned,
  ])]

  // ── Predefinidos: toggle directo ──
  const toggle = (c) =>
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])

  // ── Custom: elegir base colors ──
  const toggleBasePick = (c) => {
    setCustomBasePick(prev => {
      if (prev.includes(c)) return prev.filter(x => x !== c)
      if (prev.length >= 2) return [prev[1], c]
      return [...prev, c]
    })
  }

  const addCustom = () => {
    const name = customName.trim()
    if (!name) return
    if (!selected.includes(name)) onChange([...selected, name])
    if (customBasePick.length > 0) {
      const defs = { ...customDefs, [name]: customBasePick }
      setCustomDefs(defs)
      saveCustomDefs(defs)
    }
    setCustomName('')
    setCustomBasePick([])
  }

  // ── Lista: acciones ──
  const toggleCheck = (c) =>
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])

  const togglePin = (c) => {
    const next = pinned.includes(c) ? pinned.filter(x => x !== c) : [...pinned, c]
    setPinned(next)
    savePinned(next)
  }

  const removeColor = (c) => {
    onChange(selected.filter(x => x !== c))
    setPinned(p => { const n = p.filter(x => x !== c); savePinned(n); return n })
    setCustomDefs(d => { const n = { ...d }; delete n[c]; saveCustomDefs(n); return n })
  }

  // Swatch para custom colors usando sus definiciones base
  const getCustomSwatch = (name) => {
    const bases = customDefs[name]
    if (!bases || bases.length === 0) return getSwatchStyle(name)
    if (bases.length === 1) return { backgroundColor: COLOR_MAP[bases[0]] ?? '#e5e7eb' }
    const ca = COLOR_MAP[bases[0]] ?? '#e5e7eb'
    const cb = COLOR_MAP[bases[1]] ?? '#e5e7eb'
    return { background: `linear-gradient(135deg, ${ca} 50%, ${cb} 50%)` }
  }

  return (
    <div className="space-y-4">
      {/* ── Predefinidos: toggle directo ── */}
      <div className="flex flex-wrap gap-2">
        {baseColors.map(c => {
          const active = selected.includes(c)
          return (
            <button
              key={c} type="button" onClick={() => toggle(c)} title={c}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'border-saro-blue bg-saro-light text-saro-dark ring-2 ring-saro-blue/20'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              <span className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                style={getSwatchStyle(c)} />
              {c}
              {active && <span className="text-saro-blue font-bold">✓</span>}
            </button>
          )
        })}
      </div>

      {/* ── Color personalizado ── */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text" placeholder="Color personalizado…"
            value={customName} onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-saro-blue"
          />
          <button
            type="button" onClick={addCustom} disabled={!customName.trim()}
            className="px-3 py-1.5 text-sm bg-saro-blue hover:bg-saro-dark text-white rounded-lg font-semibold disabled:opacity-40 transition-colors"
          >
            + Agregar
          </button>
        </div>

        {/* Mini-paleta para elegir el color del círculo (aparece al escribir nombre) */}
        {customName.trim() && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
            <p className="text-xs text-gray-500">Elegí 1 o 2 colores para el círculo de <strong>"{customName.trim()}"</strong>:</p>
            <div className="flex flex-wrap gap-1.5">
              {baseColors.map(c => {
                const picked = customBasePick.includes(c)
                return (
                  <button
                    key={c} type="button" onClick={() => toggleBasePick(c)} title={c}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      picked
                        ? 'border-saro-blue ring-2 ring-saro-blue/30 scale-110'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: COLOR_MAP[c] ?? '#e5e7eb' }}
                  />
                )
              })}
            </div>
            {customBasePick.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-gray-400">Preview:</span>
                <span className="w-5 h-5 rounded-full border border-gray-300"
                  style={customBasePick.length === 2
                    ? { background: `linear-gradient(135deg, ${COLOR_MAP[customBasePick[0]]} 50%, ${COLOR_MAP[customBasePick[1]]} 50%)` }
                    : { backgroundColor: COLOR_MAP[customBasePick[0]] ?? '#e5e7eb' }
                  } />
                <span className="text-xs font-medium text-gray-700">{customName.trim()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lista de colores personalizados ── */}
      {customList.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Colores personalizados
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {customList.map(c => {
              const checked  = selected.includes(c)
              const isPinned = pinned.includes(c)
              return (
                <div key={c} className={`flex items-center gap-2 px-3 py-2 transition-colors ${checked ? 'bg-white' : 'bg-gray-50/50 opacity-60'}`}>
                  {/* Checkbox */}
                  <button type="button" onClick={() => toggleCheck(c)}
                    title={checked ? 'Quitar del producto' : 'Incluir en producto'}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                      checked ? 'bg-saro-blue border-saro-blue text-white' : 'bg-white border-gray-300 text-transparent hover:border-saro-blue'
                    }`}
                  >✓</button>

                  {/* Swatch + nombre */}
                  <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                    style={getCustomSwatch(c)} />
                  <span className={`text-sm flex-1 ${checked ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{c}</span>

                  {/* Pin con indicador visual */}
                  <button type="button" onClick={() => togglePin(c)}
                    title={isPinned ? 'Quitar de fijos' : 'Fijar para futuras publicaciones'}
                    className={`px-1.5 py-0.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                      isPinned
                        ? 'bg-amber-100 text-amber-600 border border-amber-200'
                        : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    📌{isPinned && <span>Fijo</span>}
                  </button>

                  {/* Eliminar */}
                  <button type="button" onClick={() => removeColor(c)}
                    title="Eliminar color"
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors text-sm"
                  >✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Resumen */}
      {selected.length > 0 && (
        <p className="text-xs text-gray-500">
          Seleccionados: <strong>{selected.join(', ')}</strong>
        </p>
      )}
    </div>
  )
}

// ── Selector de talles ────────────────────────────────────────────────────────

function TallePicker({ selected, onChange }) {
  const [custom, setCustom] = useState('')

  const toggle = (t) =>
    onChange(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !selected.includes(v)) onChange([...selected, v])
    setCustom('')
  }

  const all = [...new Set([...PREDEFINED_TALLES, ...selected.filter(t => !PREDEFINED_TALLES.includes(t))])]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {all.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition-all ${
              selected.includes(t)
                ? 'bg-saro-blue border-saro-blue text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Talle personalizado…"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-saro-blue"
        />
        <button
          type="button"
          onClick={addCustom}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-saro-light text-gray-700 rounded-lg font-medium"
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

// ── Matriz sin-stock ──────────────────────────────────────────────────────────

function NoStockMatrix({ colores, talles, noStock, onChange }) {
  if (!colores.length || !talles.length) return null

  const isOut = (c, t) => noStock.some(n => n.color === c && n.talle === t)

  const toggle = (color, talle) => {
    if (isOut(color, talle)) {
      onChange(noStock.filter(n => !(n.color === color && n.talle === talle)))
    } else {
      onChange([...noStock, { color, talle }])
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="text-sm w-full min-w-max">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 text-gray-500 font-medium text-xs">Color \ Talle</th>
            {talles.map(t => (
              <th key={t} className="px-3 py-2 text-center text-gray-500 font-medium text-xs">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {colores.map((color, ci) => (
            <tr key={color} className={ci % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3 h-3 rounded-full border border-gray-200"
                    style={getSwatchStyle(color)}
                  />
                  <span className="text-xs text-gray-700">{color}</span>
                </div>
              </td>
              {talles.map(talle => (
                <td key={talle} className="px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => toggle(color, talle)}
                    className={`w-6 h-6 rounded-md border text-xs font-bold transition-all ${
                      isOut(color, talle)
                        ? 'bg-red-500 border-red-500 text-white'
                        : 'bg-white border-gray-200 text-gray-300 hover:border-red-300'
                    }`}
                    title={isOut(color, talle) ? 'Sin stock' : 'Con stock'}
                  >
                    {isOut(color, talle) ? '✕' : '✓'}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {noStock.length > 0 && (
        <p className="text-xs text-red-500 px-3 py-2 bg-red-50 border-t border-red-100">
          Sin stock: {noStock.map(n => `${n.color}/${n.talle}`).join(' · ')}
        </p>
      )}
    </div>
  )
}

// ── Editor de promos por cantidad ─────────────────────────────────────────────

function PromoEditor({ promos, onChange, precioBase }) {
  const addPromo = () => onChange([...promos, { cantidad: '', precioTotal: '' }])

  const updatePromo = (idx, field, val) => {
    const next = promos.map((p, i) => i === idx ? { ...p, [field]: val } : p)
    onChange(next)
  }

  const removePromo = (idx) => onChange(promos.filter((_, i) => i !== idx))

  const sorted = [...promos]
    .map((p, i) => ({ ...p, _idx: i }))
    .sort((a, b) => (Number(a.cantidad) || 0) - (Number(b.cantidad) || 0))

  return (
    <div className="space-y-3">
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-400">Sin promos. Agregá descuentos por cantidad para este producto.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map(p => {
            const qty   = Number(p.cantidad) || 0
            const total = Number(p.precioTotal) || 0
            const ppu   = qty > 0 && total > 0 ? total / qty : 0
            const base  = Number(precioBase) || 0
            const ahorro = base > 0 && ppu > 0 ? Math.round((1 - ppu / base) * 100) : 0
            return (
              <div key={p._idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="number" min="1" placeholder="Cant."
                    value={p.cantidad}
                    onChange={e => updatePromo(p._idx, 'cantidad', e.target.value)}
                    className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-saro-blue text-center"
                  />
                  <span className="text-xs text-gray-400">u. ×</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                    <input
                      type="number" min="0" placeholder="Precio total"
                      value={p.precioTotal}
                      onChange={e => updatePromo(p._idx, 'precioTotal', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg pl-5 pr-2 py-1.5 focus:outline-none focus:border-saro-blue"
                    />
                  </div>
                </div>
                {ppu > 0 && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    ${Math.round(ppu).toLocaleString('es-AR')}/u
                    {ahorro > 0 && <span className="text-green-600 font-bold ml-1">-{ahorro}%</span>}
                  </span>
                )}
                <button
                  type="button" onClick={() => removePromo(p._idx)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >✕</button>
              </div>
            )
          })}
        </div>
      )}
      <button
        type="button" onClick={addPromo}
        className="text-sm text-saro-blue hover:text-saro-dark font-semibold transition-colors"
      >
        + Agregar promo por cantidad
      </button>
    </div>
  )
}

// ── Formulario principal ──────────────────────────────────────────────────────

export default function ProductForm({ initial, onSave, onCancel, saving }) {
  // Excluir campos de imagen del form; se manejan en estado separado
  const [form, setForm] = useState(() => {
    if (!initial) return { ...BLANK }
    const { imagen: _img, imagenes: _imgs, ...rest } = initial
    // Migrar campo legacy `tag` → `tags` array
    const tags = getProductTags(initial)
    return { ...BLANK, ...rest, tags, precio: String(initial.precio) }
  })
  // imagenes: array de URLs ya subidas
  const [imagenes, setImagenes] = useState(
    () => initial?.imagenes?.length ? initial.imagenes : initial?.imagen ? [initial.imagen] : []
  )
  const [applyLogo, setApplyLogo] = useState(false) // Logo SR en imagen (desactivado: se muestra en la card)
  const [errors, setErrors] = useState({})

  // Auto emoji cuando cambia categoría o parteCuerpo
  useEffect(() => {
    setForm(f => ({ ...f, emoji: getAutoEmoji(f.categoria, f.parteCuerpo) }))
  }, [form.categoria, form.parteCuerpo])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleImageFile = (file) => {
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim())         e.nombre   = 'Requerido'
    if (!form.precio || isNaN(+form.precio) || +form.precio <= 0) e.precio = 'Precio inválido'
    // Descripción es opcional
    if (form.colores.length === 0)   e.colores  = 'Elegí al menos un color'
    if (form.talles.length === 0)    e.talles   = 'Elegí al menos un talle'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    // Incluir definiciones de colores custom para que se vean en la web pública
    const allCustomDefs = loadCustomDefs()
    const predefinedSet = new Set(PREDEFINED_COLORS)
    const colorDefs = {}
    form.colores.forEach(c => {
      if (!predefinedSet.has(c) && allCustomDefs[c]) {
        colorDefs[c] = allCustomDefs[c]
      }
    })

    // Limpiar promos: convertir a números y filtrar vacías
    const cleanPromos = (form.promos ?? [])
      .filter(p => Number(p.cantidad) > 0 && Number(p.precioTotal) > 0)
      .map(p => ({ cantidad: Number(p.cantidad), precioTotal: Number(p.precioTotal) }))
      .sort((a, b) => a.cantidad - b.cantidad)

    const product = {
      ...form,
      id:       form.id ?? `p${Date.now()}`,
      precio:   Number(form.precio),
      imagenes,
      promos:   cleanPromos,
      ...(Object.keys(colorDefs).length > 0 && { colorDefs }),
    }
    // Eliminar campos legacy
    delete product.imagen
    delete product.tag

    onSave(product)
  }

  const busy = saving

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Título del form */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {initial ? `Editando: ${initial.nombre}` : 'Nuevo producto'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Completá el formulario y guardá. Usá "Publicar en sitio" para que los cambios sean visibles.
        </p>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Columna izquierda: imagen + info básica ── */}
        <div className="space-y-5">
          <Field>
            <div className="flex items-center gap-2 mb-1.5">
              <Label>Imágenes del producto</Label>
              <div className="relative group">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center cursor-help select-none">i</span>
                <div className="absolute top-0 left-full ml-2 w-72 bg-gray-900 text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <p className="font-semibold mb-1.5">Imágenes del producto</p>
                  <p>• Subí una o más fotos (JPG, PNG, WEBP). La primera es la imagen principal que se muestra en el catálogo.</p>
                  <p className="mt-1">• Arrastrá para reordenar o hacé clic en + para agregar más.</p>
                  <hr className="border-gray-700 my-1.5" />
                  <p className="font-semibold mb-1">🪄 Herramienta de fondo</p>
                  <p>• Seleccioná imágenes y quitá el fondo con IA. Podés elegir fondo gris degradado o blanco puro.</p>
                  <p className="mt-1">• Corre 100% en tu navegador, es gratis y sin límites. La primera vez descarga el modelo (~30MB, queda cacheado).</p>
                  <hr className="border-gray-700 my-1.5" />
                  <p className="font-semibold mb-1">SR Logo</p>
                  <p>• Si está activado el checkbox, al subir cada imagen se aplica automáticamente el logo SR (marca de agua sutil) en la esquina superior derecha.</p>
                  <p className="mt-1">• También se re-aplica después de quitar el fondo con IA.</p>
                  <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            </div>
            <MultiImageUploader
              images={imagenes}
              onChange={setImagenes}
              productName={form.nombre}
              applyLogo={applyLogo}
            />
          </Field>

          {/* Toggle logo SR */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyLogo}
              onChange={e => setApplyLogo(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-saro-blue focus:ring-saro-blue"
            />
            <span className="text-xs text-gray-600">Grabar logo <span className="font-bold text-saro-blue">SR</span> en la imagen (el logo ya se muestra en la card automáticamente)</span>
          </label>

          {/* ── Herramienta de fondo IA ── */}
          {imagenes.length > 0 && (
            <BgRemovalSection
              images={imagenes}
              onChange={setImagenes}
              productName={form.nombre}
              applyLogo={applyLogo}
              isPaleta={form.categoria === 'paleta'}
            />
          )}

          {/* ── Generador de escenas con IA ── */}
          {imagenes.length > 0 && (
            <AiSceneSection
              images={imagenes}
              onChange={setImagenes}
              productName={form.nombre}
            />
          )}

          <Field>
            <Label required>Nombre</Label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Remera Training Pro"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue ${errors.nombre ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre}</p>}
          </Field>

          <Field>
            <Label required>Precio (ARS)</Label>
            <input
              type="number"
              min="0"
              value={form.precio}
              onChange={e => set('precio', e.target.value)}
              placeholder="18500"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue ${errors.precio ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.precio && <p className="text-xs text-red-500">{errors.precio}</p>}
            {form.precio && !isNaN(+form.precio) && (
              <p className="text-xs text-gray-500">${(+form.precio).toLocaleString('es-AR')}</p>
            )}
          </Field>

          <Field>
            <Label>Etiquetas</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TAG_CONFIG).map(([k, v]) => {
                const active = form.tags.includes(k)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set('tags', active ? form.tags.filter(t => t !== k) : [...form.tags, k])}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                      active
                        ? `${v.cls} border-transparent shadow-sm`
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>
            {form.tags.length === 0 && (
              <p className="text-xs text-gray-400">Sin etiqueta</p>
            )}
          </Field>

          <Field>
            <Label>Descripción</Label>
            <textarea
              rows={4}
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Escribí palabras clave y usá ✨ para generar, o dejalo vacío y la IA usa el nombre"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue resize-none ${errors.descripcion ? 'border-red-400' : 'border-gray-200'}`}
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  if (!form.nombre.trim()) return
                  set('_aiLoading', true)
                  try {
                    const res = await fetch('/api/generate-description', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        nombre: form.nombre,
                        keywords: form.descripcion,
                        precio: form.precio,
                        pin: sessionStorage.getItem('saro_admin_pin') ?? '',
                      }),
                    })
                    const json = await res.json()
                    if (json.ok && json.descripcion) {
                      set('descripcion', json.descripcion)
                      const newCount = incrementAiUsage()
                      set('_aiCount', newCount)
                    } else {
                      alert(json.error || 'No se pudo generar la descripción')
                    }
                  } catch {
                    alert('Error de conexión con el generador de descripciones')
                  } finally {
                    set('_aiLoading', false)
                  }
                }}
                disabled={form._aiLoading || !form.nombre.trim()}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  form._aiLoading
                    ? 'bg-purple-100 text-purple-400 cursor-not-allowed'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200 hover:border-purple-300'
                }`}
              >
                {form._aiLoading ? (
                  <><span className="animate-spin">⏳</span> Generando…</>
                ) : (
                  <><span>✨</span> Generar con IA</>
                )}
              </button>
              <span className="text-[10px] text-gray-400 tabular-nums">
                {form._aiCount ?? getAiUsage().count}/{AI_DAILY_LIMIT} hoy
              </span>
              <div className="relative group">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center cursor-help select-none">i</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-[11px] leading-relaxed rounded-xl px-3 py-2.5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <p className="font-semibold mb-1.5">✨ Generador con IA</p>
                  <p>• Escribí palabras clave en la descripción y tocá ✨ para que la IA las desarrolle en un texto atractivo.</p>
                  <p className="mt-1">• Si dejás la descripción vacía, la IA genera a partir del nombre del producto.</p>
                  <p className="mt-1">• Siempre podés editar el resultado antes de guardar.</p>
                  <hr className="border-gray-700 my-1.5" />
                  <p className="text-gray-400">Usa la API gratuita de Google Gemini. Límite aprox: {AI_DAILY_LIMIT} usos por día. Si se agota, vuelve a estar disponible al día siguiente.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                </div>
              </div>
            </div>
          </Field>
        </div>

        {/* ── Columna central + derecha: filtros y variantes ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
            <h3 className="font-semibold text-gray-800 text-sm">Filtros de catálogo</h3>

            <Field>
              <Label>Categoría</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: 'ropa', label: 'Ropa', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg> },
                  { val: 'padel', label: 'Pádel', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.3"/></svg> },
                  { val: 'paleta', label: 'Paletas', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><ellipse cx="12" cy="9" rx="6" ry="8"/><line x1="12" y1="17" x2="12" y2="23" strokeLinecap="round"/><circle cx="10" cy="7" r="0.8" fill="currentColor" stroke="none"/><circle cx="14" cy="7" r="0.8" fill="currentColor" stroke="none"/><circle cx="12" cy="10" r="0.8" fill="currentColor" stroke="none"/><circle cx="10" cy="12" r="0.8" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r="0.8" fill="currentColor" stroke="none"/></svg> },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => set('categoria', opt.val === form.categoria ? '' : opt.val)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      form.categoria === opt.val
                        ? 'bg-saro-blue border-saro-blue text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue hover:text-saro-blue'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            {form.categoria !== 'paleta' && (
            <Field>
              <Label>Género</Label>
              <RadioGroup
                value={form.genero}
                onChange={v => set('genero', v === form.genero ? '' : v)}
                options={[
                  { val: 'masculino', label: 'Masculino' },
                  { val: 'femenino',  label: 'Femenino'  },
                  { val: 'unisex',    label: 'Unisex'    },
                ]}
              />
            </Field>
            )}

            {form.categoria !== 'paleta' && (
            <Field>
              <Label>Parte del cuerpo</Label>
              <RadioGroup
                value={form.parteCuerpo}
                onChange={v => set('parteCuerpo', v === form.parteCuerpo ? '' : v)}
                options={[
                  { val: 'torso',     label: 'Torso'     },
                  { val: 'piernas',   label: 'Piernas'   },
                  { val: 'accesorio', label: 'Accesorio' },
                ]}
              />
            </Field>
            )}

            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-gray-500">Emoji automático:</span>
              <span className="text-2xl">{form.emoji}</span>
              <input
                type="text"
                value={form.emoji}
                onChange={e => set('emoji', e.target.value)}
                className="w-12 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-saro-blue"
                maxLength={2}
                title="Podés cambiarlo manualmente"
              />
            </div>
          </div>

          {/* Colores */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">
              Colores disponibles
              {errors.colores && <span className="ml-2 text-red-500 font-normal text-xs">{errors.colores}</span>}
            </h3>
            <ColorPicker
              selected={form.colores}
              onChange={v => { set('colores', v); set('noStock', []) }}
            />
          </div>

          {/* Talles */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">
              Talles disponibles
              {errors.talles && <span className="ml-2 text-red-500 font-normal text-xs">{errors.talles}</span>}
            </h3>
            <TallePicker
              selected={form.talles}
              onChange={v => { set('talles', v); set('noStock', []) }}
            />
          </div>

          {/* Sin stock */}
          {form.colores.length > 0 && form.talles.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Sin stock</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Marcá con ✕ rojo las combinaciones color/talle que no tenés disponibles.
                </p>
              </div>
              <NoStockMatrix
                colores={form.colores}
                talles={form.talles}
                noStock={form.noStock}
                onChange={v => set('noStock', v)}
              />
            </div>
          )}

          {/* Promos por cantidad */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-800 text-sm">🔥 Promos por cantidad</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Definí precios especiales para compras por cantidad (ej: 20u × $33.000).
              </p>
            </div>
            <PromoEditor
              promos={form.promos ?? []}
              onChange={v => set('promos', v)}
              precioBase={form.precio}
            />
          </div>

          {/* Preview rápido */}
          <div className="bg-saro-light rounded-2xl p-4 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0 overflow-hidden"
              style={{ backgroundColor: '#dbeafe' }}
            >
              {imagenes[0]
                ? <img src={imagenes[0]} alt="" className="w-full h-full object-cover" />
                : form.emoji
              }
            </div>
            <div>
              <p className="font-bold text-saro-dark">{form.nombre || 'Nombre del producto'}</p>
              <p className="text-saro-blue font-extrabold text-lg">
                {form.precio ? `$${(+form.precio).toLocaleString('es-AR')}` : '$0'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {form.categoria} · {form.genero} · {form.parteCuerpo}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={busy}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                busy
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-saro-blue hover:bg-saro-dark text-white shadow-sm'
              }`}
            >
              {saving ? '💾 Guardando…' : initial ? '💾 Guardar cambios' : '✅ Publicar producto'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
