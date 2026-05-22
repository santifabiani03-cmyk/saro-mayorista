/**
 * Vercel serverless — GET /api/orders
 * Sirve los pedidos registrados desde catalog/orders.json.
 * Requiere PIN de admin.
 */
import fs   from 'node:fs'
import path from 'node:path'

const ORDERS_FILE = path.resolve('catalog/orders.json')

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verificar PIN via query param
  const correctPin = clean(process.env.ADMIN_PIN)
  const pin = req.query.pin ?? ''
  if (!correctPin || pin !== correctPin) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return res.status(200).json([])
    }
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).send(data)
  } catch {
    return res.status(200).json([])
  }
}
