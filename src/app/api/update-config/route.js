import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { actualizarArchivo, ETIQUETAS } from '../../../utils/datos'

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

export async function POST(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { config, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'Config inválida' }, { status: 400 })
  }

  const allowed = [
    'storeName', 'whatsappNumber', 'minPurchase', 'suggestedMinPurchase', 'currency',
    'mostrarCompraMinima', 'minPurchaseNuevo', 'minPurchaseCliente',
  ]
  const sanitized = {}
  for (const key of allowed) {
    if (key in config) sanitized[key] = config[key]
  }

  for (const k of ['minPurchaseNuevo', 'minPurchaseCliente']) {
    if (sanitized[k] != null && (typeof sanitized[k] !== 'number' || sanitized[k] < 0)) {
      return NextResponse.json({ error: `Valor inválido en ${k}` }, { status: 400 })
    }
  }
  if (sanitized.mostrarCompraMinima != null && typeof sanitized.mostrarCompraMinima !== 'boolean') {
    return NextResponse.json({ error: 'Valor de "mostrar compra mínima" inválido' }, { status: 400 })
  }

  if (sanitized.whatsappNumber && !/^\d{10,15}$/.test(sanitized.whatsappNumber)) {
    return NextResponse.json({ error: 'Número de teléfono inválido' }, { status: 400 })
  }
  if (sanitized.minPurchase != null && (typeof sanitized.minPurchase !== 'number' || sanitized.minPurchase < 0)) {
    return NextResponse.json({ error: 'Compra mínima inválida' }, { status: 400 })
  }
  if (sanitized.suggestedMinPurchase != null && (typeof sanitized.suggestedMinPurchase !== 'number' || sanitized.suggestedMinPurchase < 0)) {
    return NextResponse.json({ error: 'Compra mínima sugerida inválida' }, { status: 400 })
  }

  try {
    // Se guarda en config.json de la rama "datos" (no dispara deploy) y las
    // páginas lo vuelven a leer en la próxima visita.
    const merged = await actualizarArchivo('ajustes', current => ({
      ...(current && typeof current === 'object' ? current : {}),
      ...sanitized,
    }), 'actualizar configuración de la tienda')
    revalidateTag(ETIQUETAS.ajustes)

    return NextResponse.json({ ok: true, config: merged })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 500 })
  }
}
