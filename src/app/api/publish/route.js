import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { actualizarArchivo, ETIQUETAS } from '../../../utils/datos'

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

// ── Three-way merge por producto ──────────────────────────────────
// base:    lo que el usuario cargó cuando abrió el admin
// mine:    lo que el usuario quiere publicar (con sus ediciones)
// theirs:  lo que está publicado ahora (puede haber sido editado por otra persona)
//
// Resultado: lista fusionada donde los cambios de ambos se preservan.
// Conflicto real = ambos editaron el MISMO producto → gana el usuario que publica (mine).
function mergeProducts(base, mine, theirs) {
  const baseMap   = new Map(base.map(p => [p.id, p]))
  const mineMap   = new Map(mine.map(p => [p.id, p]))
  const theirsMap = new Map(theirs.map(p => [p.id, p]))

  const merged = []
  const mergeInfo = { added: 0, updated: 0, keptTheirs: 0, deletedByMe: 0, addedByOther: 0 }

  // 1. Recorrer todos los productos que están en "theirs" (versión publicada ahora)
  for (const [id, theirProd] of theirsMap) {
    const baseProd = baseMap.get(id)
    const myProd   = mineMap.get(id)

    if (!baseProd) {
      // Producto agregado por otra persona (no estaba cuando yo cargué)
      if (myProd) {
        // Yo también tengo este ID (raro, pero posible) → uso mi versión
        merged.push(myProd)
      } else {
        // Lo agregó otro → lo mantengo
        merged.push(theirProd)
        mergeInfo.addedByOther++
      }
    } else if (!myProd) {
      // Yo lo eliminé (estaba en base, pero no en mine)
      // → lo elimino, a menos que el otro lo haya modificado
      if (JSON.stringify(baseProd) !== JSON.stringify(theirProd)) {
        // El otro lo modificó después → lo mantengo para no perder sus cambios
        merged.push(theirProd)
        mergeInfo.keptTheirs++
      } else {
        mergeInfo.deletedByMe++
      }
    } else {
      // Existe en base, mine y theirs
      const iChangedIt   = JSON.stringify(baseProd) !== JSON.stringify(myProd)
      const theyChangedIt = JSON.stringify(baseProd) !== JSON.stringify(theirProd)

      if (iChangedIt) {
        // Yo lo modifiqué → uso mi versión (incluso si el otro también lo cambió)
        merged.push(myProd)
        mergeInfo.updated++
      } else if (theyChangedIt) {
        // Solo el otro lo modificó → uso la versión del otro
        merged.push(theirProd)
        mergeInfo.keptTheirs++
      } else {
        // Nadie lo cambió → uso cualquiera (son iguales)
        merged.push(theirProd)
      }
    }
  }

  // 2. Productos que yo agregué (están en mine pero no en base ni en theirs)
  for (const [id, myProd] of mineMap) {
    if (!baseMap.has(id) && !theirsMap.has(id)) {
      merged.push(myProd)
      mergeInfo.added++
    }
  }

  return { merged, mergeInfo }
}

export async function POST(request) {
  const correctPin = clean(process.env.ADMIN_PIN)
  if (!correctPin) {
    return NextResponse.json(
      { error: 'ADMIN_PIN no configurado en el servidor' },
      { status: 500 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const { products, baseProducts, pin } = body

  if (!pin || pin !== correctPin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!Array.isArray(products)) {
    return NextResponse.json(
      { error: 'Body debe tener { products: [...] }' },
      { status: 400 }
    )
  }

  try {
    let mergeInfo = null

    // Se guarda en la rama "datos" (no dispara deploy). Si otro guardado se
    // mete en el medio, actualizarArchivo vuelve a leer y rehace el merge.
    const finalProducts = await actualizarArchivo('catalogo', currentProducts => {
      if (!Array.isArray(currentProducts)) currentProducts = []

      // Una lista vacía casi siempre es un admin que no llegó a cargar el
      // catálogo (falló la red): publicarla borraría todos los productos.
      if (products.length === 0 && currentProducts.length > 0) {
        throw new Error('El admin no tiene productos cargados. Recargá la página antes de publicar.')
      }

      if (Array.isArray(baseProducts) && baseProducts.length > 0 && currentProducts.length > 0) {
        // Tenemos base → hacemos three-way merge
        const result = mergeProducts(baseProducts, products, currentProducts)
        mergeInfo = result.mergeInfo
        return result.merged
      }
      // Sin base (fallback legacy) → reemplazo directo como antes
      mergeInfo = null
      return products
    }, 'actualizar catalogo')

    // Las páginas vuelven a leer el catálogo en la próxima visita
    revalidateTag(ETIQUETAS.catalogo)

    return NextResponse.json({
      ok: true,
      merge: mergeInfo,
      totalProducts: finalProducts.length,
      // Lo que quedó publicado (con el merge aplicado): el admin lo usa como
      // nueva base sin tener que volver a pedirlo.
      products: finalProducts,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error desconocido' },
      { status: 500 }
    )
  }
}
