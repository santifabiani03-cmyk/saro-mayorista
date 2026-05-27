import { NextResponse } from 'next/server'

const MAX_ATTEMPTS  = 5
const WINDOW_MS     = 5  * 60 * 1000
const BLOCK_MS      = 15 * 60 * 1000
const FAIL_DELAY_MS = 500

const ipAttempts = new Map()

function getClientIp(request) {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return 'unknown'
}

function checkLimit(ip) {
  const now = Date.now()
  const record = ipAttempts.get(ip)
  if (!record) return { allowed: true }
  if (record.blockedUntil && now < record.blockedUntil) {
    return { allowed: false, minutesLeft: Math.ceil((record.blockedUntil - now) / 60000) }
  }
  if (now - record.windowStart > WINDOW_MS) {
    ipAttempts.delete(ip)
    return { allowed: true }
  }
  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS
    return { allowed: false, minutesLeft: Math.ceil(BLOCK_MS / 60000) }
  }
  return { allowed: true }
}

function recordFailure(ip) {
  const now = Date.now()
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

function clearAttempts(ip) {
  ipAttempts.delete(ip)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request) {
  const correctPin = (process.env.ADMIN_PIN ?? '').replace(/^﻿/, '').trim()
  if (!correctPin) {
    return NextResponse.json(
      { error: 'ADMIN_PIN no configurado en el servidor' },
      { status: 500 }
    )
  }

  const ip = getClientIp(request)
  const limit = checkLimit(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Intenta de nuevo en ${limit.minutesLeft} min.` },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { pin } = body
  const ok = typeof pin === 'string' && pin === correctPin

  if (!ok) {
    recordFailure(ip)
    await delay(FAIL_DELAY_MS)
    const record = ipAttempts.get(ip)
    const remaining = record ? Math.max(0, MAX_ATTEMPTS - record.count) : MAX_ATTEMPTS
    return NextResponse.json({ ok: false, attemptsLeft: remaining })
  }

  clearAttempts(ip)
  return NextResponse.json({ ok: true })
}
