import { NextResponse } from 'next/server'
import { actualizarArchivo } from '../../../utils/datos'

// ── Rate limiting por IP para pedidos ──
const ORDER_MAX      = 10          // máx pedidos por ventana
const ORDER_WINDOW   = 30 * 60000  // ventana de 30 min
const orderAttempts  = new Map()

function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

function checkOrderLimit(ip) {
  const now = Date.now()
  const record = orderAttempts.get(ip)
  if (!record || now - record.start > ORDER_WINDOW) {
    orderAttempts.set(ip, { count: 1, start: now })
    return true
  }
  if (record.count >= ORDER_MAX) return false
  record.count++
  return true
}

export async function POST(request) {
  // Rate limit: máx 10 pedidos cada 30 min por IP
  const ip = getClientIp(request)
  if (!checkOrderLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiados pedidos. Intentá de nuevo en unos minutos.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { items, total, totalItems } = body

  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return NextResponse.json(
      { error: 'No hay items en el pedido' },
      { status: 400 }
    )
  }

  // Validar que cada item tenga campos mínimos requeridos
  const valid = items.every(i =>
    i.productId && typeof i.nombre === 'string' && i.nombre.trim() &&
    typeof i.cantidad === 'number' && i.cantidad > 0 && i.cantidad <= 9999
  )
  if (!valid) {
    return NextResponse.json(
      { error: 'Datos de pedido inválidos' },
      { status: 400 }
    )
  }

  const order = {
    id: `o${Date.now()}`,
    fecha: new Date().toISOString(),
    items: items.map(i => ({
      productId: i.productId,
      nombre: i.nombre,
      precio: i.precio,
      color: i.color,
      talle: i.talle,
      cantidad: i.cantidad,
    })),
    total: total ?? 0,
    totalItems: totalItems ?? 0,
  }

  try {
    // Se agrega a orders.json de la rama "datos" (no dispara deploy). Si entran
    // dos pedidos a la vez, actualizarArchivo reintenta y no se pierde ninguno.
    await actualizarArchivo('pedidos', orders => [
      ...(Array.isArray(orders) ? orders : []),
      order,
    ], `pedido ${order.id}`)

    return NextResponse.json({ ok: true, orderId: order.id })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error al registrar pedido' },
      { status: 500 }
    )
  }
}
