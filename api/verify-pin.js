/**
 * Vercel serverless — POST /api/verify-pin
 * Valida el PIN del admin contra la variable de entorno ADMIN_PIN (server-side).
 * El PIN nunca llega al bundle del browser.
 */
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const correctPin = (process.env.ADMIN_PIN ?? '').replace(/^﻿/, '').trim()
  const { pin }    = req.body ?? {}

  if (!correctPin) {
    return res.status(500).json({ error: 'ADMIN_PIN no configurado en el servidor' })
  }

  return res.status(200).json({ ok: typeof pin === 'string' && pin === correctPin })
}
