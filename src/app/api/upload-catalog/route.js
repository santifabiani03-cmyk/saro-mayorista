import { NextResponse } from 'next/server'

const GITHUB_API = 'https://api.github.com'

// GitHub Pages publica docs/ de master en catalogo.saro.com.ar (docs/CNAME):
// ahí apuntan el QR del admin y /catalogo. Subir el PDF no dispara un deploy
// de la web: deploy.yml ignora los pushes que sólo tocan este archivo.
const RAMA = 'master'
const FILE_PATH = 'docs/catalogo.pdf'

// La huella de lo que muestra el PDF (la calcula el admin) viaja en el mensaje
// del commit, "… [huella:abc123]": así se sabe si el PDF publicado ya está al
// día sin tener que bajarlo.
const HUELLA_VALIDA = /^[0-9a-f]{16}$/
const HUELLA_EN_MENSAJE = /\[huella:([0-9a-f]{16})\]/

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

async function getFileSha(owner, repo, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=${RAMA}`,
    { headers: ghHeaders(token), cache: 'no-store' }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.sha ?? null
}

/** Huella del PDF publicado, sacada del último commit que lo tocó (o null). */
async function huellaPublicada(owner, repo, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/commits?sha=${RAMA}&path=${FILE_PATH}&per_page=1`,
    { headers: ghHeaders(token), cache: 'no-store' }
  )
  if (!res.ok) return null // ante la duda, se sube
  const [ultimo] = await res.json()
  return ultimo?.commit?.message?.match(HUELLA_EN_MENSAJE)?.[1] ?? null
}

export async function POST(request) {
  const clean = val => (val ?? '').replace(/^﻿/, '').trim()
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { data, pin } = body
  const huella = HUELLA_VALIDA.test(body.huella ?? '') ? body.huella : null

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo  = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json({ error: 'Faltan variables de entorno' }, { status: 500 })
  }

  if (!data && !huella) {
    return NextResponse.json({ error: 'Falta data (base64 del PDF)' }, { status: 400 })
  }

  try {
    // Sin `data` es sólo una consulta: ¿hace falta armar y subir el PDF?
    // Con `data` se vuelve a mirar por si otra sesión lo subió en el medio.
    const alDia = huella !== null && (await huellaPublicada(owner, repo, token)) === huella
    if (!data) return NextResponse.json({ ok: true, necesario: !alDia })
    if (alDia) return NextResponse.json({ ok: true, sinCambios: true })

    const sha = await getFileSha(owner, repo, token)
    const fecha = new Date().toISOString().slice(0, 10)
    const putRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: ghHeaders(token),
        body: JSON.stringify({
          message: `actualizar catálogo PDF — ${fecha}${huella ? ` [huella:${huella}]` : ''}`,
          content: data,
          branch: RAMA,
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
