'use client'
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { PDFDocument } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

// Worker de pdf.js — archivo local en /public (evita problemas de CDN con versiones no publicadas)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

const LAYOUTS = {
  2: { cols: 2, rows: 1 },
  3: { cols: 3, rows: 1 },
  4: { cols: 2, rows: 2 },
}

const LETTER_W = 612
const LETTER_H = 792
const MM_TO_PT = 72 / 25.4
const DETECT_SCALE = 2 // resolución para escaneo (2x = ~144 DPI)
const BOTTOM_CROP_MM = 21 // recorte inferior para eliminar cuadro blanco de la etiqueta

// Algunas etiquetas traen un cuadro vacío (con borde) debajo del último código de
// barras: ese se recorta. Las etiquetas individuales no lo traen, y recortarlas
// se come contenido real.
//
// En vez de recortar una franja fija, se busca dónde termina el contenido real
// (texto/códigos de barras) mirando de abajo hacia arriba, ignorando las líneas
// finas del marco. Lo que sobre debajo de eso es el cuadro vacío → se recorta.
const ROW_INK_RATIO = 0.10  // desde qué % del ancho una fila cuenta como "con contenido"
const MARCO_MAX_PX   = 6    // una línea del marco no es más alta que esto (a DETECT_SCALE)
const MIN_CROP_PX    = 10   // por debajo de esto no vale la pena recortar

// ── Historial de envíos compilados (persistido en localStorage) ──
const HISTORY_KEY = 'saro_label_history'

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

function addToHistory(count) {
  const history = loadHistory()
  history.push({ date: new Date().toISOString(), count })
  saveHistory(history)
  return history
}

/**
 * Devuelve true si la fila `y` del imageData tiene al menos un píxel no-blanco.
 */
function rowHasContent(data, width, y, threshold) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4
    if (data[idx] < threshold || data[idx + 1] < threshold || data[idx + 2] < threshold) {
      return true
    }
  }
  return false
}

/**
 * Detecta el bounding box de la etiqueta en la primera página
 * renderizando a canvas y escaneando píxeles no-blancos.
 * Ignora elementos aislados (líneas de corte, footers) separados
 * por gaps verticales grandes (>GAP_THRESHOLD px de blanco).
 * Devuelve { x0, y0, x1, y1 } en coordenadas PDF (origen bottom-left).
 */
const GAP_THRESHOLD_PX = 40 // ~20pt @ 2x — gap mínimo para considerar "separado"

/**
 * Busca la última fila con contenido real de la etiqueta, de abajo hacia arriba.
 * Las líneas finas (bordes del marco y del cuadro vacío al pie) se ignoran, así
 * que devuelve el final del último texto o código de barras.
 * Devuelve null si no encuentra nada.
 */
function findContentBottom(data, width, xa, xb, ya, yb, threshold) {
  const bandW = xb - xa + 1
  if (bandW <= 0 || yb < ya) return null

  const tieneContenido = y => {
    let dark = 0
    for (let x = xa; x <= xb; x++) {
      const idx = (y * width + x) * 4
      if (data[idx] < threshold || data[idx + 1] < threshold || data[idx + 2] < threshold) dark++
    }
    return dark / bandW > ROW_INK_RATIO
  }

  let y = yb
  while (y >= ya) {
    if (!tieneContenido(y)) { y--; continue }
    // Medir el alto del bloque al que pertenece esta fila
    let top = y
    while (top - 1 >= ya && tieneContenido(top - 1)) top--
    if (y - top + 1 > MARCO_MAX_PX) return y  // bloque grueso → contenido real
    y = top - 1                                // línea fina del marco → seguir subiendo
  }
  return null
}

async function detectPageBbox(page, cropMode) {
  const viewport = page.getViewport({ scale: DETECT_SCALE })

  // Renderizar a canvas offscreen
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport }).promise

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data, width, height } = imgData

  const threshold = 240 // debajo de esto se considera "contenido"

  // 1) Encontrar primera y última fila con contenido (bruto)
  let rawTop = 0, rawBottom = height - 1
  for (let y = 0; y < height; y++) {
    if (rowHasContent(data, width, y, threshold)) { rawTop = y; break }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (rowHasContent(data, width, y, threshold)) { rawBottom = y; break }
  }

  // 2) Construir mapa de filas con contenido y detectar bloques contiguos
  //    Un "bloque" es un rango de filas donde no hay gaps > GAP_THRESHOLD_PX
  const blocks = [] // { top, bottom }
  let blockStart = null
  let blankRun = 0

  for (let y = rawTop; y <= rawBottom; y++) {
    if (rowHasContent(data, width, y, threshold)) {
      if (blockStart === null) {
        blockStart = y
      }
      blankRun = 0
    } else {
      blankRun++
      if (blockStart !== null && blankRun >= GAP_THRESHOLD_PX) {
        // Cerrar bloque anterior (el bottom es la última fila con contenido)
        blocks.push({ top: blockStart, bottom: y - blankRun })
        blockStart = null
        blankRun = 0
      }
    }
  }
  // Cerrar último bloque
  if (blockStart !== null) {
    blocks.push({ top: blockStart, bottom: rawBottom })
  }

  // 3) Tomar el bloque más alto (mayor cantidad de filas) = la etiqueta real
  //    Esto ignora líneas de corte aisladas arriba o abajo
  let best = blocks[0] || { top: rawTop, bottom: rawBottom }
  for (const b of blocks) {
    if ((b.bottom - b.top) > (best.bottom - best.top)) best = b
  }

  const topPx = best.top
  const bottomPx = best.bottom

  // 4) Encontrar límites horizontales dentro del bloque detectado
  let leftPx = 0, rightPx = width - 1
  for (let x = 0; x < width; x++) {
    let hasContent = false
    for (let y = topPx; y <= bottomPx; y++) {
      const idx = (y * width + x) * 4
      if (data[idx] < threshold || data[idx + 1] < threshold || data[idx + 2] < threshold) {
        hasContent = true
        break
      }
    }
    if (hasContent) { leftPx = x; break }
  }
  for (let x = width - 1; x >= 0; x--) {
    let hasContent = false
    for (let y = topPx; y <= bottomPx; y++) {
      const idx = (y * width + x) * 4
      if (data[idx] < threshold || data[idx + 1] < threshold || data[idx + 2] < threshold) {
        hasContent = true
        break
      }
    }
    if (hasContent) { rightPx = x; break }
  }

  // 5) ¿Hay que recortar la franja inferior?
  //    Sólo si ahí abajo hay un cuadro vacío (el de las etiquetas del correo).
  //    En las etiquetas individuales esa franja tiene contenido real (el código
  //    de barras final) y recortarla se lo comería.
  let recortar = false
  let cropBottomPx = bottomPx   // hasta dónde llega la etiqueta una vez recortada

  if (cropMode === 'siempre') {
    // Comportamiento clásico: franja fija de 21 mm
    cropBottomPx = bottomPx - Math.round(BOTTOM_CROP_MM * MM_TO_PT * DETECT_SCALE)
    recortar = true
  } else if (cropMode === 'auto') {
    const contentBottom = findContentBottom(data, width, leftPx, rightPx, topPx, bottomPx, threshold)
    // Si debajo del último contenido real sobra espacio (el cuadro vacío), se recorta ahí
    if (contentBottom !== null && bottomPx - contentBottom > MIN_CROP_PX) {
      cropBottomPx = contentBottom + Math.round(2 * MM_TO_PT * DETECT_SCALE) // 2 mm de aire
      recortar = true
    }
  }
  const effBottomPx = Math.max(topPx + 1, Math.min(bottomPx, cropBottomPx))

  // 6) Convertir píxeles a coordenadas PDF (puntos)
  const pageW = page.getViewport({ scale: 1 }).width
  const pageH = page.getViewport({ scale: 1 }).height
  const pxToPt = 1 / DETECT_SCALE

  const pad = 2 // padding en puntos
  const x0 = Math.max(0, leftPx * pxToPt - pad)
  const x1 = Math.min(pageW, rightPx * pxToPt + pad)
  // PDF tiene origen bottom-left, canvas tiene origen top-left
  const y1 = Math.min(pageH, pageH - (topPx * pxToPt) + pad)
  const y0 = Math.max(0, Math.min(pageH - (effBottomPx * pxToPt) - pad, y1 - 10))

  return { x0, y0, x1, y1, pageW, pageH, recortado: recortar }
}

/** Detecta el bbox de CADA página del PDF (pueden tener formatos distintos). */
async function detectLabelBboxes(pdfBytes, cropMode) {
  const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise
  const bboxes = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    bboxes.push(await detectPageBbox(page, cropMode))
  }
  pdf.destroy()
  return bboxes
}

/**
 * Compila etiquetas de múltiples PDFs.
 * Cada PDF se analiza por separado (bbox propio) y todas las páginas
 * se compilan en un único documento de salida.
 */
async function compileLabels(pdfBuffers, { perPage = 4, marginMm = 8, gapMm = 4, cropMode = 'auto', onStatus }) {
  const { cols, rows } = LAYOUTS[perPage]
  const margin = marginMm * MM_TO_PT
  const gap = gapMm * MM_TO_PT
  const cellW = (LETTER_W - 2 * margin - (cols - 1) * gap) / cols
  const cellH = (LETTER_H - 2 * margin - (rows - 1) * gap) / rows

  // 1) Analizar cada PDF: se detecta el bbox de CADA página, así un mismo PDF
  //    puede mezclar etiquetas con y sin cuadro vacío al pie.
  const sources = [] // { srcDoc, bboxes }
  for (let f = 0; f < pdfBuffers.length; f++) {
    onStatus?.(`Detectando etiquetas (${f + 1}/${pdfBuffers.length})…`)
    const bytes = pdfBuffers[f]
    const bboxes = await detectLabelBboxes(new Uint8Array(bytes), cropMode)
    const srcDoc = await PDFDocument.load(bytes)
    sources.push({ srcDoc, bboxes })
  }

  // 2) Construir lista plana de { srcDoc, pageIndex, bbox }
  const allPages = []
  for (const src of sources) {
    src.bboxes.forEach((bbox, i) => {
      allPages.push({ srcDoc: src.srcDoc, pageIndex: i, bbox })
    })
  }

  const totalLabels = allPages.length
  onStatus?.('Compilando…')

  const outDoc = await PDFDocument.create()

  for (let pageStart = 0; pageStart < totalLabels; pageStart += perPage) {
    const sheet = outDoc.addPage([LETTER_W, LETTER_H])
    const batchEnd = Math.min(pageStart + perPage, totalLabels)

    for (let i = pageStart; i < batchEnd; i++) {
      const { srcDoc, pageIndex, bbox } = allPages[i]
      const slot = i - pageStart
      const col = slot % cols
      const row = Math.floor(slot / cols)

      // Escala según el bbox de este PDF en particular
      const labelW = bbox.x1 - bbox.x0
      const labelH = bbox.y1 - bbox.y0
      const scale = Math.min(cellW / labelW, cellH / labelH)
      const drawW = labelW * scale
      const drawH = labelH * scale

      const [embedded] = await outDoc.embedPages([srcDoc.getPage(pageIndex)], [{
        left: bbox.x0,
        bottom: bbox.y0,
        right: bbox.x1,
        top: bbox.y1,
      }])

      const cellX = margin + col * (cellW + gap)
      const cellY = LETTER_H - margin - (row + 1) * cellH - row * gap
      const destX = cellX + (cellW - drawW) / 2
      const destY = cellY + (cellH - drawH) / 2

      sheet.drawPage(embedded, {
        x: destX,
        y: destY,
        width: drawW,
        height: drawH,
      })

      onStatus?.(`${i + 1}/${totalLabels} etiquetas`)
    }
  }

  return {
    pdfBytes: await outDoc.save(),
    totalLabels,
    sheets: Math.ceil(totalLabels / perPage),
    layout: `${cols}×${rows}`,
    // cuántas tenían el cuadro vacío al pie (y se recortó)
    recortadas: allPages.filter(p => p.bbox.recortado).length,
  }
}

export default function LabelCompiler() {
  const [files, setFiles] = useState([]) // Array de File
  const [perPage, setPerPage] = useState(4)
  const [marginMm, setMarginMm] = useState(8)
  const [gapMm, setGapMm] = useState(4)
  const [cropMode, setCropMode] = useState('auto') // 'auto' | 'siempre' | 'nunca'
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  // Historial de envíos
  const [history, setHistory] = useState(loadHistory)
  const [statFilter, setStatFilter] = useState('todo') // 'semana' | 'mes' | 'todo'

  const isDefault = perPage === 4 && marginMm === 8 && gapMm === 4 && cropMode === 'auto'

  const filteredStats = useMemo(() => {
    const now = Date.now()
    const week = 7 * 24 * 60 * 60 * 1000
    const month = 30 * 24 * 60 * 60 * 1000

    let filtered = history
    if (statFilter === 'semana') {
      filtered = history.filter(h => now - new Date(h.date).getTime() < week)
    } else if (statFilter === 'mes') {
      filtered = history.filter(h => now - new Date(h.date).getTime() < month)
    }

    const totalLabels = filtered.reduce((sum, h) => sum + h.count, 0)
    const compilations = filtered.length
    return { totalLabels, compilations }
  }, [history, statFilter])

  const addFiles = useCallback((newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfs.length > 0) {
      setFiles(prev => [...prev, ...pdfs])
      setResult(null)
      setError(null)
    }
  }, [])

  const removeFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setResult(null)
    setError(null)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleCompile = async () => {
    if (files.length === 0) return
    setProcessing(true)
    setError(null)
    setResult(null)
    setStatusMsg('Preparando…')

    try {
      // Leer todos los archivos en paralelo
      const buffers = await Promise.all(
        files.map(async f => new Uint8Array(await f.arrayBuffer()))
      )

      const info = await compileLabels(buffers, {
        perPage,
        marginMm,
        gapMm,
        cropMode,
        onStatus: setStatusMsg,
      })

      // Nombre del archivo: etiquetas-YYYY-MM-DD.pdf
      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const fileName = `etiquetas-${yyyy}-${mm}-${dd}.pdf`

      // Abrir en nueva pestaña para imprimir
      const blob = new Blob([info.pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = fileName

      const win = window.open(url, '_blank')
      if (win) {
        win.document.title = fileName
        win.onload = () => { try { win.print() } catch {} }
        setTimeout(() => { try { win.print() } catch {} }, 1500)
      }

      // Registrar en historial
      setHistory(addToHistory(info.totalLabels))

      setResult({
        totalLabels: info.totalLabels,
        sheets: info.sheets,
        layout: info.layout,
        recortadas: info.recortadas,
      })
    } catch (e) {
      setError('Error al procesar el PDF: ' + (e.message || 'desconocido'))
    } finally {
      setProcessing(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 overflow-hidden">

      {/* Contador de envíos */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Envíos compilados</span>
          <div className="flex gap-1">
            {[
              { key: 'semana', label: '7 días' },
              { key: 'mes', label: '30 días' },
              { key: 'todo', label: 'Todo' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setStatFilter(f.key)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statFilter === f.key
                    ? 'bg-saro-blue text-white'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <p className="text-3xl font-extrabold text-saro-blue leading-none">{filteredStats.totalLabels}</p>
            <p className="text-xs text-gray-400 mt-1">etiquetas</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-600 leading-none">{filteredStats.compilations}</p>
            <p className="text-xs text-gray-400 mt-1">compilaciones</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Compilador de Etiquetas</h2>
        <p className="text-sm text-gray-400 mt-1">
          Subí uno o varios PDFs con etiquetas de envío y se agrupan para imprimir.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl px-6 py-12 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-saro-blue bg-saro-light'
            : files.length > 0
            ? 'border-green-300 bg-green-50'
            : 'border-gray-200 hover:border-saro-blue hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />
        <span className="text-4xl block mb-3">{files.length > 0 ? '✅' : '📄'}</span>
        <p className="font-bold text-gray-800 text-sm">
          {files.length > 0
            ? `${files.length} archivo${files.length > 1 ? 's' : ''} cargado${files.length > 1 ? 's' : ''}`
            : 'Arrastrá tus PDFs aquí'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {files.length > 0
            ? 'Tocá para agregar más'
            : 'o hacé click para seleccionar (uno o varios)'}
        </p>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, idx) => (
            <div key={`${f.name}-${idx}`} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{(f.size / 1024).toFixed(0)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeFile(idx) }}
                className="text-gray-300 hover:text-red-500 transition-colors ml-3 flex-shrink-0 text-lg leading-none"
                title="Quitar archivo"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => { setFiles([]); setResult(null); setError(null) }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Quitar todos
          </button>
        </div>
      )}

      {/* Configuración */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Configuración</span>
          {!isDefault && (
            <button
              type="button"
              onClick={() => { setPerPage(4); setMarginMm(8); setGapMm(4); setCropMode('auto') }}
              className="text-xs text-saro-blue hover:text-saro-dark font-medium transition-colors"
            >
              ↺ Restablecer valores
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Por hoja
            </label>
            <select
              value={perPage}
              onChange={e => setPerPage(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saro-blue"
            >
              <option value={2}>2 (2×1)</option>
              <option value={3}>3 (3×1)</option>
              <option value={4}>4 (2×2)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Margen (mm)
            </label>
            <input
              type="number"
              value={marginMm}
              onChange={e => setMarginMm(Number(e.target.value))}
              min={0} max={30} step={0.5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saro-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Separación (mm)
            </label>
            <input
              type="number"
              value={gapMm}
              onChange={e => setGapMm(Number(e.target.value))}
              min={0} max={20} step={0.5}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-saro-blue"
            />
          </div>
        </div>

        {/* Recorte del cuadro vacío al pie de la etiqueta */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Recorte inferior
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'auto',    label: 'Automático', hint: 'Detecta solo si hay cuadro vacío al pie' },
              { key: 'siempre', label: 'Siempre',    hint: 'Recorta siempre los 21 mm inferiores' },
              { key: 'nunca',   label: 'Nunca',      hint: 'No recorta (etiqueta completa)' },
            ].map(o => (
              <button
                key={o.key}
                type="button"
                onClick={() => setCropMode(o.key)}
                title={o.hint}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  cropMode === o.key
                    ? 'bg-saro-blue border-saro-blue text-white'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-saro-blue/40 hover:text-saro-blue'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            En automático detecta, etiqueta por etiqueta, si abajo hay un cuadro vacío para
            recortar. Si alguna sale cortada, probá con <strong>Nunca</strong>.
          </p>
        </div>

        {/* Botón compilar */}
        <button
          onClick={handleCompile}
          disabled={files.length === 0 || processing}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            files.length === 0 || processing
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-saro-dark hover:bg-saro-blue text-white shadow-lg'
          }`}
        >
          {processing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {statusMsg || 'Procesando…'}
            </>
          ) : (
            <>
              <span>🖨️</span>
              COMPILAR E IMPRIMIR
            </>
          )}
        </button>
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-bold text-green-800 text-sm mb-3">✅ Compilado correctamente</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-saro-blue">{result.totalLabels}</p>
              <p className="text-xs text-gray-500 mt-0.5">Envíos</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-gray-800">{result.sheets}</p>
              <p className="text-xs text-gray-500 mt-0.5">Hojas</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-gray-800">{result.totalLabels > 1 ? result.layout : '1'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Por hoja</p>
            </div>
          </div>
          {cropMode === 'auto' && (
            <p className="text-xs text-green-700/80 mt-3">
              {result.recortadas === 0
                ? 'Ninguna tenía cuadro vacío al pie: se imprimen completas.'
                : result.recortadas === result.totalLabels
                ? 'Todas tenían cuadro vacío al pie: se recortó en todas.'
                : `${result.recortadas} de ${result.totalLabels} tenían cuadro vacío al pie (recortadas); el resto va completa.`}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm text-red-700 font-medium">❌ {error}</p>
        </div>
      )}
    </div>
  )
}
