import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { CONOCIMIENTO, INSTRUCCIONES } from '../../../utils/botKnowledge'

const CATALOG_FILE = path.resolve('catalog/products.json')

// ── Límites (protegen el costo y evitan abuso) ──
const MAX_MSG_CHARS = 500   // largo máximo de un mensaje del cliente
const MAX_HISTORY   = 10    // cuántos mensajes previos se mandan de contexto
const RATE_MAX      = 25    // mensajes permitidos por IP…
const RATE_WINDOW   = 20 * 60 * 1000  // …cada 20 minutos

const chatHits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const hits = (chatHits.get(ip) ?? []).filter(t => now - t < RATE_WINDOW)
  if (hits.length >= RATE_MAX) return true
  hits.push(now)
  chatHits.set(ip, hits)
  // Limpieza ocasional para que el Map no crezca sin control
  if (chatHits.size > 500) {
    for (const [k, v] of chatHits) {
      if (!v.some(t => now - t < RATE_WINDOW)) chatHits.delete(k)
    }
  }
  return false
}

/** Catálogo compacto (sólo lo visible) para darle contexto al modelo. */
function catalogoParaPrompt() {
  let products = []
  try {
    products = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
  } catch { return '(catálogo no disponible)' }

  return products
    .filter(p => p.visible !== false)
    .map(p => {
      const partes = [`- ${p.nombre} | $${Number(p.precio).toLocaleString('es-AR')}`]
      if (p.categoria) partes.push(`categoría: ${p.categoria}`)
      if (p.colores?.length) partes.push(`colores: ${p.colores.join(', ')}`)
      if (p.talles?.length && p.talles[0] !== 'Única') partes.push(`talles: ${p.talles.join(', ')}`)
      if (p.promos?.length) {
        partes.push('promos: ' + p.promos
          .map(pr => `${pr.cantidad}u a $${Number(pr.precioTotal).toLocaleString('es-AR')}`)
          .join(' / '))
      }
      if (p.sinStock) partes.push('SIN STOCK')
      // Combinaciones color/talle agotadas, para no ofrecer lo que no hay
      if (p.noStock?.length) {
        partes.push('agotado en: ' + p.noStock.map(ns => `${ns.color}/${ns.talle}`).join(', '))
      }
      // La descripción trae las specs reales (materiales, forma, núcleo): sin esto
      // el modelo las deduce y termina inventando características.
      if (p.descripcion?.trim()) {
        partes.push(`descripción: ${p.descripcion.trim().replace(/\s+/g, ' ').slice(0, 320)}`)
      }
      return partes.join(' | ')
    })
    .join('\n')
}

/**
 * Día y hora de Argentina, para que el asistente sepa si estamos dentro del
 * horario de atención (8 a 16 hs) y avise cuándo le van a contestar.
 */
function momentoActual() {
  const ahora = new Date()
  const fmt = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'short', hour: 'numeric', hour12: false,
    }).formatToParts(ahora).map(p => [p.type, p.value])
  )
  const hora = Number(partes.hour)
  const finDeSemana = ['Sat', 'Sun'].includes(partes.weekday)
  const enHorario = !finDeSemana && hora >= 8 && hora < 16

  return `En Argentina es ${fmt.format(ahora)} hs. ` + (enHorario
    ? 'Estamos DENTRO del horario de atención: si derivás a WhatsApp, te responden a la brevedad.'
    : 'Estamos FUERA del horario de atención (8 a 16 hs, días hábiles). Si derivás a WhatsApp, ' +
      'aclarale con naturalidad que le van a responder en el próximo día hábil a partir de las 8.')
}

export async function POST(request) {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'El asistente no está configurado.' }, { status: 500 })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') || 'anon'

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Estuviste consultando bastante 😅 Escribinos por WhatsApp y te ayudamos.', whatsapp: true },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const historial = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : []

  if (!historial.length) {
    return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 })
  }
  if (historial.some(m => typeof m?.text !== 'string' || m.text.length > MAX_MSG_CHARS)) {
    return NextResponse.json({ error: 'El mensaje es demasiado largo.' }, { status: 400 })
  }

  const systemPrompt = [
    INSTRUCCIONES,
    '\n## INFORMACIÓN DE SARO\n' + CONOCIMIENTO,
    '\n## MOMENTO ACTUAL\n' + momentoActual(),
    '\n## CATÁLOGO ACTUAL (los únicos productos y precios válidos)\n' + catalogoParaPrompt(),
  ].join('\n')

  const pedirAGemini = () =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: historial.map(m => ({
            role: m.role === 'bot' ? 'model' : 'user',
            parts: [{ text: m.text }],
          })),
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 600,
            // Sin "thinking": en un chat de atención no aporta y se come el
            // presupuesto de salida (las respuestas salían cortadas).
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    )

  try {
    let res = await pedirAGemini()

    // Gemini limita las consultas por minuto: si justo se junta con otro cliente,
    // esperamos un momento y reintentamos una vez antes de darnos por vencidos.
    if (res.status === 429 || res.status === 503) {
      await new Promise(r => setTimeout(r, 1200))
      res = await pedirAGemini()
    }

    // Si sigue sin poder (cuota agotada), no mostramos un error técnico:
    // se lo pasamos a una persona por WhatsApp.
    if (res.status === 429) {
      return NextResponse.json({
        reply: 'Uf, estoy con mucha demanda en este momento y no te puedo responder bien. ' +
               'Escribinos por WhatsApp así te atiende alguien del equipo 👇',
        whatsapp: true,
      })
    }
    if (!res.ok) throw new Error(`Gemini ${res.status}`)

    const data = await res.json()
    let texto = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ?? ''
    texto = texto.trim()

    if (!texto) {
      return NextResponse.json({
        reply: 'Perdón, no pude procesar eso. ¿Lo reformulás o preferís que sigamos por WhatsApp?',
        whatsapp: true,
      })
    }

    // El modelo marca con [WHATSAPP] cuando conviene derivar
    const whatsapp = texto.includes('[WHATSAPP]')
    texto = texto.replace(/\[WHATSAPP\]/g, '').trim()

    return NextResponse.json({ reply: texto, whatsapp })
  } catch {
    return NextResponse.json(
      { error: 'No pude responder en este momento. Escribinos por WhatsApp y te contestamos.', whatsapp: true },
      { status: 502 }
    )
  }
}
