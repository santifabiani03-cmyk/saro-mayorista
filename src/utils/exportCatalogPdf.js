import { jsPDF } from 'jspdf'
import { COLOR_MAP } from './colors'
import orbitronBase64 from '../fonts/orbitron-base64'

/**
 * Carga una imagen y la devuelve con esquinas superiores redondeadas.
 * Las esquinas redondeadas se rellenan con blanco para que se fundan
 * con el fondo blanco de la pagina.
 */
function loadImageRounded(url, cornerPct = 3) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      const r = Math.round(w * cornerPct / 100)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      // Fondo blanco (se ve en las esquinas redondeadas)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)

      // Clip: esquinas superiores redondeadas, inferiores rectas
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(w - r, 0)
      ctx.quadraticCurveTo(w, 0, w, r)
      ctx.lineTo(w, h)
      ctx.lineTo(0, h)
      ctx.lineTo(0, r)
      ctx.quadraticCurveTo(0, 0, r, 0)
      ctx.closePath()
      ctx.clip()

      ctx.drawImage(img, 0, 0)

      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: w, height: h })
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Carga una imagen de paleta centrada con contain (sin recortar).
 * La imagen se dibuja centrada sobre un fondo con gradiente sutil,
 * con esquinas superiores redondeadas.
 */
function loadPaletaImage(url, targetW, targetH, cornerPct = 3) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const cw = Math.round(targetW * 4) // resolución interna
      const ch = Math.round(targetH * 4)
      const r = Math.round(cw * cornerPct / 100)

      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')

      // Fondo gradiente sutil
      const grad = ctx.createLinearGradient(0, 0, 0, ch)
      grad.addColorStop(0, '#f8f9fa')
      grad.addColorStop(0.5, '#ffffff')
      grad.addColorStop(1, '#f3f4f6')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, cw, ch)

      // Clip: esquinas superiores redondeadas
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(r, 0)
      ctx.lineTo(cw - r, 0)
      ctx.quadraticCurveTo(cw, 0, cw, r)
      ctx.lineTo(cw, ch)
      ctx.lineTo(0, ch)
      ctx.lineTo(0, r)
      ctx.quadraticCurveTo(0, 0, r, 0)
      ctx.closePath()
      ctx.clip()

      // Fondo nuevamente dentro del clip
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, cw, ch)

      // Calcular tamaño contain con padding
      const padding = cw * 0.08
      const availW = cw - padding * 2
      const availH = ch - padding * 2
      const imgAspect = img.naturalWidth / img.naturalHeight
      const areaAspect = availW / availH

      let drawW, drawH
      if (imgAspect > areaAspect) {
        drawW = availW
        drawH = availW / imgAspect
      } else {
        drawH = availH
        drawW = availH * imgAspect
      }

      const drawX = (cw - drawW) / 2
      const drawY = (ch - drawH) / 2

      // Sombra sutil
      ctx.shadowColor = 'rgba(0,0,0,0.12)'
      ctx.shadowBlur = cw * 0.04
      ctx.shadowOffsetY = cw * 0.02

      ctx.drawImage(img, drawX, drawY, drawW, drawH)
      ctx.restore()

      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.90), width: cw, height: ch })
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Carga imagen sin modificar (para logos). */
function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      try {
        resolve({ dataUrl: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight })
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Genera un circulo partido en diagonal (135°) como dataURL PNG.
 * Se usa para colores compuestos tipo "Negro/Azul" en el PDF.
 */
function makeSplitCircle(hexA, hexB, size = 64) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const r = size / 2

  // Clip circular
  ctx.beginPath()
  ctx.arc(r, r, r, 0, Math.PI * 2)
  ctx.clip()

  // Color A — llena todo el circulo
  ctx.fillStyle = hexA
  ctx.fillRect(0, 0, size, size)

  // Color B — triangulo inferior-derecho
  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(size, size)
  ctx.lineTo(0, size)
  ctx.closePath()
  ctx.fillStyle = hexB
  ctx.fill()

  return canvas.toDataURL('image/png')
}

/** Convierte hex (#rrggbb) a [r, g, b] */
function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/**
 * Dibuja un rectangulo con solo las esquinas inferiores redondeadas.
 */
function bottomRoundedRect(doc, x, y, w, h, r) {
  doc.roundedRect(x, y - r, w, h + r, r, r, 'F')
  doc.rect(x, y - r, w, r, 'F') // tapa las esquinas superiores
}

/**
 * Dibuja los circulos de color para un producto en el PDF.
 */
function drawColorCircles(doc, product, x, y, maxWidth) {
  if (!product.colores?.length) return

  let colorX = x
  const circleR = 1.6
  const maxShow = 7
  const showing = product.colores.slice(0, maxShow)

  for (let ci = 0; ci < showing.length; ci++) {
    const colorName = showing[ci]
    const cx = colorX + circleR
    const cy = y

    if (colorName.includes('/')) {
      const [partA, partB] = colorName.split('/')
      const hexA = COLOR_MAP[partA.trim()] ?? '#e5e7eb'
      const hexB = COLOR_MAP[partB.trim()] ?? '#e5e7eb'
      const swatchImg = makeSplitCircle(hexA, hexB)
      const diam = circleR * 2
      doc.addImage(swatchImg, 'PNG', cx - circleR, cy - circleR, diam, diam)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.circle(cx, cy, circleR, 'S')
    } else {
      const hex = COLOR_MAP[colorName] ?? '#e5e7eb'
      const [r, g, b] = hexToRgb(hex)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.2)
      doc.setFillColor(r, g, b)
      doc.circle(cx, cy, circleR, 'FD')
    }

    doc.setTextColor(90, 90, 90)
    doc.setFontSize(5)
    doc.setFont('helvetica', 'normal')
    doc.text(colorName, colorX + circleR * 2 + 1, y + 1)

    const tw = doc.getTextWidth(colorName)
    colorX += circleR * 2 + 1 + tw + 2.5

    if (colorX > x + maxWidth - 10 && ci < showing.length - 1) {
      const left = product.colores.length - ci - 1
      if (left > 0) {
        doc.setTextColor(120, 120, 120)
        doc.text(`+${left}`, colorX, y + 1)
      }
      break
    }
  }

  if (product.colores.length > maxShow && colorX <= x + maxWidth - 10) {
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(5)
    doc.text(`+${product.colores.length - maxShow}`, colorX, y + 1)
  }
}

/**
 * Exporta un catalogo PDF con los productos visibles.
 * Ropa separada por genero (Mujer, Hombre, Unisex), Padel y Paletas aparte.
 */
export async function exportCatalogPdf(products, onProgress, { skipDownload = false } = {}) {
  const visible = products.filter(p => p.visible !== false)
  if (visible.length === 0) {
    alert('No hay productos visibles para exportar.')
    return
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Registrar fuente Orbitron ──
  doc.addFileToVFS('Orbitron.ttf', orbitronBase64)
  doc.addFont('Orbitron.ttf', 'Orbitron', 'normal')

  const pageW = 210
  const pageH = 297
  const margin = 12
  const contentW = pageW - margin * 2
  const maxY = pageH - 14  // espacio para footer

  // ── Precargar logos ──
  const logoMain = await loadImage('/assets/logo.png')
  const logoIcon = await loadImage('/assets/logo-icon.png')

  // ── Agrupar productos ──
  const ropaFem  = visible.filter(p => p.categoria === 'ropa' && p.genero === 'femenino')
  const ropaMasc = visible.filter(p => p.categoria === 'ropa' && p.genero === 'masculino')
  const ropaUni  = visible.filter(p => p.categoria === 'ropa' && p.genero === 'unisex')
  const ropaSin  = visible.filter(p => p.categoria === 'ropa' && !p.genero)
  const padel    = visible.filter(p => p.categoria === 'padel')
  const paletas  = visible.filter(p => p.categoria === 'paleta')
  const other    = visible.filter(p => !['ropa','padel','paleta'].includes(p.categoria))

  const sections = []
  if (ropaFem.length)  sections.push({ title: 'Ropa Mujer',   items: ropaFem,  type: 'standard' })
  if (ropaMasc.length) sections.push({ title: 'Ropa Hombre',  items: ropaMasc, type: 'standard' })
  if (ropaUni.length)  sections.push({ title: 'Ropa Unisex',  items: ropaUni,  type: 'standard' })
  if (ropaSin.length)  sections.push({ title: 'Ropa',         items: ropaSin,  type: 'standard' })
  if (padel.length)    sections.push({ title: 'Padel',        items: padel,    type: 'standard' })
  if (paletas.length)  sections.push({ title: 'Paletas',      items: paletas,  type: 'paleta'   })
  if (other.length)    sections.push({ title: 'Otros',        items: other,    type: 'standard' })

  // ── Layout estándar (ropa/padel) ──
  const cols = 2
  const hGap = 6
  const cardW = (contentW - hGap) / cols
  const imgH = cardW                           // ratio 1:1
  const infoH = 20
  const cardH = imgH + infoH
  const rows = 2
  const sectionHeaderH = 22
  const contHeaderH = 10

  // ── Layout paletas: 2 columnas, imagen más alta (3:4) ──
  const paletaImgH = cardW * 1.25              // aspect 3:4
  const paletaInfoH = 22
  const paletaCardH = paletaImgH + paletaInfoH
  const paletaRows = 2

  // Gap vertical dinámico
  const firstAvail = maxY - (sectionHeaderH + 2)
  const contAvail  = maxY - (contHeaderH + 2)

  const firstVGap  = (firstAvail - rows * cardH) / (rows + 1)
  const contVGap   = (contAvail  - rows * cardH) / (rows + 1)
  const firstPageStartY = sectionHeaderH + 2 + firstVGap
  const contPageStartY  = contHeaderH + 2 + contVGap

  const paletaFirstVGap  = (firstAvail - paletaRows * paletaCardH) / (paletaRows + 1)
  const paletaContVGap   = (contAvail  - paletaRows * paletaCardH) / (paletaRows + 1)
  const paletaFirstStartY = sectionHeaderH + 2 + paletaFirstVGap
  const paletaContStartY  = contHeaderH + 2 + paletaContVGap

  // ── Calcular paginas por seccion (para el indice) ──
  const sectionPages = []
  let simulatedPage = 2

  for (const section of sections) {
    sectionPages.push(simulatedPage)
    const isPaleta = section.type === 'paleta'
    const cH = isPaleta ? paletaCardH : cardH
    const startY = isPaleta ? paletaFirstStartY : firstPageStartY
    const contSY = isPaleta ? paletaContStartY : contPageStartY
    const vg1 = isPaleta ? paletaFirstVGap : firstVGap
    const vg2 = isPaleta ? paletaContVGap : contVGap

    let y = startY
    let col = 0
    let isFirst = true
    for (let i = 0; i < section.items.length; i++) {
      if (y + cH > maxY) {
        simulatedPage++
        y = contSY
        col = 0
        isFirst = false
      }
      col++
      if (col >= cols) {
        col = 0
        y += cH + (isFirst ? vg1 : vg2)
      }
    }
    simulatedPage++
  }

  // ── PORTADA ──
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, pageW, pageH, 'F')

  if (logoMain) {
    const logoAspect = logoMain.width / logoMain.height
    const logoW = 100
    const logoH2 = logoW / logoAspect
    doc.addImage(logoMain.dataUrl, 'PNG', pageW / 2 - logoW / 2, 75, logoW, logoH2)
  }

  const logoBottom = logoMain ? 75 + (100 / (logoMain.width / logoMain.height)) + 12 : 130

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('Orbitron', 'normal')
  doc.text('CATALOGO DE PRODUCTOS', pageW / 2, logoBottom, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  const now = new Date()
  const fechaCompleta = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(fechaCompleta, pageW / 2, logoBottom + 10, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`${visible.length} productos`, pageW / 2, logoBottom + 18, { align: 'center' })

  // ── Indice con links clickeables ──
  const idxStartY = pageH - 30 - sections.length * 8

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('Orbitron', 'normal')
  doc.text('INDICE', pageW / 2, idxStartY - 6, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  sections.forEach((section, i) => {
    const lineY = idxStartY + i * 8 + 2
    const linkX = margin + 30
    const linkW = pageW - margin * 2 - 60

    doc.setTextColor(220, 220, 220)
    doc.text(section.title, linkX, lineY)

    const dotsX1 = linkX + doc.getTextWidth(section.title) + 3
    const dotsX2 = pageW - margin - 30 - 8
    doc.setTextColor(100, 100, 100)
    let dx = dotsX1
    while (dx < dotsX2) {
      doc.text('.', dx, lineY)
      dx += 2
    }

    doc.setTextColor(220, 220, 220)
    doc.text(`${sectionPages[i]}`, pageW - margin - 30, lineY, { align: 'right' })

    doc.link(linkX, lineY - 5, linkW, 7, { pageNumber: sectionPages[i] })
  })

  // ── SECCIONES ──
  let processed = 0
  const total = visible.length

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]
    const isPaletaSection = section.type === 'paleta'
    const cH   = isPaletaSection ? paletaCardH   : cardH
    const iH   = isPaletaSection ? paletaImgH    : imgH
    const nfoH = isPaletaSection ? paletaInfoH   : infoH
    const vg1  = isPaletaSection ? paletaFirstVGap : firstVGap
    const vg2  = isPaletaSection ? paletaContVGap  : contVGap
    const startY = isPaletaSection ? paletaFirstStartY : firstPageStartY
    const contSY = isPaletaSection ? paletaContStartY  : contPageStartY

    doc.addPage()

    // Header de seccion
    doc.setFillColor(17, 24, 39)
    doc.rect(0, 0, pageW, sectionHeaderH, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('Orbitron', 'normal')
    doc.text(section.title.toUpperCase(), margin, 15)

    if (logoIcon) {
      const iconAspect = logoIcon.width / logoIcon.height
      const iconH2 = 12
      const iconW2 = iconH2 * iconAspect
      doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW2 + 2, (sectionHeaderH - iconH2) / 2, iconW2, iconH2)
    }

    let y = startY
    let col = 0
    let isFirstPage = true

    for (const product of section.items) {
      const vGap = isFirstPage ? vg1 : vg2

      // Nueva pagina si no cabe
      if (y + cH > maxY) {
        doc.addPage()

        doc.setFillColor(240, 240, 240)
        doc.rect(0, 0, pageW, contHeaderH, 'F')
        doc.setTextColor(120, 120, 120)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${section.title} (cont.)`, margin, 7)

        if (logoIcon) {
          const iconAspect = logoIcon.width / logoIcon.height
          const iconH3 = 6
          const iconW3 = iconH3 * iconAspect
          doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW3 + 2, 2, iconW3, iconH3)
        }

        y = contSY
        col = 0
        isFirstPage = false
      }

      const x = margin + col * (cardW + hGap)

      // ── Dibujar card ──
      const imgUrl = product.imagenes?.[0] ?? product.imagen

      if (isPaletaSection) {
        // ═══ CARD PALETA: imagen contain con fondo gradiente ═══
        if (imgUrl) {
          const imgData = await loadPaletaImage(imgUrl, cardW, iH, 4)
          if (imgData) {
            doc.addImage(imgData.dataUrl, 'JPEG', x, y, cardW, iH)
          } else {
            doc.setFillColor(245, 245, 245)
            doc.roundedRect(x, y, cardW, iH, 3, 3, 'F')
          }
        } else {
          doc.setFillColor(245, 245, 245)
          doc.roundedRect(x, y, cardW, iH, 3, 3, 'F')
        }

        // Info box
        doc.setFillColor(240, 240, 240)
        bottomRoundedRect(doc, x, y + iH, cardW, nfoH, 3)

        // Nombre (más grande para paletas)
        doc.setTextColor(30, 30, 30)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        const nombre = product.nombre.length > 35
          ? product.nombre.substring(0, 33) + '...'
          : product.nombre
        doc.text(nombre, x + 3, y + iH + 6)

        // Colores en línea
        drawColorCircles(doc, product, x + 3, y + iH + 13, cardW)

        // "Ver →" alineado a la derecha
        doc.setTextColor(37, 99, 235) // saro-blue
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text('Ver →', x + cardW - 3, y + iH + 19, { align: 'right' })
      } else {
        // ═══ CARD ESTÁNDAR (ropa / padel) ═══
        if (imgUrl) {
          const imgData = await loadImageRounded(imgUrl, 4)
          if (imgData) {
            doc.addImage(imgData.dataUrl, 'JPEG', x, y, cardW, iH)
          } else {
            doc.setFillColor(230, 230, 230)
            doc.roundedRect(x, y, cardW, iH, 3, 3, 'F')
          }
        } else {
          doc.setFillColor(230, 230, 230)
          doc.roundedRect(x, y, cardW, iH, 3, 3, 'F')
        }

        // Info box
        doc.setFillColor(232, 232, 232)
        bottomRoundedRect(doc, x, y + iH, cardW, nfoH, 3)

        // Nombre
        doc.setTextColor(30, 30, 30)
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'bold')
        const nombre = product.nombre.length > 40
          ? product.nombre.substring(0, 38) + '...'
          : product.nombre
        doc.text(nombre, x + 3, y + iH + 6)

        // Colores
        drawColorCircles(doc, product, x + 3, y + iH + 12, cardW)
      }

      // Siguiente posicion
      col++
      if (col >= cols) {
        col = 0
        y += cH + vGap
      }

      processed++
      if (onProgress) onProgress(processed, total)
    }
  }

  // ── Footer en todas las paginas (excepto portada) ──
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setTextColor(160, 160, 160)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text('Catalogo SARO - Stock sujeto a disponibilidad', margin, pageH - 6)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i}`, pageW - margin, pageH - 6, { align: 'right' })
  }

  // Guardar localmente (si no se pidió skipDownload)
  const fileName = `catalogo-saro-${now.toISOString().slice(0, 10)}.pdf`
  if (!skipDownload) doc.save(fileName)

  // Devolver el doc para poder reutilizarlo
  return { fileName, doc }
}

/**
 * Genera el catálogo PDF y lo sube a GitHub (sin descargar).
 * Se llama automáticamente después de publicar.
 */
export async function uploadCatalogPdf(products, onProgress) {
  const visible = products.filter(p => p.visible !== false)
  if (visible.length === 0) return

  try {
    const result = await exportCatalogPdf(products, onProgress, { skipDownload: true })
    if (!result?.doc) return

    onProgress?.('Subiendo catálogo…')
    const pdfBase64 = result.doc.output('datauristring').split(',')[1]
    const pin = sessionStorage.getItem('saro_admin_pin') ?? ''
    const res = await fetch('/api/upload-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: pdfBase64, pin }),
    })
    const json = await res.json()
    if (!json.ok) throw new Error(json.error)
  } catch (e) {
    console.error('Error subiendo catálogo PDF:', e)
  }
}
