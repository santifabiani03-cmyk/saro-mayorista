/**
 * Vercel serverless — POST /api/verify-pin
 *
 * Valida el PIN del admin con protección anti fuerza-bruta:
 *   - Máx. 5 intentos fallidos en una ventana de 5 minutos por IP.
 *   - Después del 5to fallo → bloqueo de 15 minutos.
 *   - Delay artificial de 500 ms en cada fallo para frenar automatización.
 *
 * Nota: el contador vive en memoria del proceso. Vercel puede crear múltiples
 * instancias en paralelo, por lo que el rate-limit se aplica por instancia.
 * Es suficiente para proteger un panel admin de uso personal. Para un entorno
 * con miles de usuarios concurrentes, reemplazar por Upstash Redis.
 */

const MAX_ATTEMPTS  = 5
const WINDOW_MS     = 5  * 60 * 1000  // ventana: 5 minutos
const BLOCK_MS      = 15 * 60 * 1000  // bloqueo: 15 minutos tras agotar intentos
const FAIL_DELAY_MS = 500             // delay por fallo para frenar bots

/** Mapa IP → { count, windowStart, blockedUntil } */
const ipAttempts = new Map()

/** Extrae la IP real respetando el proxy de Vercel */
function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

/** Evalúa si la IP puede intentar. Devuelve { allowed, minutesLeft? } */
function checkLimit(ip) {
  const now    = Date.now()
  const record = ipAttempts.get(ip)

  if (!record) return { allowed: true }

  // Bloqueada activamente
  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, minutesLeft: Math.ceil((record.blockedUntil - now) / 60000) }
  }

  // Venció la ventana de intentos → limpiar
  if (now - record.windowStart > WINDOW_MS) {
    ipAttempts.delete(ip)
    return { allowed: true }
  }

  // Dentro de la ventana pero aún sin bloquear
  if (record.count >= MAX_ATTEMPTS) {
    // Debería estar bloqueada pero blockedUntil era null → bloquear ahora
    record.blockedUntil = now + BLOCK_MS
    return { allowed: false, minutesLeft: Math.ceil(BLOCK_MS / 60000) }
  }

  return { allowed: true }
}

/** Registra un intento fallido */
function recordFailure(ip) {
  const now    = Date.now()
  const record = ipAttempts.get(ip)

  if (!record || now - record.windowStart > WINDOW_MS) {
    ipAttempts.set(ip, { count: 1, windowStart: now, blockedUntil: null })
  } else {
    record.count++
    if (record.count >= MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_MS
    }
  }
}

/** Limpia los intentos de una IP tras un login exitoso */
function clearAttempts(ip) {
  ipAttempts.delete(ip)
}

/** Delay no-bloqueante */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const correctPin = (process.env.ADMIN_PIN ?? '').replace(/^﻿/, '').trim()
  if (!correctPin) {
    return res.status(500).json({ error: 'ADMIN_PIN no configurado en el servidor' })
  }

  const ip = getClientIp(req)

  // ── Verificar rate limit ────────────────────────────────────────────────────
  const limit = checkLimit(ip)
  if (!limit.allowed) {
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Intentá de nuevo en ${limit.minutesLeft} min.`,
    })
  }

  const { pin } = req.body ?? {}
  const ok = typeof pin === 'string' && pin === correctPin

  if (!ok) {
    recordFailure(ip)
    await delay(FAIL_DELAY_MS) // frena automatización
    const record = ipAttempts.get(ip)
    const remaining = record ? Math.max(0, MAX_ATTEMPTS - record.count) : MAX_ATTEMPTS
    return res.status(200).json({
      ok: false,
      attemptsLeft: remaining,
    })
  }

  // Login exitoso → limpiar contador
  clearAttempts(ip)
  return res.status(200).json({ ok: true })
}
