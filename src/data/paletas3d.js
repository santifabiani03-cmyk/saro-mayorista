// Modelos 3D de las paletas (public/models/paletas/<slug>.glb + mini/<slug>.webp).
// Los genera archivo/paletas-v3 (fuera de git) desde las fotos reales. `productoId`
// es el id del producto en el catálogo: de ahí salen el nombre, el precio y el link.
// Medidas en milímetros, las del modelo. Varios modelos pueden ser colores del mismo producto.
// Sólo se publican las que tienen fotos de canto completas (lista en archivo/paletas-v3/FALTAN-CANTOS.txt):
// al llegar las fotos que faltan, se regenera el modelo y se suma el slug a COMPLETAS.
const COMPLETAS = new Set(['nexus-carbono', 'radian-roja'])

const TODAS = [
  { slug: 'suelta-roja-sr', productoId: 'p1791227089632', corto: 'Gold PRO', color: 'Rojo', largo: 455, ancho: 260, espesor: 38, grip: 126, agujeros: 52 },
  { slug: 'raptor', productoId: 'p1787353287653', corto: 'Raptor 12K', color: 'Rojo', largo: 455, ancho: 260, espesor: 38, grip: 126, agujeros: 60 },
  { slug: 'massive', productoId: 'p1787353465696', corto: 'Massive 12K', color: 'Naranja', largo: 455, ancho: 259, espesor: 38, grip: 121, agujeros: 64 },
  { slug: 'silver', productoId: 'p1787353539609', corto: 'Silver 12K', color: 'Rojo', largo: 455, ancho: 253, espesor: 38, grip: 116, agujeros: 60 },
  { slug: 'vortice-x', productoId: 'p1787353757330', corto: 'Vortice X', color: 'Azul', largo: 455, ancho: 260, espesor: 38, grip: 126, agujeros: 60 },
  { slug: 'vortice-blanca', productoId: 'p1787353757330', corto: 'Vortice X blanca', color: 'Blanco', largo: 455, ancho: 260, espesor: 38, grip: 136, agujeros: 60 },
  { slug: 'nexus-carbono', productoId: 'p1787356327294', corto: 'Nexus 12K', color: 'Carbono', largo: 455, ancho: 260, espesor: 38, grip: 120, agujeros: 52 },
  { slug: 'suelta-nexus-dorada', productoId: 'p1791227089634', corto: 'Nexus Fiberglass', color: 'Dorado', largo: 455, ancho: 260, espesor: 38, grip: 118, agujeros: 52 },
  { slug: 'flash-dorada', productoId: 'p1787355012462', corto: 'Flash 3K dorada', color: 'Dorado', largo: 455, ancho: 260, espesor: 38, grip: 135, agujeros: 58 },
  { slug: 'flash-fucsia', productoId: 'p1787355012462', corto: 'Flash 3K fucsia', color: 'Fucsia', largo: 455, ancho: 258, espesor: 38, grip: 116, agujeros: 44 },
  { slug: 'flash-fibra', productoId: 'p1791227089631', corto: 'Flash Fibra', color: 'Azul', largo: 455, ancho: 260, espesor: 38, grip: 119, agujeros: 60 },
  { slug: 'radian-roja', productoId: 'p1780084771974', corto: 'Radian Pro roja', color: 'Rojo', largo: 454, ancho: 260, espesor: 38, grip: 136, agujeros: 34 },
  { slug: 'radian-pro', productoId: 'p1780084771974', corto: 'Radian Pro', color: 'Azul', largo: 455, ancho: 260, espesor: 38, grip: 132, agujeros: 24 },
  { slug: 'max-carbono-12k', productoId: 'p1779916282248', corto: 'MAX 12K', color: 'Azul', largo: 455, ancho: 260, espesor: 38, grip: 130, agujeros: 53 },
  { slug: 'sr-junior-azul', productoId: 'p1779922130410', corto: 'SR Junior azul', color: 'Azul', largo: 445, ancho: 254, espesor: 38, grip: 130, agujeros: 52 },
  { slug: 'sr-junior-celeste', productoId: 'p1779922130410', corto: 'SR Junior celeste', color: 'Celeste', largo: 445, ancho: 254, espesor: 38, grip: 119, agujeros: 52 },
  { slug: 'sr-junior-rosa', productoId: 'p1779922130410', corto: 'SR Junior rosa', color: 'Rosa', largo: 445, ancho: 254, espesor: 38, grip: 125, agujeros: 52 },
  { slug: 'kids', productoId: 'p1787354132455', corto: 'Kids', color: 'Blanco', largo: 413, ancho: 227, espesor: 25, grip: 105, agujeros: 28 },
]

export const PALETAS_3D = TODAS.filter(p => COMPLETAS.has(p.slug))
