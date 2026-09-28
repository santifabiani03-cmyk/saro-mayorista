// Encuadra las fotos de paletas que ya estaban cargadas, con la misma regla que
// usa el admin al subir fotos nuevas (src/utils/encuadrePaleta.js).
//
//   node scripts/encuadrar-paletas.mjs <products.json> <carpeta de salida>
//
// Baja cada foto, la encuadra y guarda el WebP nuevo en la carpeta de salida.
// Imprime un JSON { urlVieja: nombreArchivoNuevo } para actualizar el catálogo.
// Las fotos que no se pueden encuadrar solas (primeros planos, fondos con
// textura) se saltean y quedan como están.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { ENCUADRE, medirPaleta, planEncuadre, recortarConMascara } from '../src/utils/encuadrePaleta.js'

const [archivo, salida] = process.argv.slice(2)
if (!archivo || !salida) {
  console.error('Uso: node scripts/encuadrar-paletas.mjs <products.json> <carpeta de salida>')
  process.exit(1)
}
fs.mkdirSync(salida, { recursive: true })

const productos = JSON.parse(fs.readFileSync(archivo, 'utf-8'))
const cambios = {}

for (const p of productos.filter(x => x.categoria === 'paleta')) {
  for (const [n, url] of (p.imagenes ?? []).entries()) {
    const res = await fetch(url)
    if (!res.ok) { console.error(`✗ ${p.nombre} #${n + 1}: no se pudo bajar (${res.status})`); continue }
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })

    const medida = medirPaleta(data, info.width, info.height)
    if (!medida) { console.error(`– ${p.nombre} #${n + 1}: se deja como está`); continue }

    const plan = planEncuadre(medida.caja)
    const recorte = await sharp(Buffer.from(recortarConMascara(data, info.width, medida)), {
      raw: { width: medida.caja.w, height: medida.caja.h, channels: 4 },
    }).resize(plan.w, plan.h).png().toBuffer()

    const nombre = `${path.basename(new URL(url).pathname, path.extname(url))}-encuadre.webp`
    await sharp({
      create: { width: ENCUADRE.ancho, height: ENCUADRE.alto, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: recorte, left: plan.x, top: plan.y }])
      .webp({ quality: 88 })
      .toFile(path.join(salida, nombre))

    cambios[url] = nombre
    console.error(`✓ ${p.nombre} #${n + 1} -> ${nombre}`)
  }
}

console.log(JSON.stringify(cambios, null, 2))
