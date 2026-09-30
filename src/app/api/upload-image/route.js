import { NextResponse } from 'next/server'
import { subirFoto } from '../../../utils/datos'

// Las fotos que sube el admin van a fotos/ de la rama "datos" (no dispara
// deploy) y se sirven con su URL directa de GitHub. Las más viejas siguen en
// public/assets de master: esas URLs no cambian.

export async function POST(request) {
  const clean = val => (val ?? '').replace(/^﻿/, '').trim()
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json(
      { error: 'ADMIN_PIN no configurado en el servidor' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { name, data, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!name || !data) {
    return NextResponse.json({ error: 'Faltan name/data' }, { status: 400 })
  }

  const safe = name.toLowerCase().replace(/[^a-z0-9._-]/g, '-')

  try {
    const url = await subirFoto(safe, data)
    // El admin guarda rawUrl en el producto. path queda por compatibilidad.
    return NextResponse.json({ ok: true, path: url, rawUrl: url })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error desconocido' },
      { status: 500 }
    )
  }
}
