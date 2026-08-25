'use client'
import { useState, useEffect } from 'react'

export default function SettingsPanel({ onToast }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState(null)

  const [minPurchase, setMinPurchase] = useState('')
  const [suggestedMinPurchase, setSuggestedMinPurchase] = useState('')
  const [mostrarCompraMinima, setMostrarCompraMinima] = useState(false)
  const [minNuevo, setMinNuevo] = useState('')
  const [minCliente, setMinCliente] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')

  useEffect(() => {
    fetch('/config.json')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setMinPurchase(data.minPurchase ?? '')
        setSuggestedMinPurchase(data.suggestedMinPurchase ?? data.minPurchase ?? '')
        setMostrarCompraMinima(data.mostrarCompraMinima === true)
        setMinNuevo(data.minPurchaseNuevo ?? data.suggestedMinPurchase ?? 180000)
        setMinCliente(data.minPurchaseCliente ?? data.minPurchase ?? 100000)
        const num = data.whatsappNumber ?? ''
        setPhoneNumber(num.startsWith('54') ? num.slice(2) : num)
      })
      .catch(() => onToast?.('No se pudo cargar la configuración', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    const min = Number(minPurchase)
    const sug = Number(suggestedMinPurchase)
    const phone = phoneNumber.replace(/\D/g, '')

    if (mostrarCompraMinima && (!min || min < 0)) return onToast?.('La compra mínima debe ser un número positivo', 'error')
    if (mostrarCompraMinima && (!sug || sug < 0)) return onToast?.('La compra mínima sugerida debe ser un número positivo', 'error')
    if (!phone || phone.length < 8 || phone.length > 13) return onToast?.('El número de teléfono no es válido', 'error')

    const fullNumber = '54' + phone

    setSaving(true)
    try {
      const res = await fetch('/api/update-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin: sessionStorage.getItem('saro_admin_pin') ?? '',
          config: {
            minPurchase: min || 0,
            suggestedMinPurchase: sug || 0,
            minPurchaseNuevo: Number(minNuevo) || 0,
            minPurchaseCliente: Number(minCliente) || 0,
            whatsappNumber: fullNumber,
            mostrarCompraMinima,
          },
        }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Error desconocido')
      setConfig(json.config)
      onToast?.('✅ Configuración guardada. Se aplicará en el próximo deploy.')
    } catch (e) {
      onToast?.('❌ Error al guardar: ' + (e?.message ?? ''), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        Cargando configuración…
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="font-extrabold text-lg text-gray-900">Ajustes de la tienda</h2>
          <p className="text-sm text-gray-400 mt-0.5">Los cambios se aplican en el próximo deploy</p>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Toggle: mostrar compra mínima (modo mayorista) */}
          <div className="flex items-center justify-between gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Mostrar compra mínima</label>
              <p className="text-xs text-gray-400 mt-0.5">
                Actívalo solo si vendés por mayor. Apagado = tienda minorista (se oculta en toda la página).
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={mostrarCompraMinima}
              onClick={() => setMostrarCompraMinima(v => !v)}
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${mostrarCompraMinima ? 'bg-saro-blue' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${mostrarCompraMinima ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {/* Compras mínimas del catálogo mayorista */}
          <div className={`grid grid-cols-2 gap-3 ${mostrarCompraMinima ? '' : 'opacity-50 pointer-events-none'}`}>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mínimo · primera compra</label>
              <p className="text-xs text-gray-400 mb-2">Cliente mayorista nuevo</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number" min="0" step="1000"
                  aria-label="Compra mínima para cliente mayorista nuevo"
                  value={minNuevo}
                  onChange={e => setMinNuevo(e.target.value)}
                  disabled={!mostrarCompraMinima}
                  className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-medium focus:outline-none focus:border-saro-blue transition-colors"
                  placeholder="180000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mínimo · ya es cliente</label>
              <p className="text-xs text-gray-400 mb-2">Mayorista que ya compró</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number" min="0" step="1000"
                  aria-label="Compra mínima para mayorista que ya compró"
                  value={minCliente}
                  onChange={e => setMinCliente(e.target.value)}
                  disabled={!mostrarCompraMinima}
                  className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-medium focus:outline-none focus:border-saro-blue transition-colors"
                  placeholder="100000"
                />
              </div>
            </div>
          </div>

          {/* Compra mínima */}
          <div className={mostrarCompraMinima ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Compra mínima
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Monto mínimo requerido para enviar un pedido
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                aria-label="Compra mínima"
                value={minPurchase}
                onChange={e => setMinPurchase(e.target.value)}
                disabled={!mostrarCompraMinima}
                className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-saro-blue transition-colors"
                placeholder="150000"
              />
            </div>
          </div>

          {/* Compra mínima sugerida */}
          <div className={mostrarCompraMinima ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Compra mínima sugerida
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Se muestra como referencia en el header de la tienda
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                aria-label="Compra mínima sugerida"
                value={suggestedMinPurchase}
                onChange={e => setSuggestedMinPurchase(e.target.value)}
                disabled={!mostrarCompraMinima}
                className="w-full border-2 border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:border-saro-blue transition-colors"
                placeholder="150000"
              />
            </div>
          </div>

          {/* Teléfono WhatsApp */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Teléfono WhatsApp
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Número al que llegan los pedidos por WhatsApp
            </p>
            <div className="flex items-stretch">
              <span className="flex items-center px-3 bg-gray-100 border-2 border-r-0 border-gray-200 rounded-l-xl text-sm font-bold text-gray-500 select-none">
                +54
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                className="flex-1 border-2 border-gray-200 rounded-r-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-saro-blue transition-colors"
                aria-label="Teléfono de WhatsApp"
                placeholder="9 11 2320 8058"
                maxLength={13}
              />
            </div>
            <p className="text-xs text-gray-300 mt-1.5">
              Número completo: +54{phoneNumber || '…'}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {config?.whatsappNumber && (
              <>Actual: +{config.whatsappNumber}</>
            )}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-saro-blue hover:bg-saro-dark text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
