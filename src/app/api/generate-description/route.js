import { NextResponse } from 'next/server'

function buildPrompt(nombre, keywords) {
  const hasKw = keywords?.trim()
  return `Escribi una descripcion corta de producto para una tienda online mayorista de indumentaria deportiva y padel en Argentina.

REGLAS ESTRICTAS:
- Entre 2 y 4 oraciones, maximo 80 palabras en total.
- Habla en tercera persona describiendo el producto, NUNCA uses "ofrezca", "sus clientes", "usted" ni te dirijas al lector.
- Describi que ES el producto y por que es bueno. Ejemplo: "Remera de entrenamiento con tejido dry-fit que mantiene el cuerpo fresco. Ideal para padel y running."
- Usa un tono confiable y profesional, sin exageraciones.
- No uses emojis, hashtags ni signos de exclamacion.
- Responde UNICAMENTE con el texto de la descripcion, nada mas.
${hasKw
  ? `- IMPORTANTE: el usuario escribio palabras clave/ideas que DEBES incorporar y desarrollar en la descripcion. Basate principalmente en esas palabras clave.`
  : `- No tenes palabras clave, genera la descripcion basandote unicamente en el nombre del producto.`}

Nombre del producto: ${nombre}${hasKw ? `\nPalabras clave a desarrollar: ${keywords}` : ''}`
}

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
  const { nombre, keywords, precio, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY no configurada en el servidor' },
      { status: 500 }
    )
  }

  if (!nombre && !keywords) {
    return NextResponse.json(
      { error: 'Se requiere nombre o keywords' },
      { status: 400 }
    )
  }

  const prompt = buildPrompt(nombre, keywords)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al comunicarse con Gemini' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) {
      return NextResponse.json(
        { error: 'Gemini no devolvio texto' },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, descripcion: text })
  } catch (e) {
    return NextResponse.json(
      { error: 'Error interno: ' + (e.message ?? 'desconocido') },
      { status: 500 }
    )
  }
}
