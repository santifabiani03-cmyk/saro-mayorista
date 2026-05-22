/**
 * Vercel serverless — POST /api/track-order
 * Registra un pedido para análisis de demanda.
 * Almacena en catalog/orders.json vía GitHub API.
 */

const GITHUB_API = 'https://api.github.com'

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent':   'saro-admin',
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'Faltan variables de entorno' })
  }

  const { items, total, totalItems } = req.body ?? {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No hay items en el pedido' })
  }

  const order = {
    id:         `o${Date.now()}`,
    fecha:      new Date().toISOString(),
    items:      items.map(i => ({
      productId: i.productId,
      nombre:    i.nombre,
      precio:    i.precio,
      color:     i.color,
      talle:     i.talle,
      cantidad:  i.cantidad,
    })),
    total:      total ?? 0,
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

    const json   = JSON.stringify(orders, null, 2)
    const base64 = Buffer.from(json, 'utf-8').toString('base64')
    await putFile(owner, repo, ORDERS_PATH, base64, `pedido ${order.id}`, token, file?.sha)

    return res.status(200).json({ ok: true, orderId: order.id })
  } catch (e) {
    return res.status(500).json({ error: e.message ?? 'Error al registrar pedido' })
  }
}
