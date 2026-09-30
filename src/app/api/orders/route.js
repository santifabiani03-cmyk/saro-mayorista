import { NextResponse } from 'next/server'
import { leerArchivo } from '../../../utils/datos'

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

// Pedidos registrados (para la pestaña Demanda del admin). Se leen en el
// momento de la rama "datos", sin caché: siempre incluyen el último pedido.
export async function GET(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  const { searchParams } = new URL(request.url)
  const pin = searchParams.get('pin') ?? ''

  if (!correctPin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const { datos } = await leerArchivo('pedidos')
    return NextResponse.json(Array.isArray(datos) ? datos : [], {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('No se pudieron leer los pedidos:', e)
    return NextResponse.json({ error: 'No se pudieron leer los pedidos' }, { status: 500 })
  }
}
