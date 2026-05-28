'use client'
import { useState, useEffect } from 'react'
import ProductForm from '../components/admin/ProductForm'
import ProductList from '../components/admin/ProductList'
import DemandDashboard from '../components/admin/DemandDashboard'
import LabelCompiler from '../components/admin/LabelCompiler'
import { exportCatalogPdf } from '../utils/exportCatalogPdf'


const SESSION_KEY     = 'saro_admin_auth'
const SESSION_PIN_KEY = 'saro_admin_pin'

function PinGate({ onAuth }) {
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState(null)   // null | string
  const [shake, setShake]       = useState(false)
  const [loading, setLoading]   = useState(false)
  const [blocked, setBlocked]   = useState(false)  // true cuando la IP está bloqueada

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (blocked) return
    setLoading(true)
    try {
      const res  = await fetch('/api/verify-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin }),
      })
      const json = await res.json()

      if (res.status === 429) {
        // IP bloqueada por fuerza bruta
        setBlocked(true)
        setError(json.error ?? 'Demasiados intentos. Esperá unos minutos.')
        setPin('')
        return
      }

      if (json.ok) {
        sessionStorage.setItem(SESSION_KEY, 'ok')
        sessionStorage.setItem(SESSION_PIN_KEY, pin)
        onAuth()
      } else {
        const left = json.attemptsLeft ?? null
        setError(left !== null && left > 0
          ? `Código incorrecto. Te quedan ${left} intento${left === 1 ? '' : 's'}.`
          : 'Código incorrecto. Intentá de nuevo.')
        setShake(true)
        setPin('')
        setTimeout(() => setShake(false), 500)
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-saro-dark flex items-center justify-center px-4">
      <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center ${shake ? 'animate-bounce' : ''}`}>
        <img
          src="/assets/logo.png"
          alt="SARO"
          className="h-20 w-auto mx-auto mb-6"
          onError={e => { e.target.style.display = 'none' }}
        />
        <h1 className="font-extrabold text-xl text-saro-dark mb-1">Panel Admin</h1>
        <p className="text-sm text-gray-400 mb-6">Ingresá el código de acceso</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            placeholder="••••••••"
            autoFocus
            className={`w-full border-2 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono focus:outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-saro-blue'
            }`}
          />
          {error && (
            <p className="text-sm text-red-500 font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || blocked}
            className="w-full py-3 bg-saro-blue hover:bg-saro-dark text-white font-bold rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Verificando…' : blocked ? 'Bloqueado temporalmente' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed]             = useState(() => sessionStorage.getItem(SESSION_KEY) === 'ok')
  const [tab, setTab]                   = useState(() => sessionStorage.getItem('saro_admin_tab') ?? 'editar')
  const [products, setProducts]         = useState([])
  const [publishedSnap, setPublishedSnap] = useState(null) // snapshot de lo que está publicado
  const [editingProduct, setEditing]    = useState(null)
  const [toast, setToast]               = useState(null)
  const [saving, setSaving]             = useState(false)
  const [deploying, setDeploying]       = useState(false)
  const [exporting, setExporting]       = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [showQr, setShowQr]             = useState(false)
  // isDev = true solo cuando corre en localhost (desarrollo local)
  const isDev = window.location.hostname === 'localhost'

  const changeTab = (t) => { sessionStorage.setItem('saro_admin_tab', t); setTab(t) }

  // Sincronizado = el estado actual coincide con lo que está publicado
  const isSynced = publishedSnap !== null &&
    JSON.stringify(products) === JSON.stringify(publishedSnap)

  useEffect(() => {
    fetch('/api/catalog')
      .then(r => r.json())
      .then(data => {
        setProducts(data)
        setPublishedSnap(data) // guardamos snapshot de lo publicado
      })
      .catch(() => showToast('No se pudo cargar el catálogo.', 'error'))
  }, [])

  const showToast = (msg, type = 'ok', duration = 3500) => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }

  const persistProducts = async (newList) => {
    setSaving(true)
    try {
      if (isDev) {
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newList),
        })
        showToast('✅ Guardado localmente — usá "Publicar en sitio" para subir los cambios')
      }
      // Solo actualiza el estado local; el deploy es manual con el botón
      setProducts(newList)
    } catch (e) {
      showToast('❌ Error al guardar: ' + (e?.message ?? 'desconocido'), 'error', 6000)
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async (product) => {
    const withDate = { ...product, fechaPublicacion: new Date().toISOString() }
    await persistProducts([...products, withDate])
    changeTab('editar')
  }

  const handleUpdate = async (updated) => {
    const withDate = { ...updated, fechaActualizacion: new Date().toISOString() }
    await persistProducts(products.map(p => p.id === updated.id ? withDate : p))
    setEditing(null)
    changeTab('editar')
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto del catálogo?')) return
    await persistProducts(products.filter(p => p.id !== id))
    showToast('🗑️ Producto eliminado')
  }

  const handleEdit = (product) => {
    setEditing(product)
    changeTab('nuevo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditing(null)
    changeTab('editar')
  }

  const handleToggleVisible = async (id) => {
    const newList = products.map(p =>
      p.id === id ? { ...p, visible: p.visible === false ? true : false } : p
    )
    await persistProducts(newList)
  }

  const handleToggleSinStock = async (id) => {
    const newList = products.map(p =>
      p.id === id ? { ...p, sinStock: !p.sinStock } : p
    )
    await persistProducts(newList)
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      // Llama al serverless /api/publish (tanto en dev como en prod)
      // En dev: vite.config.js intercepta y guarda localmente
      // En prod: Vercel serverless function usa GITHUB_TOKEN server-side → no hay error ISO-8859-1
      const res  = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, pin: sessionStorage.getItem(SESSION_PIN_KEY) ?? '' }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error desconocido')

      if (isDev) {
        // En local también disparamos el deploy a Vercel
        const deployRes  = await fetch('/api/deploy', { method: 'POST' })
        const deployJson = await deployRes.json()
        if (!deployJson.ok) throw new Error(deployJson.error ?? 'Error al deployar')
      }

      setPublishedSnap([...products]) // marca como sincronizado
      showToast('🚀 ¡Publicado! El sitio se actualiza en ~40s', 'ok', 6000)
    } catch (e) {
      showToast('❌ Error al publicar: ' + (e?.message ?? 'desconocido'), 'error', 6000)
    } finally {
      setDeploying(false)
    }
  }

  const handleExportPdf = async () => {
    setExporting(true)
    setExportProgress('Preparando...')
    try {
      await exportCatalogPdf(products, (current, total) => {
        setExportProgress(`${current}/${total} productos`)
      })
      showToast('PDF exportado correctamente')
    } catch (e) {
      showToast('Error al exportar PDF: ' + (e?.message ?? ''), 'error')
    } finally {
      setExporting(false)
      setExportProgress('')
    }
  }

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-saro-dark text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">

          {/* Fila: logo | acciones */}
          <div className="flex items-center justify-between gap-2 sm:gap-3">

            {/* Izquierda: logo + título + indicador sync */}
            <div className="flex items-center gap-2 min-w-0">
              <img
                src="/assets/logo.png"
                alt="SARO"
                className="h-7 sm:h-9 w-auto brightness-0 invert flex-shrink-0"
                onError={e => { e.target.style.display = 'none' }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-sm sm:text-lg leading-none">Panel Admin</p>
                  {publishedSnap !== null && (
                    <span className={`flex items-center gap-1 text-[10px] sm:text-xs font-semibold ${isSynced ? 'text-green-400' : 'text-yellow-400'}`}>
                      <span className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full flex-shrink-0 ${isSynced ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                      <span className="hidden sm:inline">{isSynced ? 'En vivo' : 'Sin publicar'}</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-white/60 mt-0.5 hidden sm:block">SARO Mayorista</p>
              </div>
            </div>

            {/* Derecha: publicar + PDF + ver tienda */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

              {/* Botón publicar */}
              <button
                onClick={handleDeploy}
                disabled={deploying || isSynced}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-white text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all ${
                  deploying
                    ? 'bg-gray-500 opacity-60 cursor-not-allowed'
                    : isSynced
                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-400 shadow-lg shadow-green-900/30'
                }`}
              >
                <span className="text-xs sm:text-base">{deploying ? '⏳' : '🚀'}</span>
                <span className="hidden sm:inline">{deploying ? 'Publicando…' : 'Publicar en sitio'}</span>
                <span className="sm:hidden">{deploying ? '…' : 'Publicar'}</span>
              </button>

              {/* Exportar PDF */}
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all ${
                  exporting
                    ? 'bg-gray-500 opacity-60 cursor-not-allowed text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Exportar catalogo de productos visibles a PDF"
              >
                <span className="text-xs sm:text-base">{exporting ? '⏳' : '📄'}</span>
                <span className="hidden sm:inline">{exporting ? exportProgress : 'Exportar PDF'}</span>
                <span className="sm:hidden">{exporting ? '…' : 'PDF'}</span>
              </button>

              {/* QR catálogo */}
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
                title="QR del catálogo PDF"
              >
                <span className="text-xs sm:text-base">📱</span>
                <span className="hidden sm:inline">QR</span>
              </button>

              {/* Ver tienda */}
              <a
                href="/"
                className="text-[11px] sm:text-sm text-white/60 hover:text-white flex items-center gap-0.5 transition-colors whitespace-nowrap"
              >
                ←<span className="hidden sm:inline"> Ver</span> tienda
              </a>
            </div>
          </div>

        </div>
      </header>


      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
          {[
            { key: 'editar', label: `📋 Publicados (${products.length})` },
            { key: 'nuevo',  label: editingProduct ? '✏️ Editando producto' : '＋ Nuevo producto' },
            { key: 'etiquetas', label: '🏷️ Etiquetas' },
            { key: 'demanda', label: '📊 Demanda' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { changeTab(t.key); if (t.key === 'editar') setEditing(null) }}
              className={`px-4 sm:px-5 py-3.5 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                tab === t.key
                  ? 'border-saro-blue text-saro-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 sm:py-8">
        {tab === 'nuevo' ? (
          <ProductForm
            key={editingProduct?.id ?? '__new__'}
            initial={editingProduct}
            onSave={editingProduct ? handleUpdate : handleAdd}
            onCancel={editingProduct ? handleCancelEdit : null}
            saving={saving}
          />
        ) : tab === 'etiquetas' ? (
          <LabelCompiler />
        ) : tab === 'demanda' ? (
          <DemandDashboard />
        ) : (
          <ProductList
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleVisible={handleToggleVisible}
            onToggleSinStock={handleToggleSinStock}
            saving={saving}
          />
        )}
      </div>

      {/* Modal QR */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowQr(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-extrabold text-lg text-gray-900 mb-1">QR del Catálogo</h3>
            <p className="text-sm text-gray-400 mb-4">Escaneá para descargar el PDF actualizado</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent('https://saro.com.ar/catalogo')}&color=2d3748&bgcolor=ffffff`}
              alt="QR Catálogo SARO"
              className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-xl"
            />
            <p className="text-xs text-gray-400 mt-3">saro.com.ar/catalogo</p>
            <p className="text-[10px] text-gray-300 mt-1">Se actualiza cada vez que exportás el PDF</p>
            <button
              onClick={() => setShowQr(false)}
              className="mt-4 px-6 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Link discreto a Vercel Analytics */}
      <a
        href="https://vercel.com/santifabiani03-9326s-projects/saro-mayorista/analytics"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-3 right-4 text-[10px] text-gray-300 hover:text-gray-500 transition-colors hidden sm:inline"
        title="Vercel Analytics"
      >
        analytics ↗
      </a>
    </div>
  )
}
