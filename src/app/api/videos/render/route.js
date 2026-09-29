import { NextResponse } from 'next/server'
import { plantillaMeta, problemaDelPedido } from '../../../../videos/catalogo'
import { MENSAJE_PERMISOS, dispararRender, faltaConfig, nuevoRequestId, pinValido } from '../../../../utils/videosGithub'

// Límite de las entradas de un workflow_dispatch de GitHub (65.535 caracteres en total)
const MAX_PROPS = 60_000

/** Dispara el render de un video en GitHub Actions. Devuelve el request_id para seguirlo. */
export async function POST(request) {
  if (!process.env.ADMIN_PIN) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado en el servidor' }, { status: 500 })
  }
  const { pin, plantilla, props } = await request.json().catch(() => ({}))
  if (!pinValido(pin)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (faltaConfig()) {
    return NextResponse.json({ error: 'Faltan variables de entorno del servidor (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)' }, { status: 500 })
  }

  const meta = plantillaMeta(plantilla)
  const problema = problemaDelPedido(meta, props)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })
  const json = JSON.stringify(props)
  if (json.length > MAX_PROPS) return NextResponse.json({ error: 'El pedido tiene demasiados datos' }, { status: 400 })

  const requestId = nuevoRequestId(meta.slug)
  try {
    const res = await dispararRender(meta.id, json, requestId)
    if (res.ok) return NextResponse.json({ ok: true, requestId })
    const err = await res.json().catch(() => ({}))
    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ error: MENSAJE_PERMISOS, codigo: 'permisos' }, { status: 403 })
    }
    if (res.status === 404) {
      return NextResponse.json(
        { error: 'No está el workflow de render en la rama master de GitHub (render-video.yml).', codigo: 'sin_workflow' },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: err.message ?? `GitHub respondió ${res.status}` }, { status: 502 })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 500 })
  }
}
