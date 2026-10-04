import { NextResponse } from 'next/server'
import { plantillaMeta, problemaDelPedido } from '../../../../videos/catalogo'
import { pinValido } from '../../../../utils/videosGithub'
import { faltaClave, sugerirTextos } from '../../../../utils/videosGemini'

export const maxDuration = 60

/**
 * Gemini propone textos para el video (etiqueta, gancho, cierre) y para la
 * publicación, con los datos reales de los productos elegidos.
 * POST { pin, plantilla, props }
 */
export async function POST(request) {
  const { pin, plantilla, props } = await request.json().catch(() => ({}))
  if (!pinValido(pin)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (faltaClave()) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, { status: 500 })
  const meta = plantillaMeta(plantilla)
  const problema = problemaDelPedido(meta, props)
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })
  if (!meta.textos.length) return NextResponse.json({ error: 'Esta plantilla no tiene textos para sugerir' }, { status: 400 })
  try {
    return NextResponse.json({ ok: true, ...(await sugerirTextos(meta.id, props.productos)) })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'No se pudo consultar a Gemini' }, { status: 502 })
  }
}
