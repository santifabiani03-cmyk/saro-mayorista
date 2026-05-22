/**
 * Vercel serverless — POST /api/generate-description
 *
 * Recibe un nombre de producto + palabras clave y usa Gemini 2.5 Flash
 * para generar una descripción atractiva de venta mayorista.
 *
 * Requiere GEMINI_API_KEY en las variables de entorno.
 */

function buildPrompt(nombre, keywords, precio) {
  const info = keywords?.trim() ? `${nombre} — ${keywords}` : nombre
  return `Escribí una descripción corta de producto para una tienda online mayorista de indumentaria deportiva y pádel en Argentina.

REGLAS ESTRICTAS:
- Entre 2 y 4 oraciones, máximo 80 palabras en total.
- Hablá en tercera persona describiendo el producto, NUNCA uses "ofrezca", "sus clientes", "usted" ni te dirijas al lector.
- Describí qué ES el producto y por qué es bueno. Ejemplo: "Remera de entrenamiento con tejido dry-fit que mantiene el cuerpo fresco. Ideal para pádel y running."
- Usá un tono confiable y profesional, sin exageraciones.
- No uses emojis, hashtags ni signos de exclamación.
- Si no tenés info suficiente, describí el producto de forma genérica basándote en su nombre.
- Respondé ÚNICAMENTE con el texto de la descripción, nada más.

Producto: ${info}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' })
  }

  const { nombre, keywords, precio } = req.body ?? {}
  if (!nombre && !keywords) {
    return res.status(400).json({ error: 'Se requiere nombre o keywords' })
  }

  const prompt = buildPrompt(nombre, keywords, precio)

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
      const err = await response.text()
      console.error('Gemini API error:', err)
      return res.status(502).json({ error: 'Error al comunicarse con Gemini' })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!text) {
      return res.status(502).json({ error: 'Gemini no devolvió texto' })
    }

    return res.status(200).json({ ok: true, descripcion: text })
  } catch (e) {
    console.error('generate-description error:', e)
    return res.status(500).json({ error: 'Error interno: ' + (e.message ?? 'desconocido') })
  }
}
