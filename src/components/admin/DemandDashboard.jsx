'use client'
import { useState, useEffect } from 'react'

const SESSION_PIN_KEY = 'saro_admin_pin'

function Bar({ label, value, max, color = 'bg-saro-blue' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 truncate text-right">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-10 text-right">{value}</span>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-extrabold text-saro-blue mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}

export default function DemandDashboard() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [period, setPeriod]     = useState('all') // 'all', '30', '7'

  useEffect(() => {
    const pin = sessionStorage.getItem(SESSION_PIN_KEY) ?? ''
    fetch(`/api/orders?pin=${encodeURIComponent(pin)}`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">
        <span className="text-4xl animate-pulse">📊</span>
        <p className="mt-2">Cargando datos…</p>
      </div>
    )
  }

  // Filtrar por período
  const now = Date.now()
  const filtered = orders.filter(o => {
    if (period === 'all') return true
    const days = parseInt(period)
    return (now - new Date(o.fecha).getTime()) < days * 86400000
  })

  // Calcular estadísticas
  const totalPedidos  = filtered.length
  const totalUnidades = filtered.reduce((s, o) => s + (o.totalItems ?? 0), 0)
  const totalRevenue  = filtered.reduce((s, o) => s + (o.total ?? 0), 0)
  const ticketPromedio = totalPedidos > 0 ? Math.round(totalRevenue / totalPedidos) : 0
  const unidadesPromedio = totalPedidos > 0 ? Math.round(totalUnidades / totalPedidos) : 0

  // Ranking de productos
  const productCount = {}
  const colorCount   = {}
  const talleCount   = {}
  const comboCount   = {} // color + talle
  const dayOfWeekCount = [0, 0, 0, 0, 0, 0, 0] // Dom, Lun, ..., Sáb
  const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  filtered.forEach(o => {
    // Día de la semana
    const dow = new Date(o.fecha).getDay()
    dayOfWeekCount[dow]++

    o.items?.forEach(i => {
      const key = i.nombre ?? i.productId
      productCount[key] = (productCount[key] ?? 0) + i.cantidad
      colorCount[i.color] = (colorCount[i.color] ?? 0) + i.cantidad
      talleCount[i.talle] = (talleCount[i.talle] ?? 0) + i.cantidad
      // Combinación color + talle
      const combo = `${i.color} / ${i.talle}`
      comboCount[combo] = (comboCount[combo] ?? 0) + i.cantidad
    })
  })

  // Top combinaciones color+talle
  const sortedCombos = Object.entries(comboCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxCombo = sortedCombos[0]?.[1] ?? 0

  // Día más activo
  const maxDayCount = Math.max(...dayOfWeekCount)
  const bestDayIdx = dayOfWeekCount.indexOf(maxDayCount)

  const sortedProducts = Object.entries(productCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const sortedColors   = Object.entries(colorCount).sort((a, b) => b[1] - a[1]).slice(0, 10)
  const sortedTalles   = Object.entries(talleCount).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const maxProd  = sortedProducts[0]?.[1] ?? 0
  const maxColor = sortedColors[0]?.[1] ?? 0
  const maxTalle = sortedTalles[0]?.[1] ?? 0

  // Pedidos por día (últimos 30 días)
  const dailyOrders = {}
  const thirtyDaysAgo = now - 30 * 86400000
  filtered
    .filter(o => new Date(o.fecha).getTime() > thirtyDaysAgo)
    .forEach(o => {
      const day = new Date(o.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      dailyOrders[day] = (dailyOrders[day] ?? 0) + 1
    })
  const dailySorted = Object.entries(dailyOrders).slice(-15)
  const maxDaily = Math.max(...dailySorted.map(d => d[1]), 1)

  if (totalPedidos === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <span className="text-5xl">📭</span>
        <p className="mt-3 font-medium">Aún no hay pedidos registrados</p>
        <p className="text-sm mt-1">Los pedidos se registran automáticamente cuando un cliente envía por WhatsApp</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-bold text-gray-900">📊 Análisis de demanda</h2>
        <div className="flex gap-2">
          {[
            { val: '7',   label: '7 días' },
            { val: '30',  label: '30 días' },
            { val: 'all', label: 'Todo' },
          ].map(p => (
            <button
              key={p.val}
              onClick={() => setPeriod(p.val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                period === p.val
                  ? 'bg-saro-blue border-saro-blue text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-saro-blue'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats generales */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <StatCard icon="📦" label="Pedidos" value={totalPedidos} />
        <StatCard icon="🏷️" label="Unidades" value={totalUnidades.toLocaleString('es-AR')} />
        <StatCard icon="💰" label="Valor total" value={`$${totalRevenue.toLocaleString('es-AR')}`} />
        <StatCard icon="🎟️" label="Ticket promedio" value={`$${ticketPromedio.toLocaleString('es-AR')}`} />
        <StatCard icon="📊" label="Unid./pedido" value={unidadesPromedio} />
      </div>

      {/* Pedidos por día */}
      {dailySorted.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Pedidos por día (últimos 30 días)</h3>
          <div className="flex items-end gap-1.5 h-28">
            {dailySorted.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-saro-blue">{count}</span>
                <div className="w-full bg-gray-100 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                  <div
                    className="w-full bg-saro-blue rounded-t-md transition-all duration-500"
                    style={{ height: `${(count / maxDaily) * 100}%`, marginTop: 'auto', position: 'relative', top: `${100 - (count / maxDaily) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-gray-400 -rotate-45 origin-center whitespace-nowrap">{day}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top productos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">🏆 Top productos</h3>
          <div className="space-y-2.5">
            {sortedProducts.map(([name, count]) => (
              <Bar key={name} label={name} value={count} max={maxProd} color="bg-saro-blue" />
            ))}
          </div>
        </div>

        {/* Top colores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">🎨 Top colores</h3>
          <div className="space-y-2.5">
            {sortedColors.map(([name, count]) => (
              <Bar key={name} label={name} value={count} max={maxColor} color="bg-emerald-500" />
            ))}
          </div>
        </div>

        {/* Top talles */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">📏 Top talles</h3>
          <div className="space-y-2.5">
            {sortedTalles.map(([name, count]) => (
              <Bar key={name} label={name} value={count} max={maxTalle} color="bg-amber-500" />
            ))}
          </div>
        </div>
      </div>

      {/* Combinaciones más pedidas + Día de la semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top combinaciones color + talle */}
        {sortedCombos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">🔗 Top combinaciones (color + talle)</h3>
            <div className="space-y-2.5">
              {sortedCombos.map(([name, count]) => (
                <Bar key={name} label={name} value={count} max={maxCombo} color="bg-violet-500" />
              ))}
            </div>
          </div>
        )}

        {/* Pedidos por día de la semana */}
        {totalPedidos > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 text-sm mb-4">📅 Pedidos por día de la semana</h3>
            <div className="flex items-end gap-2 h-36">
              {DAY_NAMES.map((name, idx) => {
                const count = dayOfWeekCount[idx]
                const pct = maxDayCount > 0 ? (count / maxDayCount) * 100 : 0
                const isBest = idx === bestDayIdx && count > 0
                return (
                  <div key={name} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-bold ${isBest ? 'text-saro-blue' : 'text-gray-400'}`}>
                      {count || ''}
                    </span>
                    <div className="w-full bg-gray-100 rounded-t-md overflow-hidden" style={{ height: '80px' }}>
                      <div
                        className={`w-full rounded-t-md transition-all duration-500 ${isBest ? 'bg-saro-blue' : 'bg-gray-300'}`}
                        style={{ height: `${pct}%`, position: 'relative', top: `${100 - pct}%` }}
                      />
                    </div>
                    <span className={`text-[10px] ${isBest ? 'font-bold text-saro-blue' : 'text-gray-400'}`}>
                      {name.slice(0, 3)}
                    </span>
                  </div>
                )
              })}
            </div>
            {maxDayCount > 0 && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                Día más activo: <span className="font-semibold text-saro-blue">{DAY_NAMES[bestDayIdx]}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lista de pedidos recientes */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 text-sm mb-4">📋 Últimos pedidos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Productos</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Unidades</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(-20).reverse().map(o => (
                <tr key={o.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                    {new Date(o.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    <span className="text-gray-400 ml-1 text-xs">
                      {new Date(o.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-0.5">
                      {o.items?.map((i, idx) => (
                        <span key={idx} className="text-xs text-gray-600">
                          {i.nombre} · {i.color}/{i.talle} ×{i.cantidad}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{o.totalItems}</td>
                  <td className="px-3 py-2 text-right font-bold text-saro-blue">${o.total?.toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
