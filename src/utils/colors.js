export const COLOR_MAP = {
  'Negro':     '#1a1a1a',
  'Blanco':    '#f0f0f0',
  'Rojo':      '#dc2626',
  'Azul':      '#2563eb',
  'Verde':     '#16a34a',
  'Amarillo':  '#ca8a04',
  'Naranja':   '#ea580c',
  'Rosa':      '#ec4899',
  'Gris':      '#9ca3af',
  'Marino':    '#1e3a5f',
  'Celeste':   '#38bdf8',
  'Bordó':     '#881337',
  'Fucsia':    '#d946ef',
  'Violeta':   '#7c3aed',
  'Negro/Azul':'#1e40af',
  'Negro/Rojo':'#991b1b',
}

// Fondo claro para galería del modal
export const COLOR_BG_MAP = {
  'Negro':     '#374151',
  'Blanco':    '#f9fafb',
  'Rojo':      '#fef2f2',
  'Azul':      '#eff6ff',
  'Verde':     '#f0fdf4',
  'Amarillo':  '#fefce8',
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
  nuevo:      { label: 'Nuevo',      cls: 'bg-emerald-100 text-emerald-700' },
  destacado:  { label: 'Destacado',  cls: 'bg-amber-100   text-amber-700'   },
  oferta:     { label: 'Oferta',     cls: 'bg-red-100     text-red-600'     },
  sale:       { label: 'Sale',       cls: 'bg-red-500     text-white'       },
}

export const CATEGORIA_LABELS  = { ropa: '👕 Ropa', padel: '🏓 Pádel' }
export const GENERO_LABELS     = { masculino: 'Masculino', femenino: 'Femenino', unisex: 'Unisex' }
export const PARTE_LABELS      = {
  torso:     '👕 Torso',
  piernas:   '🩳 Piernas',
  pies:      '🧦 Pies',
  manos:     '🤚 Manos',
  accesorio: '🎒 Accesorio',
}

// ── Admin helpers ──────────────────────────────────────
export const PREDEFINED_COLORS = [
  'Negro','Blanco','Rojo','Azul','Verde','Amarillo',
  'Naranja','Rosa','Gris','Marino','Celeste','Bordó',
  'Fucsia','Violeta','Negro/Azul','Negro/Rojo',
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
  ropa:  { torso:'👕', piernas:'🩳', pies:'🧦', manos:'🧤', accesorio:'🎒' },
  padel: { manos:'🏓', accesorio:'🎾', torso:'🎽', piernas:'🩳', pies:'👟' },
}

export const getAutoEmoji = (categoria, parteCuerpo) =>
  AUTO_EMOJI[categoria]?.[parteCuerpo] ?? '📦'
