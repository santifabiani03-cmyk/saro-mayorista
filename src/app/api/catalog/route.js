import fs from 'node:fs'
import path from 'node:path'
import { NextResponse } from 'next/server'

const CATALOG_FILE = path.resolve('catalog/products.json')

export async function GET() {
  try {
    const data = fs.readFileSync(CATALOG_FILE, 'utf-8')
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'No se pudo leer el catalogo' },
      { status: 500 }
    )
  }
}
