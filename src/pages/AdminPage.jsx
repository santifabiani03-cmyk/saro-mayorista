import { useState, useEffect } from 'react'
import ProductForm from '../components/admin/ProductForm'
import ProductList from '../components/admin/ProductList'
import { saveProductsToGitHub } from '../utils/githubApi'

const CORRECT_PIN = import.meta.env.VITE_ADMIN_PIN ?? 'saro2025'
const SESSION_KEY = 'saro_admin_auth'

function PinGate({ onAuth }) {
  const [pin, setPin]     = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      onAuth()
    } else {
      setError(true)
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-saro-dark flex items-center justify-center px-4">
      <div className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center ${shake ? 'animate-bounce' : ''}`}>
        <img
          src="/assets/logo.png"
          alt="SARO"
          className="h-12 w-auto mx-auto mb-6"
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
            <p className="text-sm text-red-500 font-medium">Código incorrecto. Intentá de nuevo.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 bg-saro-blue hover:bg-saro-dark text-white font-bold rounded-xl transition-colors"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed]             = useState(() => sessionStorage.getItem(SESSION_KEY) === 'ok')
  const [tab, setTab]                   = useState('nuevo')
  const [products, setProducts]         = useState([])
  const [publishedSnap, setPublishedSnap] = useState(null) // snapshot de lo que está publicado
  const [editingProduct, setEditing]    = useState(null)
  const [toast, setToast]               = useState(null)
  const [saving, setSaving]             = useState(false)
  const [deploying, setDeploying]       = useState(false)
  // isDev = true solo cuando corre en localhost (desarrollo local)
  const isDev = window.location.hostname === 'localhost'

  // Sincronizado = el estado actual coincide con lo que está publicado
  const isSynced = publishedSnap !== null &&
    JSON.stringify(products) === JSON.stringify(publishedSnap)

  useEffect(() => {
    fetch('/products.json')
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
    setTab('editar')
  }

  const handleUpdate = async (updated) => {
    const withDate = { ...updated, fechaActualizacion: new Date().toISOString() }
    await persistProducts(products.map(p => p.id === updated.id ? withDate : p))
    setEditing(null)
    setTab('editar')
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto del catálogo?')) return
    await persistProducts(products.filter(p => p.id !== id))
    showToast('🗑️ Producto eliminado')
  }

  const handleEdit = (product) => {
    setEditing(product)
    setTab('nuevo')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditing(null)
    setTab('editar')
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      if (isDev) {
        // En local: deploy vía Vite API (corre vercel --prod)
        const res  = await fetch('/api/deploy', { method: 'POST' })
        const json = await res.json()
        if (!json.ok) throw new Error(json.error ?? 'Error desconocido')
      } else {
        // En producción: guarda en GitHub → GitHub Actions redeploya
        await saveProductsToGitHub(products)
      }
      setPublishedSnap([...products]) // marca como sincronizado
      showToast('🚀 ¡Publicado! El sitio se actualiza en ~40s', 'ok', 6000)
    } catch (e) {
      showToast('❌ Error al publicar: ' + (e?.message ?? 'desconocido'), 'error', 6000)
    } finally {
      setDeploying(false)
    }
  }

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header */}
      <header className="bg-saro-dark text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="SARO"
              className="h-9 w-auto brightness-0 invert"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div>
              <p className="font-extrabold text-lg leading-none">Panel Admin</p>
              <p className="text-xs text-saro-light opacity-80 mt-0.5">SARO Mayorista</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Indicador de sincronización */}
            {publishedSnap !== null && (
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${isSynced ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isSynced ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
                {isSynced ? 'En vivo' : 'Cambios sin publicar'}
              </span>
            )}

            {/* Botón publicar */}
            <button
              onClick={handleDeploy}
              disabled={deploying || isSynced}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl transition-all ${
                deploying
                  ? 'bg-gray-500 opacity-60 cursor-not-allowed'
                  : isSynced
                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-400 shadow-lg shadow-green-900/30'
              }`}
            >
              {deploying ? '⏳ Publicando…' : '🚀 Publicar en sitio'}
            </button>

            <a
              href="/"
              className="text-sm text-saro-light hover:text-white flex items-center gap-1 transition-colors"
            >
              ← Ver tienda
            </a>
          </div>
        </div>
      </header>


      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-5 flex gap-1">
          {[
            { key: 'nuevo', label: editingProduct ? '✏️ Editando producto' : '＋ Nuevo producto' },
            { key: 'editar', label: `📋 Publicados (${products.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key === 'editar') setEditing(null) }}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
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
      <div className="max-w-6xl mx-auto px-5 py-8">
        {tab === 'nuevo' ? (
          <ProductForm
            key={editingProduct?.id ?? '__new__'}
            initial={editingProduct}
            onSave={editingProduct ? handleUpdate : handleAdd}
            onCancel={editingProduct ? handleCancelEdit : null}
            saving={saving}
          />
        ) : (
          <ProductList
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
