import { NextResponse } from 'next/server'
import { REQUEST_ID_VALIDO, plantillaMeta, problemaDelPedido } from '../../../../videos/catalogo'
import { buscarMp4s, faltaConfig, pinValido } from '../../../../utils/videosGithub'
import { faltaClave, revisarVideo } from '../../../../utils/videosGemini'

// Bajar el MP4 del release, subirlo a Gemini y esperar la revisión lleva su tiempo
export const maxDuration = 180

const MAX_BYTES = 45 * 1024 * 1024

/**
 * Gemini mira un MP4 ya generado y lo revisa contra los datos del pedido.
 * POST { pin, plantilla, request_id, n?, props } (props = las de ESE video).
 * El MP4 viaja de GitHub a Gemini por el servidor: nunca pasa por el navegador.
 */
export async function POST(request) {
  const { pin, plantilla, request_id: requestId, n = 1, props } = await request.json().catch(() => ({}))
  if (!pinValido(pin)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (faltaClave()) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, { status: 500 })
  if (faltaConfig()) return NextResponse.json({ error: 'Faltan variables de entorno del servidor' }, { status: 500 })
  if (!REQUEST_ID_VALIDO.test(requestId ?? '')) return NextResponse.json({ error: 'request_id inválido' }, { status: 400 })
  if (!Number.isInteger(n) || n < 1 || n > 20) return NextResponse.json({ error: 'n inválido' }, { status: 400 })
  const meta = plantillaMeta(plantilla)
  const problema = problemaDelPedido(meta, props)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })

  try {
    const mp4 = (await buscarMp4s(requestId))[n - 1]
    if (!mp4) return NextResponse.json({ error: 'Ese video no está (todavía no terminó, o ya se borró).' }, { status: 404 })
    if (mp4.size > MAX_BYTES) return NextResponse.json({ error: 'El video es demasiado grande para revisarlo.' }, { status: 413 })
    const res = await fetch(mp4.browser_download_url)
    if (!res.ok) return NextResponse.json({ error: `No se pudo bajar el video (${res.status})` }, { status: 502 })
    const buffer = Buffer.from(await res.arrayBuffer())
    return NextResponse.json({ ok: true, ...(await revisarVideo(buffer, mp4.name, meta.id, props)) })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'No se pudo revisar el video' }, { status: 502 })
  }
}
