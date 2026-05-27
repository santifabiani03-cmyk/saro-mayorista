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
    return NextResponse.json(
      { error: 'ADMIN_PIN no configurado en el servidor' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { name, data, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno del servidor' },
      { status: 500 }
    )
  }

  if (!name || !data) {
    return NextResponse.json({ error: 'Faltan name/data' }, { status: 400 })
  }

  const safe = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  const filePath = `public/assets/${safe}`

  try {
    const sha = await getFileSha(owner, repo, filePath, token)
    const putBody = {
      message: `agregar imagen: ${safe}`,
      content: data,
      ...(sha && { sha }),
    }
    const putRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: ghHeaders(token),
        body: JSON.stringify(putBody),
      }
    )
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      throw new Error(err.message ?? `GitHub API error ${putRes.status}`)
    }
    const putJson = await putRes.json()
    const rawUrl = putJson.content?.download_url ?? null
    return NextResponse.json({ ok: true, path: `/assets/${safe}`, rawUrl })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error desconocido' },
      { status: 500 }
    )
  }
}
