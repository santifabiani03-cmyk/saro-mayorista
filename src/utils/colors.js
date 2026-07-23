export const COLOR_MAP = {
  'Negro':         '#1a1a1a',
  'Blanco':        '#f0f0f0',
  'Rojo':          '#dc2626',
  'Azul':          '#2563eb',
  'Verde':         '#16a34a',
  'Amarillo':      '#facc15',
  'Amarillo Fluo': '#d4ff00',
  'Naranja':       '#ea580c',
  'Rosa':          '#ec4899',
  'Gris':          '#9ca3af',
  'Marino':        '#1e3a5f',
  'Celeste':       '#38bdf8',
  'Bordó':         '#881337',
  'Fucsia':        '#d946ef',
  'Violeta':       '#7c3aed',
  'Negro/Azul':    '#1e40af',
  'Negro/Rojo':    '#991b1b',
}

// Fondo claro para galería del modal
export const COLOR_BG_MAP = {
  'Negro':     '#374151',
  'Blanco':    '#f9fafb',
  'Rojo':      '#fef2f2',
  'Azul':      '#eff6ff',
  'Verde':     '#f0fdf4',
  'Amarillo':      '#fefce8',
  'Amarillo Fluo': '#fefce8',
  'Naranja':   '#fff7ed',
  'Rosa':      '#fdf2f8',
  'Gris':      '#f9fafb',
  'Marino':    '#eff6ff',
  'Celeste':   '#f0f9ff',
  'Bordó':     '#fff1f2',
  'Fucsia':    '#fdf4ff',
  'Violeta':   '#f5f3ff',
  'Negro/Azul':'#eff6ff',
  'Negro/Rojo':'#fff1f2',
}

export const TAG_CONFIG = {
  nuevo:             { label: 'Nuevo',             cls: 'bg-emerald-500 text-white'  },
  destacado:         { label: 'Destacado',         cls: 'bg-amber-400   text-white'  },
  oferta:            { label: 'Oferta',            cls: 'bg-red-500     text-white'  },
  sale:              { label: 'Sale',              cls: 'bg-red-700     text-white'  },
  oferta_relampago:  { label: '⚡ Oferta Relámpago', cls: 'bg-orange-500 text-white' },
  stock_limitado:    { label: 'Stock Limitado',    cls: 'bg-purple-500  text-white'  },
  carbono:           { label: 'Carbono',           cls: 'tag-carbono text-white'     },
}

/** Devuelve el array de tags de un producto, compatible con el campo legacy `tag` (string).
 *  Filtra automaticamente la etiqueta "nuevo" si pasó más de 30 días desde fechaPublicacion. */
export const getProductTags = (p) => {
  let tags = Array.isArray(p.tags) && p.tags.length ? p.tags
           : p.tag ? [p.tag]
           : []

  if (tags.includes('nuevo') && p.fechaPublicacion) {
    const ms = Date.now() - new Date(p.fechaPublicacion).getTime()
    if (ms > 30 * 24 * 60 * 60 * 1000) {
      tags = tags.filter(t => t !== 'nuevo')
    }
  }

  return tags
}

export const CATEGORIA_LABELS  = { ropa: 'Ropa', padel: 'Accesorios', paleta: 'Paletas' }
export const GENERO_LABELS     = { masculino: 'Hombre', femenino: 'Mujer', unisex: 'Unisex' }
export const PARTE_LABELS      = {
  torso:     'Torso',
  piernas:   'Piernas',
  accesorio: 'Accesorio',
}

// ── Admin helpers ──────────────────────────────────────
export const PREDEFINED_COLORS = [
  'Negro','Blanco','Rojo','Azul','Verde','Amarillo',
  'Naranja','Rosa','Gris','Marino','Celeste','Bordó',
  'Fucsia','Violeta','Amarillo Fluo','Negro/Azul','Negro/Rojo',
]

export const PREDEFINED_TALLES = [
  'XS','S','M','L','XL','XXL',
  'Única','37-40','41-44','45-48','S/M','L/XL',
]

// Orden canónico de talles para mostrar en la matriz del modal
export const SIZE_ORDER = [
  'XS','S','S/M','M','L','L/XL','XL','XXL','XXXL',
  'Única','37-40','41-44','45-48',
]

export const AUTO_EMOJI = {
  ropa:   { torso:'👕', piernas:'🩳', pies:'🧦', manos:'🧤', accesorio:'🎒' },
  padel:  { manos:'🏓', accesorio:'🎾', torso:'🎽', piernas:'🩳', pies:'👟' },
  paleta: { accesorio:'🏓' },
}

export const getAutoEmoji = (categoria, parteCuerpo) =>
  AUTO_EMOJI[categoria]?.[parteCuerpo] ?? (categoria === 'paleta' ? '🏓' : '📦')

/** Devuelve el style object para un swatch de color.
 *  Para colores compuestos como "Negro/Azul" devuelve un degradado diagonal partido.
 *  Acepta un mapa opcional de definiciones custom (colorDefs del producto). */
export const getSwatchStyle = (colorName, colorDefs) => {
  // 1. Custom defs del producto (ej: { "Turquesa": ["Celeste"], "BiColor": ["Negro","Azul"] })
  if (colorDefs?.[colorName]) {
    const bases = colorDefs[colorName]
    if (bases.length === 1) return { backgroundColor: COLOR_MAP[bases[0]] ?? '#e5e7eb' }
    const ca = COLOR_MAP[bases[0]] ?? '#e5e7eb'
    const cb = COLOR_MAP[bases[1]] ?? '#e5e7eb'
    return { background: `linear-gradient(135deg, ${ca} 50%, ${cb} 50%)` }
  }
  // 2. Colores compuestos con "/"
  if (colorName.includes('/')) {
    const [a, b] = colorName.split('/')
    const ca = COLOR_MAP[a] ?? '#e5e7eb'
    const cb = COLOR_MAP[b] ?? '#e5e7eb'
    return { background: `linear-gradient(135deg, ${ca} 50%, ${cb} 50%)` }
  }
  // 3. Color simple
  return { backgroundColor: COLOR_MAP[colorName] ?? '#e5e7eb' }
}
