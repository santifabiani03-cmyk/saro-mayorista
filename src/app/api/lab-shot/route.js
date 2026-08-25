// Endpoint SOLO de desarrollo: recibe un cuadro renderizado de la maqueta 3D y
// lo guarda en disco para poder inspeccionarlo. En producción no existe.
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export async function POST(req) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }
  const { dataUrl, nombre } = await req.json()
  const base64 = String(dataUrl).split(',')[1] || ''
  const dir = join(process.cwd(), '.lab-shots')
  mkdirSync(dir, { recursive: true })
  const archivo = join(dir, `${(nombre || 'shot').replace(/[^a-z0-9_-]/gi, '')}.webp`)
  writeFileSync(archivo, Buffer.from(base64, 'base64'))
  return Response.json({ ok: true, archivo, kb: Math.round(base64.length / 1365) })
}
