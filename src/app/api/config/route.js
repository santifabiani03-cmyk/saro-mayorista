import { NextResponse } from 'next/server'
import { leerAjustes } from '../../../utils/datos'

// Los ajustes vigentes de la tienda (los mismos que ve el público en la web).
// El panel de Ajustes del admin los lee de acá: /config.json es la copia
// congelada que quedó en master y ya no se actualiza.
export async function GET() {
  try {
    return NextResponse.json(await leerAjustes(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('No se pudieron leer los ajustes:', e)
    return NextResponse.json(
      { error: 'No se pudieron leer los ajustes' },
      { status: 500 }
    )
  }
}
