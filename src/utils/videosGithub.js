/**
 * Render de videos en GitHub Actions (sólo servidor: lo usan las rutas
 * /api/videos/*). Ver CLAUDE.md §8.
 *
 * - El render lo hace el workflow .github/workflows/render-video.yml.
 * - Cada MP4 queda como archivo del release "videos-admin" (no en master: un
 *   commit a master dispara un deploy a producción).
 */

const API = 'https://api.github.com'
export const WORKFLOW = 'render-video.yml'
export const RELEASE_TAG = 'videos-admin'
const RAMA = 'master'

const clean = v => (v ?? '').replace(/^﻿/, '').trim()

/** true si el PIN coincide con ADMIN_PIN. */
export function pinValido(pin) {
  const correcto = clean(process.env.ADMIN_PIN)
  return !!correcto && pin === correcto
}

// Para disparar el workflow el token necesita el permiso "Actions: Read and
// write". Si no querés agrandar el GITHUB_TOKEN de siempre, se puede cargar
// uno aparte en GITHUB_VIDEOS_TOKEN.
function config() {
  return {
    token: clean(process.env.GITHUB_VIDEOS_TOKEN) || clean(process.env.GITHUB_TOKEN),
    owner: clean(process.env.GITHUB_OWNER),
    repo: clean(process.env.GITHUB_REPO),
  }
}

export const faltaConfig = () => {
  const { token, owner, repo } = config()
  return !token || !owner || !repo
}

export const MENSAJE_PERMISOS =
  'El token de GitHub no tiene permiso para generar videos. Hay que darle "Actions: Read and write" ' +
  '(GitHub → Settings → Developer settings → Fine-grained tokens → el token del sitio → Repository permissions), ' +
  'o cargar un token nuevo con ese permiso en la variable GITHUB_VIDEOS_TOKEN de Vercel.'

/** fetch a la API de GitHub dentro del repo: gh('/actions/runs') */
export function gh(ruta, opciones = {}) {
  const { token, owner, repo } = config()
  return fetch(`${API}/repos/${owner}/${repo}${ruta}`, {
    ...opciones,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'saro-admin',
    },
  })
}

export function dispararRender(plantilla, props, requestId) {
  return gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    body: JSON.stringify({ ref: RAMA, inputs: { plantilla, props, request_id: requestId } }),
  })
}

/** La ejecución del workflow de ese pedido (su nombre lleva el request_id), o null. */
export async function buscarEjecucion(requestId) {
  const res = await gh(`/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=30`)
  if (!res.ok) throw Object.assign(new Error(`GitHub respondió ${res.status}`), { status: res.status })
  const { workflow_runs: runs = [] } = await res.json()
  return runs.find(r => (r.display_title ?? r.name ?? '').includes(requestId)) ?? null
}

/** Nombre del paso que está corriendo (ej. "Renderizar video"), o null. */
export async function pasoActual(runId) {
  const res = await gh(`/actions/runs/${runId}/jobs`)
  if (!res.ok) return null
  const { jobs = [] } = await res.json()
  return jobs.flatMap(j => j.steps ?? []).find(s => s.status === 'in_progress')?.name ?? null
}

/**
 * Los MP4 de ese pedido en el release, en orden ([] si no están todavía, o ya
 * se borraron). Un video suelto es "<request_id>.mp4"; un lote de fichas,
 * "<request_id>-1.mp4", "<request_id>-2.mp4"…
 */
export async function buscarMp4s(requestId) {
  const res = await gh(`/releases/tags/${RELEASE_TAG}`)
  if (res.status === 404) return []
  if (!res.ok) throw Object.assign(new Error(`GitHub respondió ${res.status}`), { status: res.status })
  const { assets = [] } = await res.json()
  const resto = a => a.name.slice(requestId.length) // "" + ".mp4", o "-2.mp4"
  const numero = a => (resto(a) === '.mp4' ? 0 : Number(resto(a).slice(1, -4)))
  return assets
    .filter(a => a.name.startsWith(requestId) && /^(-\d+)?\.mp4$/.test(resto(a)))
    .sort((a, b) => numero(a) - numero(b))
}

/** "coleccion-20260928-1942-k3x9" (fecha y hora de Argentina). */
export function nuevoRequestId(slug) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map(p => [p.type, p.value]),
  )
  const azar = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
  return `${slug}-${partes.year}${partes.month}${partes.day}-${partes.hour}${partes.minute}-${azar}`
}
