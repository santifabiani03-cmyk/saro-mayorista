/**
 * Vercel serverless function — POST /api/upload-image
 * Recibe { name: "slug.jpg", data: "<base64 puro>" }
 * y sube el archivo a public/assets/ en GitHub.
 * El token nunca sale al browser.
 */

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Verificar PIN ───────────────────────────────────────────────────────────
  const clean = val => (val ?? '').replace(/^﻿/, '').trim()
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return res.status(500).json({ error: 'ADMIN_PIN no configurado en el servidor' })
  }
  const { name, data, pin } = req.body ?? {}
  if (!pin || pin !== correctPin) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  // ───────────────────────────────────────────────────────────────────────────

  // Limpiar posibles caracteres BOM u espacios que se pegan al setear env vars
  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'Faltan variables de entorno del servidor' })
  }
  if (!name || !data) {
    return res.status(400).json({ error: 'Faltan name/data' })
  }


  const safe = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  const filePath = `public/assets/${safe}`

  try {
    const sha  = await getFileSha(owner, repo, filePath, token)
    const body = { message: `agregar imagen: ${safe}`, content: data, ...(sha && { sha }) }
    const putRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`, {
      method:  'PUT',
      headers: ghHeaders(token),
      body:    JSON.stringify(body),
    })
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}))
      throw new Error(err.message ?? `GitHub API error ${putRes.status}`)
    }
    const putJson = await putRes.json()
    // URL directa de GitHub que funciona al instante (sin esperar redeploy de Vercel)
    const rawUrl = putJson.content?.download_url ?? null
    return res.status(200).json({ ok: true, path: `/assets/${safe}`, rawUrl })
  } catch (e) {
    return res.status(500).json({ error: e.message ?? 'Error desconocido' })
  }
}
