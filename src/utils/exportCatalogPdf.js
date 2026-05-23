import { jsPDF } from 'jspdf'

/**
 * Carga una imagen desde URL y la convierte a base64 dataURL.
 * Retorna null si falla.
 */
function loadImageAsBase64(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/**
 * Exporta un catálogo PDF con los productos visibles.
 * Muestra nombre + imagen principal. Sin precio ni descripción.
 *
 * @param {Array} products - Array completo de productos
 * @param {Function} onProgress - Callback (current, total) para mostrar progreso
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

  // ── Portada ──
  doc.setFillColor(17, 24, 39) // saro-dark
  doc.rect(0, 0, pageW, pageH, 'F')

  // Intentar cargar logo
  const logoData = await loadImageAsBase64('/assets/logo.png')
  if (logoData) {
    doc.addImage(logoData, 'PNG', pageW / 2 - 25, 90, 50, 50)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('SARO', pageW / 2, logoData ? 155 : 130, { align: 'center' })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text('Indumentaria Deportiva & Padel', pageW / 2, logoData ? 165 : 142, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(180, 180, 180)
  const dateStr = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  doc.text(`Catalogo Mayorista - ${dateStr}`, pageW / 2, logoData ? 178 : 158, { align: 'center' })
  doc.text(`${visible.length} productos`, pageW / 2, logoData ? 185 : 165, { align: 'center' })

  // ── Grid de productos: 2 columnas ──
  const cols = 2
  const gap = 8
  const cardW = (contentW - gap) / cols
  const imgH = cardW * 1.2  // aspect ratio de la imagen
  const cardH = imgH + 14   // imagen + espacio para nombre
  const startY = margin + 8

  let col = 0
  let y = startY
  let pageStarted = false

  // Separar por categoría
  const ropa = visible.filter(p => p.categoria === 'ropa')
  const padel = visible.filter(p => p.categoria === 'padel')
  const grouped = []
  if (ropa.length) grouped.push({ title: 'Ropa', items: ropa })
  if (padel.length) grouped.push({ title: 'Padel', items: padel })
  // Si hay productos sin categoría
  const other = visible.filter(p => p.categoria !== 'ropa' && p.categoria !== 'padel')
  if (other.length) grouped.push({ title: 'Otros', items: other })

  let processed = 0
  const total = visible.length

  for (const group of grouped) {
    // Nueva página para cada categoría
    doc.addPage()
    pageStarted = true

    // Header de categoría
    doc.setFillColor(17, 24, 39)
    doc.rect(0, 0, pageW, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(group.title.toUpperCase(), margin, 15)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`${group.items.length} productos`, pageW - margin, 15, { align: 'right' })

    y = 30
    col = 0

    for (const product of group.items) {
      // Verificar si necesitamos nueva página
      if (y + cardH > pageH - margin) {
        doc.addPage()
        // Mini header en continuación
        doc.setFillColor(240, 240, 240)
        doc.rect(0, 0, pageW, 10, 'F')
        doc.setTextColor(120, 120, 120)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${group.title} (cont.)`, margin, 7)
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
        const imgData = await loadImageAsBase64(imgUrl)
        if (imgData) {
          // Clip con bordes redondeados (simulado con rect)
          doc.addImage(imgData, 'JPEG', x + 1, y + 1, cardW - 2, imgH - 2)
        } else {
          // Placeholder
          doc.setFillColor(230, 230, 230)
          doc.rect(x + 1, y + 1, cardW - 2, imgH - 2, 'F')
          doc.setTextColor(180, 180, 180)
          doc.setFontSize(24)
          doc.text(product.emoji || '📦', x + cardW / 2, y + imgH / 2 + 4, { align: 'center' })
        }
      }

      // Nombre del producto
      doc.setTextColor(30, 30, 30)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      const nombre = product.nombre.length > 38
        ? product.nombre.substring(0, 36) + '...'
        : product.nombre
      doc.text(nombre, x + 3, y + imgH + 5)

      // Info secundaria (colores disponibles)
      if (product.colores?.length > 0) {
        doc.setTextColor(140, 140, 140)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        const coloresText = product.colores.length <= 4
          ? product.colores.join(' - ')
          : product.colores.slice(0, 3).join(' - ') + ` +${product.colores.length - 3}`
        doc.text(coloresText, x + 3, y + imgH + 10)
      }

      // Siguiente posición
      col++
      if (col >= cols) {
        col = 0
        y += cardH + gap
      }

      processed++
      if (onProgress) onProgress(processed, total)
    }
  }

  // ── Footer en última página ──
  const lastPageH = doc.internal.pageSize.getHeight()
  doc.setTextColor(160, 160, 160)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'SARO Mayorista - Precios y stock sujetos a disponibilidad - Consultas por WhatsApp',
    pageW / 2,
    lastPageH - 8,
    { align: 'center' }
  )

  // Guardar
  const fileName = `catalogo-saro-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fileName)
  return fileName
}
