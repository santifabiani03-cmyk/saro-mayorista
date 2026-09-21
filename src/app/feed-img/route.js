import sharp from 'sharp'

// Fotos para el feed de publicidad (/feed.xml).
// Las fotos del catálogo están en WebP y muchas son recortes con fondo
// transparente. El catálogo de Meta pide JPG/PNG, y un PNG transparente se ve
// con fondo negro en algunos anuncios. Acá se convierten a JPG, con fondo
// blanco y a un tamaño que las dos plataformas aceptan.
//
// Sólo convierte fotos de SARO (el repo o el propio sitio). Así nadie puede
// usar esta ruta para bajar imágenes de cualquier lado.
const PERMITIDAS = [
  'https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/',
  'https://saro.com.ar/',
]

const LADO = 1080 // cuadrado de Meta: 1080 × 1080

export async function GET(request) {
  const u = new URL(request.url).searchParams.get('u') ?? ''
  if (!PERMITIDAS.some(p => u.startsWith(p)) || u.includes('..')) {
    return new Response('Imagen no permitida', { status: 400 })
  }

  try {
    const res = await fetch(u)
    if (!res.ok) return new Response('No se encontró la imagen', { status: 404 })
    const original = Buffer.from(await res.arrayBuffer())

    const jpg = await sharp(original)
      .rotate()
      .resize(LADO, LADO, { fit: 'contain', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()

    return new Response(jpg, {
      headers: {
        'Content-Type': 'image/jpeg',
        // Cada foto nueva tiene su propio nombre, así que se puede guardar mucho
        'Cache-Control': 'public, max-age=86400, s-maxage=2592000, immutable',
      },
    })
  } catch {
    return new Response('Error convirtiendo la imagen', { status: 500 })
  }
}
