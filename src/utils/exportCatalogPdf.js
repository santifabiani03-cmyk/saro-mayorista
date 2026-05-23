import { jsPDF } from 'jspdf'
import { COLOR_MAP } from './colors'

/**
 * Carga una imagen desde URL y devuelve { dataUrl, width, height } o null.
 */
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
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
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
 * Exporta un catalogo PDF con los productos visibles.
 * Ropa separada por genero (Mujer, Hombre, Unisex), Padel aparte.
 * Sin precio ni descripcion.
 */
export async function exportCatalogPdf(products, onProgress) {
  const visible = products.filter(p => p.visible !== false)
  if (visible.length === 0) {
    alert('No hay productos visibles para exportar.')
    return
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 12
  const contentW = pageW - margin * 2

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

  // ── Layout config ──
  const cols = 2
  const gap = 8
  const cardW = (contentW - gap) / cols
  const imgH = cardW * 0.9
  const cardH = imgH + 20   // imagen + nombre + colores
  const sectionHeaderH = 22

  // ── Calcular paginas por seccion (para el indice) ──
  // Pagina 1 = portada, secciones empiezan en pagina 2+
  const sectionPages = []
  let simulatedPage = 2 // portada = 1

  for (const section of sections) {
    sectionPages.push(simulatedPage)
    let y = sectionHeaderH + 6  // despues del header (igual que en renderizado real)
    let col = 0
    for (let i = 0; i < section.items.length; i++) {
      if (y + cardH > pageH - margin) {
        simulatedPage++
        y = 16
        col = 0
      }
      col++
      if (col >= cols) {
        col = 0
        y += cardH + gap
      }
    }
    simulatedPage++ // nueva pagina para siguiente seccion
  }

  // ── PORTADA ──
  doc.setFillColor(17, 24, 39)
  doc.rect(0, 0, pageW, pageH, 'F')

  // Logo centrado, manteniendo proporciones, con transparencia (PNG)
  if (logoMain) {
    const logoAspect = logoMain.width / logoMain.height
    const logoW = 100
    const logoH = logoW / logoAspect
    doc.addImage(logoMain.dataUrl, 'PNG', pageW / 2 - logoW / 2, 75, logoW, logoH)
  }

  // Subtitulo
  const logoBottom = logoMain ? 75 + (100 / (logoMain.width / logoMain.height)) + 12 : 130

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Catalogo de Productos', pageW / 2, logoBottom, { align: 'center' })

  // Fecha completa
  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  const now = new Date()
  const fechaCompleta = now.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(fechaCompleta, pageW / 2, logoBottom + 10, { align: 'center' })

  doc.setFontSize(9)
  doc.text(`${visible.length} productos`, pageW / 2, logoBottom + 18, { align: 'center' })

  // ── Indice en la parte inferior de la portada ──
  const idxStartY = pageH - 30 - sections.length * 8
  doc.setFillColor(255, 255, 255, 0.08)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('INDICE', pageW / 2, idxStartY - 6, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  sections.forEach((section, i) => {
    const lineY = idxStartY + i * 8 + 2
    // Nombre de seccion
    doc.setTextColor(220, 220, 220)
    doc.text(section.title, margin + 30, lineY)
    // Puntitos
    const dotsX1 = margin + 30 + doc.getTextWidth(section.title) + 3
    const dotsX2 = pageW - margin - 30 - 8
    doc.setTextColor(100, 100, 100)
    let dx = dotsX1
    while (dx < dotsX2) {
      doc.text('.', dx, lineY)
      dx += 2
    }
    // Numero de pagina
    doc.setTextColor(220, 220, 220)
    doc.text(`${sectionPages[i]}`, pageW - margin - 30, lineY, { align: 'right' })
  })

  // ── SECCIONES ──
  let processed = 0
  const total = visible.length
  let currentPage = 1 // portada

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]

    // Nueva pagina para la seccion
    doc.addPage()
    currentPage++

    // Header de seccion
    doc.setFillColor(17, 24, 39)
    doc.rect(0, 0, pageW, sectionHeaderH, 'F')

    // Titulo
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(section.title.toUpperCase(), margin, 15)

    // Logo SR en la esquina superior derecha
    if (logoIcon) {
      const iconAspect = logoIcon.width / logoIcon.height
      const iconH = 12
      const iconW = iconH * iconAspect
      doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW + 2, (sectionHeaderH - iconH) / 2, iconW, iconH)
    }

    let y = sectionHeaderH + 6
    let col = 0

    for (const product of section.items) {
      // Nueva pagina si no cabe
      if (y + cardH > pageH - margin) {
        doc.addPage()
        currentPage++

        // Mini header en continuacion
        doc.setFillColor(240, 240, 240)
        doc.rect(0, 0, pageW, 10, 'F')
        doc.setTextColor(120, 120, 120)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${section.title} (cont.)`, margin, 7)

        // Logo SR en mini header tambien
        if (logoIcon) {
          const iconAspect = logoIcon.width / logoIcon.height
          const iconH = 6
          const iconW = iconH * iconAspect
          doc.addImage(logoIcon.dataUrl, 'PNG', pageW - margin - iconW + 2, 2, iconW, iconH)
        }

        y = 16
        col = 0
      }

      const x = margin + col * (cardW + gap)

      // Fondo de la card
      doc.setFillColor(248, 248, 248)
      doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F')

      // Imagen
      const imgUrl = product.imagenes?.[0] ?? product.imagen
      if (imgUrl) {
        const imgData = await loadImage(imgUrl)
        if (imgData) {
          doc.addImage(imgData.dataUrl, 'PNG', x + 1, y + 1, cardW - 2, imgH - 2)
        } else {
          doc.setFillColor(230, 230, 230)
          doc.rect(x + 1, y + 1, cardW - 2, imgH - 2, 'F')
        }
      }

      // Nombre del producto
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      const nombre = product.nombre.length > 40
        ? product.nombre.substring(0, 38) + '...'
        : product.nombre
      doc.text(nombre, x + 3, y + imgH + 5)

      // Colores con circulos
      if (product.colores?.length > 0) {
        const colorY = y + imgH + 10
        let colorX = x + 3
        const circleR = 1.8
        const maxColorsToShow = 7

        const colorsToShow = product.colores.slice(0, maxColorsToShow)
        for (const colorName of colorsToShow) {
          const hex = COLOR_MAP[colorName] ?? '#e5e7eb'
          const [r, g, b] = hexToRgb(hex)

          // Borde gris claro
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.2)
          doc.setFillColor(r, g, b)
          doc.circle(colorX + circleR, colorY, circleR, 'FD')

          // Nombre del color al lado
          doc.setTextColor(120, 120, 120)
          doc.setFontSize(5)
          doc.setFont('helvetica', 'normal')
          doc.text(colorName, colorX + circleR * 2 + 1.2, colorY + 1.2)

          const textW = doc.getTextWidth(colorName)
          colorX += circleR * 2 + 1.2 + textW + 3

          // Si no cabe mas, agregar "+N" y cortar
          if (colorX > x + cardW - 12 && colorsToShow.indexOf(colorName) < colorsToShow.length - 1) {
            const remaining = product.colores.length - colorsToShow.indexOf(colorName) - 1
            if (remaining > 0) {
              doc.setTextColor(140, 140, 140)
              doc.setFontSize(5)
              doc.text(`+${remaining}`, colorX, colorY + 1.2)
            }
            break
          }
        }

        // Si hay mas colores que los mostrados
        if (product.colores.length > maxColorsToShow) {
          doc.setTextColor(140, 140, 140)
          doc.setFontSize(5)
          doc.text(`+${product.colores.length - maxColorsToShow}`, colorX, colorY + 1.2)
        }
      }

      // Siguiente posicion
      col++
      if (col >= cols) {
        col = 0
        y += cardH + gap
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
