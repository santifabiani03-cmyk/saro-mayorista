/**
 * Vercel serverless function — POST /api/publish
 * Recibe { products: [...] } y los guarda en GitHub vía API server-side.
 * El token nunca sale al browser.
 */

const GITHUB_API = 'https://api.github.com'

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

async function getFileSha(owner, repo, filePath, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: headers(token) }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

async function putFile(owner, repo, filePath, base64Content, message, token) {
  const sha = await getFileSha(owner, repo, filePath, token)
  const body = { message, content: base64Content, ...(sha && { sha }) }
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error ${res.status}`)
  }
  return true
}

function toBase64(str) {
  return Buffer.from(str, 'utf-8').toString('base64')
}

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER
  const repo  = process.env.GITHUB_REPO

  if (!token || !owner || !repo) {
    return res.status(500).json({ error: 'Faltan variables de entorno del servidor (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)' })
  }

  const { products } = req.body ?? {}
  if (!Array.isArray(products)) {
    return res.status(400).json({ error: 'Body debe tener { products: [...] }' })
  }

  try {
    const json   = JSON.stringify(products, null, 2)
    const base64 = toBase64(json)
    await putFile(owner, repo, 'public/products.json', base64, 'actualizar catálogo', token)
    return res.status(200).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message ?? 'Error desconocido' })
  }
}
