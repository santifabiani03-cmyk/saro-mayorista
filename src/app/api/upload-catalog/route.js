import { NextResponse } from 'next/server'

const GITHUB_API = 'https://api.github.com'

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

async function getFileSha(owner, repo, filePath, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: ghHeaders(token) }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

export async function POST(request) {
  const clean = val => (val ?? '').replace(/^﻿/, '').trim()
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { data, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json({ error: 'Faltan variables de entorno' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Falta data (base64 del PDF)' }, { status: 400 })
  }

  const filePath = 'public/catalogo.pdf'

  try {
    const sha = await getFileSha(owner, repo, filePath, token)
    const putRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: ghHeaders(token),
        body: JSON.stringify({
          message: `actualizar catálogo PDF — ${new Date().toISOString().slice(0, 10)}`,
          content: data,
          ...(sha && { sha }),
        }),
      }
    )
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      throw new Error(err.message ?? `GitHub API error ${putRes.status}`)
    }
    return NextResponse.json({ ok: true, url: '/catalogo.pdf' })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 500 })
  }
}
