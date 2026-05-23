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
 * Exporta un catalogo PDF con los productos visibles.
 * Ropa separada por genero (Mujer, Hombre, Unisex), Padel aparte.
 */
export async function exportCatalogPdf(products, onProgress) {
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
  const other    = visible.filter(p => p.categoria !== 'ropa' && p.categoria !== 'padel')

  const sections = []
  if (ropaFem.length)  sections.push({ title: 'Ropa Mujer',   items: ropaFem })
  if (ropaMasc.length) sections.push({ title: 'Ropa Hombre',  items: ropaMasc })
  if (ropaUni.length)  sections.push({ title: 'Ropa Unisex',  items: ropaUni })
  if (ropaSin.length)  sections.push({ title: 'Ropa',         items: ropaSin })
  if (padel.length)    sections.push({ title: 'Padel',        items: padel })
  if (other.length)    sections.push({ title: 'Otros',        items: other })

  // ── Layout ──
  const cols = 2
  const hGap = 6                               // espacio horizontal entre columnas
  const cardW = (contentW - hGap) / cols
  const imgH = cardW                           // ratio 1:1 (cuadrado)
  const infoH = 20
  const cardH = imgH + infoH
  const rows = 2                               // 2 filas × 2 cols = 4 productos/pagina
  const sectionHeaderH = 22
  const contHeaderH = 10

  // Calcular gap vertical dinamico para llenar la pagina sin espacio blanco
  const firstAvail = maxY - (sectionHeaderH + 2)
  const contAvail  = maxY - (contHeaderH + 2)
  const firstVGap  = (firstAvail - rows * cardH) / (rows + 1)   // gap arriba, entre filas, abajo
  const contVGap   = (contAvail  - rows * cardH) / (rows + 1)
  const firstPageStartY = sectionHeaderH + 2 + firstVGap
  const contPageStartY  = contHeaderH + 2 + contVGap

  // ── Calcular paginas por seccion (para el indice) ──
  const sectionPages = []
  let simulatedPage = 2

  for (const section of sections) {
    sectionPages.push(simulatedPage)
    let y = firstPageStartY
    let col = 0
    let isFirst = true
    for (let i = 0; i < section.items.length; i++) {
      if (y + cardH > maxY) {
        simulatedPage++
        y = contPageStartY
        col = 0
        isFirst = false
      }
      col++
      if (col >= cols) {
        col = 0
        y += cardH + (isFirst ? firstVGap : contVGap)
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
    const logoH = logoW / logoAspect
    doc.addImage(logoMain.dataUrl, 'PNG', pageW / 2 - logoW / 2, 75, logoW, logoH)
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

    // Link clickeable a la pagina de la seccion
    doc.link(linkX, lineY - 5, linkW, 7, { pageNumber: sectionPages[i] })
  })

  // ── SECCIONES ──
  let processed = 0
  const total = visible.length

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]

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
      const iconH = 12
      const iconW = iconH * iconAspect
      doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW + 2, (sectionHeaderH - iconH) / 2, iconW, iconH)
    }

    let y = firstPageStartY
    let col = 0
    let isFirstPage = true

    for (const product of section.items) {
      const vGap = isFirstPage ? firstVGap : contVGap

      // Nueva pagina si no cabe
      if (y + cardH > maxY) {
        doc.addPage()

        // Mini header
        doc.setFillColor(240, 240, 240)
        doc.rect(0, 0, pageW, contHeaderH, 'F')
        doc.setTextColor(120, 120, 120)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${section.title} (cont.)`, margin, 7)

        if (logoIcon) {
          const iconAspect = logoIcon.width / logoIcon.height
          const iconH2 = 6
          const iconW2 = iconH2 * iconAspect
          doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW2 + 2, 2, iconW2, iconH2)
        }

        y = contPageStartY
        col = 0
        isFirstPage = false
      }

      const x = margin + col * (cardW + hGap)

      // ── Dibujar card ──
      // 1) Imagen con esquinas superiores redondeadas
      const imgUrl = product.imagenes?.[0] ?? product.imagen
      if (imgUrl) {
        const imgData = await loadImageRounded(imgUrl, 4)
        if (imgData) {
          doc.addImage(imgData.dataUrl, 'JPEG', x, y, cardW, imgH)
        } else {
          doc.setFillColor(230, 230, 230)
          doc.roundedRect(x, y, cardW, imgH, 3, 3, 'F')
        }
      } else {
        doc.setFillColor(230, 230, 230)
        doc.roundedRect(x, y, cardW, imgH, 3, 3, 'F')
      }

      // 2) Info box con fondo mas oscuro y esquinas inferiores redondeadas
      doc.setFillColor(232, 232, 232)
      bottomRoundedRect(doc, x, y + imgH, cardW, infoH, 3)

      // 3) Nombre del producto
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      const nombre = product.nombre.length > 40
        ? product.nombre.substring(0, 38) + '...'
        : product.nombre
      doc.text(nombre, x + 3, y + imgH + 6)

      // 4) Colores con circulos
      if (product.colores?.length > 0) {
        const colorY = y + imgH + 12
        let colorX = x + 3
        const circleR = 1.6
        const maxShow = 7

        const showing = product.colores.slice(0, maxShow)
        for (let ci = 0; ci < showing.length; ci++) {
          const colorName = showing[ci]
          const hex = COLOR_MAP[colorName] ?? '#e5e7eb'
          const [r, g, b] = hexToRgb(hex)

          doc.setDrawColor(180, 180, 180)
          doc.setLineWidth(0.2)
          doc.setFillColor(r, g, b)
          doc.circle(colorX + circleR, colorY, circleR, 'FD')

          doc.setTextColor(90, 90, 90)
          doc.setFontSize(5)
          doc.setFont('helvetica', 'normal')
          doc.text(colorName, colorX + circleR * 2 + 1, colorY + 1)

          const tw = doc.getTextWidth(colorName)
          colorX += circleR * 2 + 1 + tw + 2.5

          // Cortar si no cabe
          if (colorX > x + cardW - 10 && ci < showing.length - 1) {
            const left = product.colores.length - ci - 1
            if (left > 0) {
              doc.setTextColor(120, 120, 120)
              doc.text(`+${left}`, colorX, colorY + 1)
            }
            break
          }
        }

        if (product.colores.length > maxShow && colorX <= x + cardW - 10) {
          doc.setTextColor(120, 120, 120)
          doc.setFontSize(5)
          doc.text(`+${product.colores.length - maxShow}`, colorX, colorY + 1)
        }
      }

      // Siguiente posicion
      col++
      if (col >= cols) {
        col = 0
        y += cardH + vGap
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
    doc.text('Catalogo SARO - Precios y stock sujetos a disponibilidad', margin, pageH - 6)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(`${i}`, pageW - margin, pageH - 6, { align: 'right' })
  }

  // Guardar
  const fileName = `catalogo-saro-${now.toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}
