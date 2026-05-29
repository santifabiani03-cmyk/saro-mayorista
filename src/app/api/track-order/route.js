import { NextResponse } from 'next/server'

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

const GITHUB_API = 'https://api.github.com'

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

async function getFile(owner, repo, path, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: ghHeaders(token) }
  )
  if (!res.ok) return null
  return res.json()
}

async function putFile(owner, repo, path, base64Content, message, token, sha) {
  const body = { message, content: base64Content, ...(sha && { sha }) }
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error ${res.status}`)
  }
}

export async function POST(request) {
  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno' },
      { status: 500 }
    )
  }

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
    const ORDERS_PATH = 'catalog/orders.json'
    const file = await getFile(owner, repo, ORDERS_PATH, token)

    let orders = []
    if (file?.content) {
      try {
        const raw = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        orders = JSON.parse(raw)
      } catch { /* archivo corrupto, empezar de cero */ }
    }

    orders.push(order)

    const json = JSON.stringify(orders, null, 2)
    const base64 = Buffer.from(json, 'utf-8').toString('base64')
    await putFile(owner, repo, ORDERS_PATH, base64, `pedido ${order.id}`, token, file?.sha)

    return NextResponse.json({ ok: true, orderId: order.id })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error al registrar pedido' },
      { status: 500 }
    )
  }
}
