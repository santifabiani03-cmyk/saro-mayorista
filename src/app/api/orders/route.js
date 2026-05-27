import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

const ORDERS_FILE = path.resolve('catalog/orders.json')

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

export async function GET(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  const { searchParams } = new URL(request.url)
  const pin = searchParams.get('pin') ?? ''

  if (!correctPin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    if (!fs.existsSync(ORDERS_FILE)) {
      return NextResponse.json([])
    }
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8')
    return new NextResponse(data, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch {
    return NextResponse.json([])
  }
}
