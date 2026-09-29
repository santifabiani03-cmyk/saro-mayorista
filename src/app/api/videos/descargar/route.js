import { NextResponse } from 'next/server'
import { REQUEST_ID_VALIDO } from '../../../../videos/catalogo'
import { MENSAJE_PERMISOS, buscarMp4, faltaConfig, pinValido } from '../../../../utils/videosGithub'

/**
 * Link de descarga del MP4 de un render. El archivo no pasa por Vercel (sus
 * funciones responden hasta 4,5 MB y un video pesa 5-25 MB): se entrega el link
 * directo del release de GitHub, que baja el archivo como descarga.
 * GET /api/videos/descargar?request_id=… con el PIN en el encabezado x-admin-pin.
 */
export async function GET(request) {
  if (!pinValido(request.headers.get('x-admin-pin'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (faltaConfig()) return NextResponse.json({ error: 'Faltan variables de entorno del servidor' }, { status: 500 })
  const requestId = new URL(request.url).searchParams.get('request_id') ?? ''
  if (!REQUEST_ID_VALIDO.test(requestId)) return NextResponse.json({ error: 'request_id inválido' }, { status: 400 })

  try {
    const mp4 = await buscarMp4(requestId)
    if (!mp4) {
      return NextResponse.json(
        { error: 'Ese video no está: todavía no terminó, o ya se borró (se guardan los últimos 30).' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, url: mp4.browser_download_url, nombre: mp4.name, bytes: mp4.size })
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      return NextResponse.json({ error: MENSAJE_PERMISOS, codigo: 'permisos' }, { status: 403 })
    }
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 502 })
  }
}
