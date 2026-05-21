import { useState, useEffect, useRef } from 'react'
import {
  COLOR_MAP, PREDEFINED_COLORS, PREDEFINED_TALLES,
  getAutoEmoji, TAG_CONFIG,
} from '../../utils/colors'

const BLANK = {
  nombre: '', precio: '', descripcion: '', tag: '',
  categoria: 'ropa', genero: 'masculino', parteCuerpo: 'torso',
  colores: [], talles: [], noStock: [], emoji: '👕', imagen: '',
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

// ── Imagen uploader ───────────────────────────────────────────────────────────

function ImageUploader({ preview, onFile }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handle = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    onFile(file)
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      className={`relative aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
        dragging ? 'border-saro-blue bg-saro-light' : 'border-gray-200 hover:border-saro-blue hover:bg-gray-50'
      }`}
    >
      {preview ? (
        <>
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-sm font-semibold">Cambiar imagen</span>
          </div>
        </>
      ) : (
        <div className="text-center p-4 select-none">
          <span className="text-4xl block mb-2">📷</span>
          <p className="text-sm font-medium text-gray-500">Clic o arrastrá la imagen</p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handle(e.target.files[0])}
      />
    </div>
  )
}

// ── Selector de colores ───────────────────────────────────────────────────────

function ColorPicker({ selected, onChange }) {
  const [custom, setCustom] = useState('')

  const toggle = (c) =>
    onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !selected.includes(v)) onChange([...selected, v])
    setCustom('')
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PREDEFINED_COLORS.map(c => {
          const active = selected.includes(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              title={c}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? 'border-saro-blue bg-saro-light text-saro-dark ring-2 ring-saro-blue/20'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: COLOR_MAP[c] ?? '#e5e7eb' }}
              />
              {c}
              {active && <span className="text-saro-blue font-bold">✓</span>}
            </button>
          )
        })}
      </div>
      {/* Color custom */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Color personalizado…"
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
                    style={{ backgroundColor: COLOR_MAP[color] ?? '#e5e7eb' }}
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

// ── Formulario principal ──────────────────────────────────────────────────────

export default function ProductForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm]         = useState(() => initial ? { ...BLANK, ...initial, precio: String(initial.precio) } : { ...BLANK })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview]   = useState(initial?.imagen ?? '')
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors]     = useState({})

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    let imagenFinal = form.imagen

    // Subir imagen si hay un archivo nuevo
    if (imageFile) {
      setUploading(true)
      const reader = new FileReader()
      imagenFinal = await new Promise((resolve, reject) => {
        reader.onload = async (ev) => {
          const base64 = ev.target.result.split(',')[1]
          const ext    = imageFile.name.split('.').pop().toLowerCase()
          const slug   = form.nombre.trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const name   = `${slug}.${ext}`
          try {
            const res  = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, data: base64 }),
            })
            const json = await res.json()
            resolve(json.path ?? '')
          } catch { resolve('') }
        }
        reader.onerror = reject
        reader.readAsDataURL(imageFile)
      })
      setUploading(false)
    }

    const product = {
      ...form,
      id:     form.id ?? `p${Date.now()}`,
      precio: Number(form.precio),
      imagen: imagenFinal || undefined,
    }
    if (!product.imagen) delete product.imagen

    onSave(product)
  }

  const busy = saving || uploading

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Título del form */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          {initial ? `Editando: ${initial.nombre}` : 'Nuevo producto'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Los cambios se guardan directamente en <code>public/products.json</code>
        </p>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Columna izquierda: imagen + info básica ── */}
        <div className="space-y-5">
          <Field>
            <Label>Imagen del producto</Label>
            <ImageUploader preview={preview} onFile={handleImageFile} />
            {preview && (
              <button
                type="button"
                onClick={() => { setPreview(''); setImageFile(null); set('imagen', '') }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Quitar imagen
              </button>
            )}
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
            <Label>Tag / etiqueta</Label>
            <select
              value={form.tag}
              onChange={e => set('tag', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-saro-blue bg-white"
            >
              <option value="">Sin etiqueta</option>
              {Object.entries(TAG_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
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
              <Label required>Categoría</Label>
              <RadioGroup
                value={form.categoria}
                onChange={v => set('categoria', v)}
                options={[{ val: 'ropa', label: '👕 Ropa' }, { val: 'padel', label: '🏓 Pádel' }]}
              />
            </Field>

            <Field>
              <Label required>Género</Label>
              <RadioGroup
                value={form.genero}
                onChange={v => set('genero', v)}
                options={[
                  { val: 'masculino', label: '♂ Masculino' },
                  { val: 'femenino',  label: '♀ Femenino'  },
                  { val: 'unisex',    label: '⚡ Unisex'    },
                ]}
              />
            </Field>

            <Field>
              <Label required>Parte del cuerpo</Label>
              <RadioGroup
                value={form.parteCuerpo}
                onChange={v => set('parteCuerpo', v)}
                options={[
                  { val: 'torso',     label: '👕 Torso'     },
                  { val: 'piernas',   label: '🩳 Piernas'   },
                  { val: 'pies',      label: '🧦 Pies'      },
                  { val: 'manos',     label: '🤚 Manos'     },
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

          {/* Preview rápido */}
          <div className="bg-saro-light rounded-2xl p-4 flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ backgroundColor: '#dbeafe' }}
            >
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover rounded-xl" />
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
              {uploading ? '⬆️ Subiendo imagen…'
                : saving  ? '💾 Guardando…'
                : initial  ? '💾 Guardar cambios'
                : '✅ Publicar producto'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
