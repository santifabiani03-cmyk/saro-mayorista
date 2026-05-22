import { useState, useEffect, useRef } from 'react'
import {
  COLOR_MAP, PREDEFINED_COLORS, PREDEFINED_TALLES,
  getAutoEmoji, TAG_CONFIG, getProductTags, getSwatchStyle,
} from '../../utils/colors'

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
    return json.path ?? null
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

function MultiImageUploader({ images, onChange, productName }) {
  const inputRef    = useRef()
  const [pending, setPending] = useState(0)   // cuántas imágenes se están subiendo
  const [dragging, setDragging] = useState(false)

  const handleFiles = async (files) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!list.length) return
    setPending(p => p + list.length)
    const urls = await Promise.all(list.map(f => uploadFile(f, productName)))
    onChange([...images, ...urls.filter(Boolean)])
    setPending(p => p - list.length)
    inputRef.current.value = ''
  }

  const remove = (i) => onChange(images.filter((_, j) => j !== i))

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
    >
      {/* Grid de imágenes */}
      <div className={`grid grid-cols-3 gap-2 p-2 rounded-2xl transition-colors ${dragging ? 'bg-saro-light border-2 border-saro-blue border-dashed' : ''}`}>

        {/* Imágenes existentes */}
        {images.map((url, i) => (
          <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
            {/* Badge "Principal" en la primera */}
            {i === 0 && (
              <span className="absolute bottom-1 left-1 text-[10px] bg-saro-blue text-white px-1.5 py-0.5 rounded-full font-semibold">
                Principal
              </span>
            )}
            {/* Botón eliminar */}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
            >✕</button>
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

// ── Selector de colores ───────────────────────────────────────────────────────

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
    if (!form.descripcion.trim())    e.descripcion = 'Requerido'
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
            <Label>Imágenes del producto</Label>
            <MultiImageUploader
              images={imagenes}
              onChange={setImagenes}
              productName={form.nombre}
            />
          </Field>

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
            <Label required>Descripción</Label>
            <textarea
              rows={4}
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              placeholder="Describí el producto: material, tecnología, uso…"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue resize-none ${errors.descripcion ? 'border-red-400' : 'border-gray-200'}`}
            />
            {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion}</p>}
          </Field>
        </div>

        {/* ── Columna central + derecha: filtros y variantes ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
            <h3 className="font-semibold text-gray-800 text-sm">Filtros de catálogo</h3>

            <Field>
              <Label>Categoría</Label>
              <RadioGroup
                value={form.categoria}
                onChange={v => set('categoria', v === form.categoria ? '' : v)}
                options={[{ val: 'ropa', label: '👕 Ropa' }, { val: 'padel', label: '🏓 Pádel' }]}
              />
            </Field>

            <Field>
              <Label>Género</Label>
              <RadioGroup
                value={form.genero}
                onChange={v => set('genero', v === form.genero ? '' : v)}
                options={[
                  { val: 'masculino', label: '♂ Masculino' },
                  { val: 'femenino',  label: '♀ Femenino'  },
                  { val: 'unisex',    label: '⚡ Unisex'    },
                ]}
              />
            </Field>

            <Field>
              <Label>Parte del cuerpo</Label>
              <RadioGroup
                value={form.parteCuerpo}
                onChange={v => set('parteCuerpo', v === form.parteCuerpo ? '' : v)}
                options={[
                  { val: 'torso',     label: '👕 Torso'     },
                  { val: 'piernas',   label: '🩳 Piernas'   },
                  { val: 'accesorio', label: '🎒 Accesorio' },
                ]}
              />
            </Field>

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
