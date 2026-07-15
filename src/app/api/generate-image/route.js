import { NextResponse } from 'next/server'

// Escenas disponibles — el prompt cuida que el producto no se modifique
const SCENES = {
  accion: 'a realistic action photo of this exact product being actively used by a player during a padel match on a professional padel court with glass walls and blue turf. Natural dynamic lighting, shallow depth of field',
  lifestyle: 'a realistic lifestyle photo of this exact product being worn/used by a young athlete in an urban outdoor setting at golden hour. Editorial sports photography style',
  estudio: 'a premium studio product photo of this exact product on a dark elegant backdrop with dramatic rim lighting and a subtle blue accent glow. High-end commercial photography',
  tienda: 'a realistic photo of this exact product displayed on a modern sports store shelf/display, well lit retail environment, other blurred sports products in background',
}

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

export async function POST(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json({ error: 'ADMIN_PIN no configurado' }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const { pin, imageUrl, scene, productName } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })
  }

  if (!imageUrl || !SCENES[scene]) {
    return NextResponse.json({ error: 'Faltan imageUrl o scene válida' }, { status: 400 })
  }

  try {
    // Descargar la imagen del producto (server-side, sin problemas de CORS)
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'No se pudo descargar la imagen del producto' }, { status: 400 })
    }
    const mimeType = imgRes.headers.get('content-type')?.split(';')[0] || 'image/webp'
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagen demasiado grande (máx 8MB)' }, { status: 400 })
    }
    const imageBase64 = buffer.toString('base64')

    const prompt = `Using the product shown in the provided image${productName ? ` (${productName})` : ''}, generate ${SCENES[scene]}. CRITICAL: keep the product's exact design, colors, logos and proportions unchanged — it must be clearly recognizable as the same product. Square 1:1 composition. Do not add any text or watermarks.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      const msg = err?.error?.message ?? `Gemini API error ${response.status}`
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts ?? []
    const imgPart = parts.find(p => p.inlineData?.data || p.inline_data?.data)
    const generated = imgPart?.inlineData ?? imgPart?.inline_data

    if (!generated?.data) {
      return NextResponse.json({ error: 'Gemini no devolvió una imagen. Probá de nuevo.' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      image: generated.data,
      mimeType: generated.mimeType ?? generated.mime_type ?? 'image/png',
    })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error desconocido' }, { status: 500 })
  }
}
