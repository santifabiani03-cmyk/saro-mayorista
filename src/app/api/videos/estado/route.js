import { NextResponse } from 'next/server'
import { REQUEST_ID_VALIDO } from '../../../../videos/catalogo'
import { MENSAJE_PERMISOS, buscarEjecucion, buscarMp4, faltaConfig, pasoActual, pinValido } from '../../../../utils/videosGithub'

// Nombres de los pasos de render-video.yml, en palabras para el admin
const PASOS = {
  'Validar pedido': 'Preparando',
  'Instalar dependencias': 'Preparando (instala lo necesario)',
  'Preparar Chrome': 'Preparando',
  'Renderizar video': 'Renderizando el video',
  'Revisar audio': 'Revisando el audio',
  'Subir MP4': 'Subiendo el MP4',
}

const ERRORES = {
  cancelled: 'Se canceló: tardó más de 30 minutos, o alguien lo canceló en GitHub.',
  timed_out: 'Tardó más de 30 minutos y se cortó.',
}

/**
 * Estado de un render: en_cola | renderizando | listo | error.
 * GET /api/videos/estado?request_id=… con el PIN en el encabezado x-admin-pin.
 */
export async function GET(request) {
  if (!pinValido(request.headers.get('x-admin-pin'))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (faltaConfig()) return NextResponse.json({ error: 'Faltan variables de entorno del servidor' }, { status: 500 })
  const requestId = new URL(request.url).searchParams.get('request_id') ?? ''
  if (!REQUEST_ID_VALIDO.test(requestId)) return NextResponse.json({ error: 'request_id inválido' }, { status: 400 })

  try {
    const run = await buscarEjecucion(requestId)
    // Recién disparado, GitHub tarda unos segundos en listarlo
    if (!run) return NextResponse.json({ ok: true, estado: 'en_cola', encontrado: false, detalle: 'Esperando que GitHub lo tome' })

    const base = { ok: true, encontrado: true, logUrl: run.html_url }
    if (run.status === 'in_progress') {
      const paso = await pasoActual(run.id)
      return NextResponse.json({ ...base, estado: 'renderizando', detalle: PASOS[paso] ?? 'Preparando' })
    }
    if (run.status !== 'completed') {
      return NextResponse.json({ ...base, estado: 'en_cola', detalle: 'En cola: espera a que termine otro video' })
    }
    if (run.conclusion !== 'success') {
      return NextResponse.json({
        ...base,
        estado: 'error',
        mensaje: ERRORES[run.conclusion] ?? 'El render falló. El detalle está en el log.',
      })
    }
    const mp4 = await buscarMp4(requestId)
    if (!mp4) return NextResponse.json({ ...base, estado: 'error', mensaje: 'El render terminó pero no encontré el MP4.' })
    return NextResponse.json({ ...base, estado: 'listo', bytes: mp4.size })
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      return NextResponse.json({ error: MENSAJE_PERMISOS, codigo: 'permisos' }, { status: 403 })
    }
    if (e.status === 404) {
      return NextResponse.json(
        { error: 'No está el workflow de render en la rama master de GitHub (render-video.yml).', codigo: 'sin_workflow' },
        { status: 502 },
      )
    }
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 502 })
  }
}
