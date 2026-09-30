import { NextResponse } from 'next/server'
import { leerCatalogo } from '../../../utils/datos'

// El catálogo publicado. Lo usan el admin (al abrir) y las sugerencias del
// carrito. Sin caché del CDN: la de Next ya evita ir a GitHub en cada pedido y
// se invalida al publicar, así el admin nunca arranca con una versión vieja.
export async function GET() {
  try {
    return NextResponse.json(await leerCatalogo(), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('No se pudo leer el catálogo:', e)
    return NextResponse.json(
      { error: 'No se pudo leer el catalogo' },
      { status: 500 }
    )
  }
}
