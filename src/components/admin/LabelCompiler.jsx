import { useState, useRef, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'

const LAYOUTS = {
  2: { cols: 2, rows: 1 },
  3: { cols: 3, rows: 1 },
  4: { cols: 2, rows: 2 },
}

// Letter size in points
const LETTER_W = 612
const LETTER_H = 792
const MM_TO_PT = 72 / 25.4

/**
 * Compila etiquetas de envío: toma un PDF con 1 etiqueta por página
 * y las agrupa en hojas de 2, 3 o 4 para imprimir.
 */
async function compileLabels(pdfBytes, { perPage = 4, marginMm = 8, gapMm = 4 }) {
  const srcDoc = await PDFDocument.load(pdfBytes)
  const totalPages = srcDoc.getPageCount()
  const { cols, rows } = LAYOUTS[perPage]

  const margin = marginMm * MM_TO_PT
  const gap = gapMm * MM_TO_PT
  const cellW = (LETTER_W - 2 * margin - (cols - 1) * gap) / cols
  const cellH = (LETTER_H - 2 * margin - (rows - 1) * gap) / rows

  const outDoc = await PDFDocument.create()

  for (let pageStart = 0; pageStart < totalPages; pageStart += perPage) {
    const sheet = outDoc.addPage([LETTER_W, LETTER_H])
    const batchEnd = Math.min(pageStart + perPage, totalPages)

    for (let i = pageStart; i < batchEnd; i++) {
      const slot = i - pageStart
      const col = slot % cols
      const row = Math.floor(slot / cols)

      // Embeber la página original
      const [embedded] = await outDoc.embedPages([srcDoc.getPage(i)])
      const srcW = embedded.width
      const srcH = embedded.height

      // Escalar para que quepa en la celda
      const scale = Math.min(cellW / srcW, cellH / srcH)
      const drawW = srcW * scale
      const drawH = srcH * scale

      // Posición (origen bottom-left en PDF)
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
    }
  }

  return {
    pdfBytes: await outDoc.save(),
    totalLabels: totalPages,
    sheets: Math.ceil(totalPages / perPage),
    layout: `${cols}×${rows}`,
  }
}

export default function LabelCompiler() {
  const [file, setFile] = useState(null)
  const [perPage, setPerPage] = useState(4)
  const [marginMm, setMarginMm] = useState(8)
  const [gapMm, setGapMm] = useState(4)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = useCallback((f) => {
    if (f && f.name.toLowerCase().endsWith('.pdf')) {
      setFile(f)
      setResult(null)
      setError(null)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }, [handleFile])

  const handleCompile = async () => {
    if (!file) return
    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const arrayBuf = await file.arrayBuffer()
      const info = await compileLabels(new Uint8Array(arrayBuf), {
        perPage,
        marginMm,
        gapMm,
      })

      // Abrir en nueva pestaña para imprimir
      const blob = new Blob([info.pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        // Intentar abrir diálogo de impresión
        win.onload = () => { try { win.print() } catch {} }
        setTimeout(() => { try { win.print() } catch {} }, 1500)
      }

      setResult({
        totalLabels: info.totalLabels,
        sheets: info.sheets,
        layout: info.layout,
      })
    } catch (e) {
      setError('Error al procesar el PDF: ' + (e.message || 'desconocido'))
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Compilador de Etiquetas</h2>
        <p className="text-sm text-gray-400 mt-1">
          Subí un PDF con etiquetas de envío (una por página) y se agrupan para imprimir.
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
            : file
            ? 'border-green-300 bg-green-50'
            : 'border-gray-200 hover:border-saro-blue hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
        />
        <span className="text-4xl block mb-3">{file ? '✅' : '📄'}</span>
        <p className="font-bold text-gray-800 text-sm">
          {file ? file.name : 'Arrastrá tu PDF aquí'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {file
            ? `${(file.size / 1024).toFixed(0)} KB — Tocá para cambiar`
            : 'o hacé click para seleccionar'}
        </p>
      </div>

      {/* Configuración */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Configuración</span>
          {(perPage !== 4 || marginMm !== 8 || gapMm !== 4) && (
            <button
              type="button"
              onClick={() => { setPerPage(4); setMarginMm(8); setGapMm(4) }}
              className="text-xs text-saro-blue hover:text-saro-dark font-medium transition-colors"
            >
              ↺ Restablecer valores
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
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

        {/* Botón compilar */}
        <button
          onClick={handleCompile}
          disabled={!file || processing}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            !file || processing
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
              Procesando…
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
              <p className="text-2xl font-extrabold text-gray-800">{result.layout}</p>
              <p className="text-xs text-gray-500 mt-0.5">Layout</p>
            </div>
          </div>
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
