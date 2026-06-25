import { NextResponse } from 'next/server'

const GITHUB_API = 'https://api.github.com'

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

export async function POST(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { config, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Config inválida' }, { status: 400 })
  }

  const allowed = ['storeName', 'whatsappNumber', 'minPurchase', 'suggestedMinPurchase', 'currency']
  const sanitized = {}
  for (const key of allowed) {
    if (key in config) sanitized[key] = config[key]
  }

  if (sanitized.whatsappNumber && !/^\d{10,15}$/.test(sanitized.whatsappNumber)) {
    return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 })
  }
  if (sanitized.minPurchase != null && (typeof sanitized.minPurchase !== 'number' || sanitized.minPurchase < 0)) {
    return NextResponse.json({ error: 'Compra mínima inválida' }, { status: 400 })
  }
  if (sanitized.suggestedMinPurchase != null && (typeof sanitized.suggestedMinPurchase !== 'number' || sanitized.suggestedMinPurchase < 0)) {
    return NextResponse.json({ error: 'Compra mínima sugerida inválida' }, { status: 400 })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json({ error: 'Faltan variables de entorno del servidor' }, { status: 500 })
  }

  try {
    const fileRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/public/config.json`,
      { headers: ghHeaders(token) }
    )

    let sha
    let current = {}
    if (fileRes.ok) {
      const file = await fileRes.json()
      sha = file.sha
      try {
        current = JSON.parse(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf-8'))
      } catch { /* use empty */ }
    }

    const merged = { ...current, ...sanitized }
    const json = JSON.stringify(merged, null, 2) + '\n'
    const base64 = Buffer.from(json, 'utf-8').toString('base64')

    const putRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/public/config.json`,
      {
        method: 'PUT',
        headers: ghHeaders(token),
        body: JSON.stringify({
          message: 'actualizar configuración de la tienda',
          content: base64,
          ...(sha && { sha }),
        }),
      }
    )

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      throw new Error(err.message ?? `GitHub API error ${putRes.status}`)
    }

    return NextResponse.json({ ok: true, config: merged })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 500 })
  }
}
