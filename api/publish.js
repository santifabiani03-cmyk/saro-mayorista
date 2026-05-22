/**
 * Vercel serverless function — POST /api/publish
 * 1. Detecta productos eliminados comparando con el products.json actual.
 * 2. Borra de GitHub las imágenes de esos productos (best-effort).
 * 3. Actualiza public/products.json con el nuevo catálogo.
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

/** Obtiene el contenido completo de un archivo del repo */
async function getFile(owner, repo, path, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: ghHeaders(token) }
  )
  if (!res.ok) return null
  return res.json() // { sha, content (base64), ... }
}

/** Sube o actualiza un archivo en el repo */
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

/** Elimina un archivo del repo (best-effort, no lanza si falla) */
async function deleteFile(owner, repo, path, token) {
  try {
    const file = await getFile(owner, repo, path, token)
    if (!file?.sha) return
    await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        method:  'DELETE',
        headers: ghHeaders(token),
        body:    JSON.stringify({ message: `eliminar imagen: ${path}`, sha: file.sha }),
      }
    )
  } catch { /* best-effort */ }
}

/** Devuelve los paths de GitHub de las imágenes que ya no usa ningún producto */
function findOrphanedImages(oldProducts, newProducts) {
  const newIds = new Set(newProducts.map(p => p.id).filter(Boolean))
  const removed = oldProducts.filter(p => p.id && !newIds.has(p.id))

  const paths = []
  removed.forEach(p => {
    const imgs = p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []
    imgs.forEach(img => {
      if (typeof img === 'string' && img.startsWith('/assets/')) {
        paths.push(`public${img}`) // /assets/foo.webp → public/assets/foo.webp
      }
    })
  })
  return paths
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Verificar PIN ───────────────────────────────────────────────────────────
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return res.status(500).json({ error: 'ADMIN_PIN no configurado en el servidor' })
  }
  const { products, pin } = req.body ?? {}
  if (!pin || pin !== correctPin) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  // ───────────────────────────────────────────────────────────────────────────

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return res.status(500).json({
      error: 'Faltan variables de entorno del servidor (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)',
    })
  }

  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Body debe tener { products: [...] }' })
  }

  try {
    // 1. Leer products.json actual para detectar productos eliminados
    const currentFile = await getFile(owner, repo, 'public/products.json', token)
    let orphanedPaths = []

    if (currentFile?.content) {
      try {
        const raw     = Buffer.from(currentFile.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        const oldProds = JSON.parse(raw)
        orphanedPaths  = findOrphanedImages(oldProds, products)
      } catch { /* si no se puede parsear, seguimos igual */ }
    }

    // 2. Actualizar products.json
    const json   = JSON.stringify(products, null, 2)
    const base64 = Buffer.from(json, 'utf-8').toString('base64')
    await putFile(owner, repo, 'public/products.json', base64, 'actualizar catálogo', token, currentFile?.sha)

    // 3. Borrar imágenes huérfanas (best-effort, en paralelo)
    if (orphanedPaths.length > 0) {
      await Promise.allSettled(
        orphanedPaths.map(path => deleteFile(owner, repo, path, token))
      )
    }

    return res.status(200).json({ ok: true, deletedImages: orphanedPaths.length })
  } catch (e) {
    return res.status(500).json({ error: e.message ?? 'Error desconocido' })
  }
}
