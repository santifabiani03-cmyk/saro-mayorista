/**
 * Gemini para los videos del admin (sólo servidor: lo usan /api/videos/sugerir
 * y /api/videos/revisar). Ver CLAUDE.md §8.
 *
 * - sugerirTextos: antes de generar. Propone etiqueta / gancho / cierre y el
 *   texto de la publicación con los datos REALES de los productos.
 * - revisarVideo: después de generar. Gemini mira el MP4 y lista problemas
 *   (texto cortado, ortografía, precio que no coincide, ritmo…).
 *
 * Regla de oro de los videos: nada inventado. Además de pedírselo a Gemini, se
 * descarta cualquier texto sugerido con números que no estén en los datos.
 */
import { CAMPOS_TEXTO, plantillaMeta } from '../videos/catalogo'
import { pesos } from '../videos/textos'

const MODELO = 'gemini-2.5-flash'
const API = 'https://generativelanguage.googleapis.com'

export const faltaClave = () => !process.env.GEMINI_API_KEY

const clave = () => (process.env.GEMINI_API_KEY ?? '').replace(/^﻿/, '').trim()

/** Lo que sabemos de cada producto, en texto: es TODO lo que Gemini puede usar. */
function datosProductos(productos) {
  return productos
    .map((p, i) => {
      const extras = [
        `precio al público ${pesos(p.precio)}`,
        p.categoria && `categoría ${p.categoria}`,
        p.nuevo && 'es nuevo',
        p.enfoque && `juego: ${p.enfoque}`,
        p.nivel && `nivel: ${p.nivel}`,
        p.specs?.length && `specs: ${p.specs.join(', ')}`,
        p.promo && `promo: ${p.promo}`,
      ].filter(Boolean)
      return `${i + 1}. ${p.nombre} — ${extras.join('; ')}`
    })
    .join('\n')
}

// Gemini a veces responde "mucha demanda" (503) o "límite" (429): se reintenta
const ESPERAS_MS = [2000, 6000]

async function generar(partes, esquema, temperatura) {
  const pedido = () =>
    fetch(`${API}/v1beta/models/${MODELO}:generateContent?key=${clave()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: partes }],
        generationConfig: {
          temperature: temperatura,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: esquema,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
  let res = await pedido()
  for (const espera of ESPERAS_MS) {
    if (res.status !== 503 && res.status !== 429) break
    await new Promise(r => setTimeout(r, espera))
    res = await pedido()
  }
  if (res.status === 503 || res.status === 429) {
    throw new Error('Gemini está saturado en este momento. Probá de nuevo en unos minutos.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Gemini respondió ${res.status}${err.error?.message ? `: ${err.error.message}` : ''}`)
  }
  const data = await res.json()
  const texto = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('')
  if (!texto) throw new Error('Gemini no devolvió respuesta')
  return JSON.parse(texto)
}

const CADENA = { type: 'STRING' }

// Números que aparecen en un texto ("$190.000" -> "190000", "12K" -> "12")
const numeros = t => (String(t).match(/\d[\d.,]*/g) ?? []).map(n => n.replace(/[.,]/g, ''))

/**
 * Un texto sugerido sirve si entra en el límite, no trae números inventados y
 * (el cierre) no repite la dirección, que el video ya muestra debajo.
 */
function textoValido(campo, valor, permitidos) {
  if (typeof valor !== 'string') return false
  const v = valor.trim()
  if (!v || v.length > CAMPOS_TEXTO[campo].max || /[\r\n]/.test(v)) return false
  if (campo === 'cierre' && /saro\.com|www\.|https?:/i.test(v)) return false
  return numeros(v).every(n => permitidos.has(n))
}

/** La etiqueta va siempre en mayúsculas (así la dibuja el video). */
const pulir = (campo, v) => (campo === 'etiqueta' ? v.trim().toLocaleUpperCase('es-AR') : v.trim())

/**
 * Propone textos para el video y la publicación.
 * Devuelve { opciones: [{ etiqueta?, gancho?, cierre? }], publicacion, avisos: [] }.
 */
export async function sugerirTextos(plantillaId, productos) {
  const meta = plantillaMeta(plantillaId)
  const campos = meta.textos
  const datos = datosProductos(productos)
  const permitidos = new Set([...numeros(datos), ...numeros(new Date().getFullYear()), '15'])
  const sinPrecios = meta.sinPrecios

  const prompt = `Sos el redactor de videos cortos (Reels, TikTok) de SARO, marca argentina de paletas de pádel, accesorios y ropa deportiva, con 15 años y fabricación propia. Español rioplatense, tono directo y con energía, sin exagerar.

Video: plantilla "${meta.nombre}" (${meta.descripcion})
Productos (estos son TODOS los datos que existen):
${datos}

Tareas:
1. "opciones": 3 juegos de textos distintos entre sí. Campos: ${campos
    .map(c => `"${c}" (${CAMPOS_TEXTO[c].nombre}, máximo ${CAMPOS_TEXTO[c].max} caracteres: ${CAMPOS_TEXTO[c].ayuda})`)
    .join('; ')}.
   - La etiqueta va en MAYÚSCULAS. El gancho tiene que frenar el scroll en el primer segundo.
   - La frase de cierre va justo ARRIBA de la dirección "saro.com.ar" (el video ya la muestra) y del botón de WhatsApp: tiene que leerse natural seguida de la dirección (ej.: "Elegí la tuya en", "Pedila en"). NO incluyas la dirección en la frase.
2. "publicacion": el texto para la publicación de Instagram (2 a 4 líneas cortas + 4 a 6 hashtags). Que invite a pedir por WhatsApp o entrar a saro.com.ar.
3. "avisos": errores o cosas raras en los NOMBRES o datos de los productos (faltas de ortografía, abreviaturas que se ven mal en un video, mayúsculas sostenidas, un dato que no parece de ese producto). Lista vacía si está todo bien.

Reglas estrictas:
- NO inventes datos: ni precios, ni descuentos, ni cuotas, ni envío gratis, ni stock, ni materiales que no estén arriba.${sinPrecios ? '\n- Este video es para revendedores: NO menciones precios.' : ''}
- Sin emojis en los textos del video (en la publicación, como mucho 2).
- Respetá los máximos de caracteres.`

  const propiedades = Object.fromEntries(campos.map(c => [c, CADENA]))
  const esquema = {
    type: 'OBJECT',
    properties: {
      opciones: { type: 'ARRAY', items: { type: 'OBJECT', properties: propiedades, required: campos } },
      publicacion: CADENA,
      avisos: { type: 'ARRAY', items: CADENA },
    },
    required: ['opciones', 'publicacion', 'avisos'],
  }

  const r = await generar([{ text: prompt }], esquema, 0.9)
  const opciones = (r.opciones ?? [])
    .map(o => Object.fromEntries(campos.filter(c => textoValido(c, o?.[c], permitidos)).map(c => [c, pulir(c, o[c])])))
    .filter(o => Object.keys(o).length === campos.length)
    .slice(0, 3)
  const publicacion = typeof r.publicacion === 'string' && numeros(r.publicacion).every(n => permitidos.has(n)) ? r.publicacion.trim() : ''
  const avisos = (r.avisos ?? []).filter(a => typeof a === 'string' && a.trim()).slice(0, 6)
  return { opciones, publicacion, avisos }
}

// ---------- Revisión del MP4 ----------

/** Sube el video a la API de archivos de Gemini y espera a que lo procese. */
async function subirVideo(buffer, nombre) {
  const inicio = await fetch(`${API}/upload/v1beta/files?key=${clave()}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(buffer.byteLength),
      'X-Goog-Upload-Header-Content-Type': 'video/mp4',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: nombre } }),
  })
  const urlSubida = inicio.headers.get('x-goog-upload-url')
  if (!inicio.ok || !urlSubida) throw new Error(`No se pudo empezar a subir el video a Gemini (${inicio.status})`)

  const subida = await fetch(urlSubida, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' },
    body: buffer,
  })
  if (!subida.ok) throw new Error(`No se pudo subir el video a Gemini (${subida.status})`)
  let { file } = await subida.json()

  // Gemini procesa el video unos segundos antes de poder mirarlo
  for (let i = 0; file?.state === 'PROCESSING' && i < 40; i++) {
    await new Promise(r => setTimeout(r, 2500))
    file = await fetch(`${API}/v1beta/${file.name}?key=${clave()}`).then(r => r.json())
  }
  if (file?.state !== 'ACTIVE') throw new Error('Gemini no terminó de procesar el video')
  return file
}

const borrarVideo = file => fetch(`${API}/v1beta/${file.name}?key=${clave()}`, { method: 'DELETE' }).catch(() => {})

/**
 * Gemini mira el MP4 y lo revisa contra los datos reales del pedido.
 * `props`: las props con que se generó (productos y textos) para comparar.
 * Devuelve { veredicto: 'listo'|'mejorable'|'corregir', resumen, problemas: [{ segundo, tipo, detalle, sugerencia }], textos }.
 */
export async function revisarVideo(buffer, nombre, plantillaId, props) {
  const meta = plantillaMeta(plantillaId)
  const file = await subirVideo(buffer, nombre)
  try {
    const campos = meta.textos
    const prompt = `Sos director creativo de videos cortos para redes (Reels, TikTok, anuncios de Meta). Revisá este video de SARO (marca argentina de pádel) hecho con la plantilla "${meta.nombre}".

Datos reales de los productos (lo que DEBE coincidir con lo que se ve):
${datosProductos(props.productos ?? [])}

Revisá con ojo crítico y concreto:
- Los 2 primeros segundos: ¿hay algo que frene el scroll? ¿se entiende qué se vende?
- Textos: ortografía, palabras cortadas o que se salen, poco contraste, demasiado chicos para un celular, demasiado tiempo o muy poco para leerlos.
- Precios y nombres: ¿coinciden con los datos reales? Cada escena muestra UN producto con sus datos (nombre arriba): antes de marcar un dato como incorrecto, fijate el nombre que está en pantalla en ese momento y comparalo con ESE producto de la lista.
- Fotos: pixeladas, deformadas, tapadas, mal recortadas.
- Ritmo: escenas que sobran o que pasan muy rápido; si la música acompaña.
- Cierre: ¿queda claro qué hacer (entrar a saro.com.ar o pedir por WhatsApp)?
Cómo está hecho a propósito (NO es un error):
- Los precios se animan contando desde $0 hasta el precio final en menos de un segundo: revisá sólo el valor final.
- La parte de abajo de la pantalla (en vertical, el último tercio) queda sin textos a propósito, porque la tapa la interfaz de Instagram y TikTok.
- La frase de cierre va seguida de la dirección "saro.com.ar…", que el video ya muestra: no la repitas en los textos que propongas.
No marques como problema lo que está bien. No sugieras datos que no estén arriba (precios, descuentos, cuotas, envío gratis).
${campos.length ? `Si los textos del video se pueden mejorar, proponé en "textos" una versión (campos: ${campos.map(c => `${c} hasta ${CAMPOS_TEXTO[c].max} caracteres`).join(', ')}); si están bien, dejalos vacíos.` : 'Esta plantilla no tiene textos editables: dejá "textos" vacío.'}
Respondé en español rioplatense, claro para alguien que no es diseñador.`

    const esquema = {
      type: 'OBJECT',
      properties: {
        veredicto: { type: 'STRING', enum: ['listo', 'mejorable', 'corregir'] },
        resumen: CADENA,
        problemas: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: { segundo: { type: 'NUMBER' }, tipo: CADENA, detalle: CADENA, sugerencia: CADENA },
            required: ['detalle', 'sugerencia'],
          },
        },
        textos: { type: 'OBJECT', properties: Object.fromEntries(['etiqueta', 'gancho', 'cierre'].map(c => [c, CADENA])) },
      },
      required: ['veredicto', 'resumen', 'problemas'],
    }

    const r = await generar([{ file_data: { mime_type: 'video/mp4', file_uri: file.uri } }, { text: prompt }], esquema, 0.4)
    const permitidos = new Set([...numeros(datosProductos(props.productos ?? [])), ...numeros(new Date().getFullYear()), '15'])
    const textos = Object.fromEntries(
      campos.filter(c => textoValido(c, r.textos?.[c], permitidos)).map(c => [c, pulir(c, r.textos[c])]),
    )
    return {
      veredicto: ['listo', 'mejorable', 'corregir'].includes(r.veredicto) ? r.veredicto : 'mejorable',
      resumen: String(r.resumen ?? '').trim(),
      problemas: (r.problemas ?? []).slice(0, 10).map(p => ({
        segundo: Number.isFinite(p.segundo) ? Math.max(0, Math.round(p.segundo)) : null,
        tipo: String(p.tipo ?? '').trim(),
        detalle: String(p.detalle ?? '').trim(),
        sugerencia: String(p.sugerencia ?? '').trim(),
      })),
      textos,
    }
  } finally {
    borrarVideo(file)
  }
}
