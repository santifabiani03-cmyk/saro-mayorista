import { NextResponse } from 'next/server'

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

async function deleteFile(owner, repo, path, token) {
  try {
    const file = await getFile(owner, repo, path, token)
    if (!file?.sha) return
    await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: ghHeaders(token),
        body: JSON.stringify({ message: `eliminar imagen: ${path}`, sha: file.sha }),
      }
    )
  } catch { /* best-effort */ }
}

function findOrphanedImages(oldProducts, newProducts) {
  const newIds = new Set(newProducts.map(p => p.id).filter(Boolean))
  const removed = oldProducts.filter(p => p.id && !newIds.has(p.id))
  const paths = []
  removed.forEach(p => {
    const imgs = p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []
    imgs.forEach(img => {
      if (typeof img === 'string' && img.startsWith('/assets/')) {
        paths.push(`public${img}`)
      }
    })
  })
  return paths
}

export async function POST(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json(
      { error: 'ADMIN_PIN no configurado en el servidor' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { products, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno del servidor (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)' },
      { status: 500 }
    )
  }

  if (!Array.isArray(products)) {
    return NextResponse.json(
      { error: 'Body debe tener { products: [...] }' },
      { status: 400 }
    )
  }

  try {
    const currentFile = await getFile(owner, repo, 'catalog/products.json', token)
    let orphanedPaths = []

    if (currentFile?.content) {
      try {
        const raw = Buffer.from(currentFile.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        const oldProds = JSON.parse(raw)
        orphanedPaths = findOrphanedImages(oldProds, products)
      } catch { /* si no se puede parsear, seguimos */ }
    }

    const json = JSON.stringify(products, null, 2)
    const base64 = Buffer.from(json, 'utf-8').toString('base64')
    await putFile(owner, repo, 'catalog/products.json', base64, 'actualizar catalogo', token, currentFile?.sha)

    if (orphanedPaths.length > 0) {
      await Promise.allSettled(
        orphanedPaths.map(path => deleteFile(owner, repo, path, token))
      )
    }

    return NextResponse.json({ ok: true, deletedImages: orphanedPaths.length })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error desconocido' },
      { status: 500 }
    )
  }
}
