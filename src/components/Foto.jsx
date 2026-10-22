'use client'
import { useState } from 'react'

// Las fotos de producto se suben en tamaño completo (~100 KB, hasta 350 KB) y
// antes se bajaban así aunque la tarjeta del celular mida 180 px. Foto las pide
// al optimizador de Vercel (/_next/image) en el ancho justo y en WebP, y el
// navegador elige la versión según `sizes`. Es un <img> común: mismas clases,
// mismo loading y mismo onError que antes.
//
// Si el optimizador falla (por ejemplo, si un mes se pasa del cupo gratis de
// Vercel), la foto vuelve sola al archivo original: nunca queda en blanco.
//
// Calidad: a 85 la foto achicada no se distingue de la original a tamaño real
// (medido en las 102 fotos el 22/10/2026). Cuando la pantalla pide más de
// 828 px (zoom, ficha en pantallas nítidas) va la original tal cual: miden
// 768–1200 px, así que achicarlas ahí casi no ahorra y recomprimirlas sí
// pierde detalle.

// Tienen que estar en deviceSizes o imageSizes de Next (los de fábrica).
const ANCHOS = [128, 256, 384, 640, 828]
const CALIDAD = 85
// Ancho con que se declara la original en el srcSet (las fotos miden hasta 1200 px)
const ANCHO_ORIGINAL = 1200

// Los mismos orígenes que images.remotePatterns en next.config.mjs.
const REPO = 'https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/'

const optimizable = src =>
  typeof src === 'string' && !src.endsWith('.svg') &&
  (src.startsWith(REPO) || (src.startsWith('/') && !src.startsWith('//')))

const urlOptimizada = (src, ancho) =>
  `/_next/image?url=${encodeURIComponent(src)}&w=${ancho}&q=${CALIDAD}`

// En el srcSet las comas y los espacios separan candidatos: si la URL original
// tuviera alguno, se escapa.
const srcSetDe = src => [
  ...ANCHOS.map(w => `${urlOptimizada(src, w)} ${w}w`),
  `${src.replace(/,/g, '%2C').replace(/\s/g, '%20')} ${ANCHO_ORIGINAL}w`,
].join(', ')

export default function Foto({ src, sizes, onError, ...resto }) {
  // Se guarda qué foto falló (y no un sí/no) para que el carrusel, que cambia
  // `src`, vuelva a intentar optimizada con la foto siguiente.
  const [fallo, setFallo] = useState(null)
  const usar = optimizable(src) && fallo !== src

  return (
    <img
      {...resto}
      src={usar ? urlOptimizada(src, ANCHOS.at(-1)) : src}
      srcSet={usar ? srcSetDe(src) : undefined}
      sizes={usar ? sizes : undefined}
      onError={e => { if (usar) setFallo(src); else onError?.(e) }}
    />
  )
}
