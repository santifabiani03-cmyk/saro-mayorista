import { NextResponse } from 'next/server'

/**
 * Cotizador de envío (API MiCorreo de Correo Argentino).
 *
 * Flujo: /token (Basic Auth) → /rates (Bearer). Las credenciales viven SOLO en
 * variables de entorno del servidor; nunca se exponen al navegador.
 *
 * Variables necesarias (.env.local y Vercel):
 *   MICORREO_USER, MICORREO_PASSWORD   → credenciales de API (las provee Correo Argentino)
 *   MICORREO_CUSTOMER_ID               → id de cliente MiCorreo
 *   MICORREO_EMAIL, MICORREO_EMAIL_PASS→ (alternativa) para obtener el customerId vía /users/validate
 *   MICORREO_CP_ORIGEN                 → CP desde donde se despacha (default 1065)
 *   MICORREO_ENV                       → 'test' para el ambiente de pruebas
 */

const clean = v => (v ?? '').replace(/^﻿/, '').trim()

const BASE_URL = () =>
  clean(process.env.MICORREO_ENV) === 'test'
    ? 'https://apitest.correoargentino.com.ar/micorreo/v1'
    : 'https://api.correoargentino.com.ar/micorreo/v1'

// Caché del token en memoria (dura lo que viva la instancia; evita pedirlo en cada cotización)
let tokenCache = { token: null, expires: 0 }

async function getToken() {
  const now = Date.now()
  if (tokenCache.token && now < tokenCache.expires - 60_000) return tokenCache.token

  const user = clean(process.env.MICORREO_USER)
  const pass = clean(process.env.MICORREO_PASSWORD)
  if (!user || !pass) throw new Error('Faltan credenciales de MiCorreo en el servidor')

  const res = await fetch(`${BASE_URL()}/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64') },
  })
  if (!res.ok) throw new Error('No se pudo autenticar con Correo Argentino')

  const data = await res.json()
  tokenCache = {
    token: data.token,
    expires: data.expires ? new Date(data.expires).getTime() : now + 10 * 60_000,
  }
  return tokenCache.token
}

async function getCustomerId(token) {
  const fixed = clean(process.env.MICORREO_CUSTOMER_ID)
  if (fixed) return fixed

  const email = clean(process.env.MICORREO_EMAIL)
  const password = clean(process.env.MICORREO_EMAIL_PASS)
  if (!email || !password) throw new Error('Falta configurar el cliente de MiCorreo')

  const res = await fetch(`${BASE_URL()}/users/validate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('No se pudo validar la cuenta de MiCorreo')
  const data = await res.json()
  return data.customerId
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const cpDestino = String(body.cp ?? '').replace(/\D/g, '')
  const pesoGramos = Math.round(Number(body.peso) || 0)

  if (!/^\d{4}$/.test(cpDestino)) {
    return NextResponse.json({ error: 'Ingresá un código postal válido (4 dígitos)' }, { status: 400 })
  }
  if (pesoGramos < 1 || pesoGramos > 25000) {
    return NextResponse.json({ error: 'El peso del pedido está fuera del rango que cotiza Correo Argentino' }, { status: 400 })
  }

  // Dimensiones estimadas de la caja según el peso (la API las exige).
  const dims =
    pesoGramos <= 1000  ? { height: 10, width: 25, length: 35 } :
    pesoGramos <= 5000  ? { height: 20, width: 30, length: 40 } :
                          { height: 30, width: 40, length: 50 }

  try {
    const token = await getToken()
    const customerId = await getCustomerId(token)

    const res = await fetch(`${BASE_URL()}/rates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId,
        postalCodeOrigin: clean(process.env.MICORREO_CP_ORIGEN) || '1065',
        postalCodeDestination: cpDestino,
        // Sin deliveredType devuelve domicilio y sucursal en una sola llamada
        dimensions: { weight: pesoGramos, ...dims },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'No pudimos cotizar el envío en este momento' },
        { status: 502 }
      )
    }

    const data = await res.json()
    const rates = (data.rates ?? []).map(r => ({
      tipo: r.deliveredType === 'S' ? 'sucursal' : 'domicilio',
      nombre: r.productName,
      precio: Number(r.price),
      diasMin: r.deliveryTimeMin,
      diasMax: r.deliveryTimeMax,
    }))

    return NextResponse.json({ ok: true, rates })
  } catch (e) {
    return NextResponse.json({ error: e.message ?? 'Error al cotizar' }, { status: 500 })
  }
}
