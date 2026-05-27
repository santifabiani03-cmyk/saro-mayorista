/**
 * Utilidades para leer/escribir archivos en GitHub.
 * Se usa solo en producción — en dev el servidor Vite maneja todo localmente.
 */

const GITHUB_API = 'https://api.github.com'

function headers() {
  return {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent':   'saro-admin',
  }
}

function repoBase() {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER
  const repo  = process.env.NEXT_PUBLIC_GITHUB_REPO
  return `${GITHUB_API}/repos/${owner}/${repo}/contents`
}

/** Obtiene el SHA actual de un archivo en el repo */
async function getFileSha(path) {
  const res = await fetch(`${repoBase()}/${path}`, { headers: headers() })
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

/** Sube o actualiza un archivo en el repo (content debe ser base64) */
async function putFile(path, base64Content, message) {
  const sha = await getFileSha(path)
  const body = { message, content: base64Content, ...(sha && { sha }) }
  const res = await fetch(`${repoBase()}/${path}`, {
    method:  'PUT',
    headers: headers(),
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error ${res.status}`)
  }
  return true
}

/** Guarda products.json en GitHub */
export async function saveProductsToGitHub(products) {
  const json    = JSON.stringify(products, null, 2)
  const base64  = btoa(unescape(encodeURIComponent(json)))
  await putFile('public/products.json', base64, 'actualizar catálogo')
}

/** Sube una imagen a public/assets/ en GitHub. base64Data = string base64 puro (sin prefijo data:) */
export async function uploadImageToGitHub(filename, base64Data) {
  const safe = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-')
  await putFile(`public/assets/${safe}`, base64Data, `agregar imagen: ${safe}`)
  return `/assets/${safe}`
}
