import fs from 'node:fs'
import path from 'node:path'
import { unstable_cache } from 'next/cache'

// Los datos que cambian solos —catálogo, ajustes, pedidos y fotos que sube el
// admin— viven en la rama "datos" del repo, NO en master. Cada push a master
// dispara un deploy a producción (deploy.yml); cuando estos datos estaban ahí,
// cada pedido, cada foto y cada "Publicar en sitio" reconstruía la web entera.
// La rama "datos" no dispara nada: la web la lee en el momento (con caché) y
// cada guardado queda como un commit, así que hay historial para deshacer.
//
// Todo el acceso a esos datos pasa por este archivo. Si algún día se pasan a
// una base de datos, se cambia sólo acá.
//
// Las copias de master (catalog/products.json, public/config.json,
// catalog/orders.json) quedaron congeladas: sólo se usan en desarrollo, cuando
// no hay credenciales de GitHub. En Vercel nunca.

export const RAMA_DATOS = 'datos'

const ARCHIVOS = {
  catalogo: { rama: 'products.json', local: 'catalog/products.json' },
  ajustes:  { rama: 'config.json',   local: 'public/config.json' },
  pedidos:  { rama: 'orders.json',   local: 'catalog/orders.json' },
}

// Etiquetas de caché: después de guardar, revalidateTag(ETIQUETAS.x) hace que
// las páginas vuelvan a leer ese archivo.
export const ETIQUETAS = { catalogo: 'datos-catalogo', ajustes: 'datos-ajustes' }

const API = 'https://api.github.com'

const limpiar = v => (v ?? '').replace(/^﻿/, '').trim()

function credencialesGithub() {
  const token = limpiar(process.env.GITHUB_TOKEN)
  const owner = limpiar(process.env.GITHUB_OWNER)
  const repo  = limpiar(process.env.GITHUB_REPO)
  if (token && owner && repo) return { token, owner, repo }
  // En Vercel faltar las credenciales es un error de configuración: mejor
  // fallar que mostrar la copia vieja de master como si fuera la actual.
  if (process.env.VERCEL) throw new Error('Faltan GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO')
  return null
}

const encabezados = token => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'User-Agent': 'saro-admin',
})

/** GitHub rechazó el guardado porque el archivo cambió desde que se leyó. */
export class ConflictoDatos extends Error {}

/** Lee un JSON de la rama de datos, sin caché. Devuelve { datos, sha }. */
export async function leerArchivo(nombre) {
  const archivo = ARCHIVOS[nombre]
  const gh = credencialesGithub()
  if (!gh) {
    const texto = fs.readFileSync(path.resolve(archivo.local), 'utf-8')
    return { datos: JSON.parse(texto), sha: null }
  }

  const url = `${API}/repos/${gh.owner}/${gh.repo}/contents/${archivo.rama}?ref=${RAMA_DATOS}`
  const res = await fetch(url, { headers: encabezados(gh.token), cache: 'no-store' })
  // Un 404 acá nunca es "vacío": los tres archivos existen desde que se creó la
  // rama. Devolver [] haría que la tienda se muestre sin productos.
  if (!res.ok) throw new Error(`GitHub respondió ${res.status} al leer ${archivo.rama} (rama ${RAMA_DATOS})`)
  const json = await res.json()

  let base64 = json.content
  // Arriba de 1 MB la API no manda el contenido: se pide el blob por su sha.
  if (json.encoding !== 'base64') {
    const blob = await fetch(`${API}/repos/${gh.owner}/${gh.repo}/git/blobs/${json.sha}`,
      { headers: encabezados(gh.token), cache: 'no-store' })
    if (!blob.ok) throw new Error(`GitHub respondió ${blob.status} al leer ${archivo.rama}`)
    base64 = (await blob.json()).content
  }
  const texto = Buffer.from(base64, 'base64').toString('utf-8')
  return { datos: JSON.parse(texto), sha: json.sha }
}

async function subirArchivo(gh, ruta, base64, mensaje, sha) {
  const res = await fetch(`${API}/repos/${gh.owner}/${gh.repo}/contents/${ruta}`, {
    method: 'PUT',
    headers: encabezados(gh.token),
    body: JSON.stringify({ message: mensaje, content: base64, branch: RAMA_DATOS, ...(sha && { sha }) }),
  })
  if (res.ok) return res.json()
  const err = await res.json().catch(() => ({}))
  // 409: el sha que mandamos ya no es el último (alguien guardó en el medio)
  if (res.status === 409) throw new ConflictoDatos(err.message ?? 'El archivo cambió mientras se guardaba')
  throw new Error(err.message ?? `GitHub respondió ${res.status} al guardar ${ruta}`)
}

/**
 * Lee un archivo, le aplica `cambiar(datosActuales)` y lo guarda. Si otro
 * guardado se metió en el medio (un pedido y una publicación al mismo tiempo),
 * vuelve a leer y reintenta, así ninguno pisa al otro. Devuelve lo guardado.
 */
export async function actualizarArchivo(nombre, cambiar, mensaje, intentos = 3) {
  const gh = credencialesGithub()
  if (!gh) throw new Error('Faltan GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO')

  for (let intento = 1; ; intento++) {
    const { datos, sha } = await leerArchivo(nombre)
    const nuevos = await cambiar(datos)
    const base64 = Buffer.from(JSON.stringify(nuevos, null, 2) + '\n', 'utf-8').toString('base64')
    try {
      await subirArchivo(gh, ARCHIVOS[nombre].rama, base64, mensaje, sha)
      return nuevos
    } catch (e) {
      if (!(e instanceof ConflictoDatos) || intento >= intentos) throw e
    }
  }
}

/**
 * Sube una foto (en base64) a fotos/ de la rama de datos y devuelve su URL
 * pública. Los nombres llevan la fecha, así que casi nunca pisan otra foto.
 */
export async function subirFoto(nombre, base64) {
  const gh = credencialesGithub()
  if (!gh) throw new Error('Faltan GITHUB_TOKEN, GITHUB_OWNER o GITHUB_REPO')

  const ruta = `fotos/${nombre}`
  // Si ya existe una foto con ese nombre, GitHub pide su sha para reemplazarla
  const existe = await fetch(`${API}/repos/${gh.owner}/${gh.repo}/contents/${ruta}?ref=${RAMA_DATOS}`,
    { headers: encabezados(gh.token), cache: 'no-store' })
  const sha = existe.ok ? (await existe.json()).sha : undefined

  await subirArchivo(gh, ruta, base64, `foto: ${nombre}`, sha)
  return `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${RAMA_DATOS}/${ruta}`
}

// Lecturas para las páginas: se guardan en la caché de Next hasta que un
// guardado las invalida (revalidateTag). Los 5 minutos son sólo un respaldo
// por si alguien edita la rama a mano en GitHub.
const leerConCache = nombre => unstable_cache(
  async () => (await leerArchivo(nombre)).datos,
  ['datos', nombre],
  { tags: [ETIQUETAS[nombre]], revalidate: 300 },
)

/** El catálogo publicado (lista de productos). */
export const leerCatalogo = leerConCache('catalogo')

/** Los ajustes de la tienda (WhatsApp, compra mínima…). */
export const leerAjustes = leerConCache('ajustes')
