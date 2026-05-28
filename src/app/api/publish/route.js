import { NextResponse } from 'next/server'

const GITHUB_API = 'https://api.github.com'

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'saro-admin',
  }
}

function clean(val) {
  return (val ?? '').replace(/^﻿/, '').trim()
}

async function getFile(owner, repo, path, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { headers: ghHeaders(token) }
  )
  if (!res.ok) return null
  return res.json()
}

async function putFile(owner, repo, path, base64Content, message, token, sha) {
  const body = { message, content: base64Content, ...(sha && { sha }) }
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
    { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `GitHub API error ${res.status}`)
  }
}

async function deleteFile(owner, repo, path, token) {
  try {
    const file = await getFile(owner, repo, path, token)
    if (!file?.sha) return
    await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: ghHeaders(token),
        body: JSON.stringify({ message: `eliminar imagen: ${path}`, sha: file.sha }),
      }
    )
  } catch { /* best-effort */ }
}

function findOrphanedImages(oldProducts, newProducts) {
  const newIds = new Set(newProducts.map(p => p.id).filter(Boolean))
  const removed = oldProducts.filter(p => p.id && !newIds.has(p.id))
  const paths = []
  removed.forEach(p => {
    const imgs = p.imagenes?.length ? p.imagenes : p.imagen ? [p.imagen] : []
    imgs.forEach(img => {
      if (typeof img === 'string' && img.startsWith('/assets/')) {
        paths.push(`public${img}`)
      }
    })
  })
  return paths
}

// ── Three-way merge por producto ──────────────────────────────────
// base:    lo que el usuario cargó cuando abrió el admin
// mine:    lo que el usuario quiere publicar (con sus ediciones)
// theirs:  lo que está actualmente en GitHub (puede haber sido editado por otra persona)
//
// Resultado: lista fusionada donde los cambios de ambos se preservan.
// Conflicto real = ambos editaron el MISMO producto → gana el usuario que publica (mine).
function mergeProducts(base, mine, theirs) {
  const baseMap   = new Map(base.map(p => [p.id, p]))
  const mineMap   = new Map(mine.map(p => [p.id, p]))
  const theirsMap = new Map(theirs.map(p => [p.id, p]))

  const merged = []
  const mergeInfo = { added: 0, updated: 0, keptTheirs: 0, deletedByMe: 0, addedByOther: 0 }

  // 1. Recorrer todos los productos que están en "theirs" (versión actual de GitHub)
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

  const token = clean(process.env.GITHUB_TOKEN)
  const owner = clean(process.env.GITHUB_OWNER)
  const repo = clean(process.env.GITHUB_REPO)

  if (!token || !owner || !repo) {
    return NextResponse.json(
      { error: 'Faltan variables de entorno del servidor (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO)' },
      { status: 500 }
    )
  }

  if (!Array.isArray(products)) {
    return NextResponse.json(
      { error: 'Body debe tener { products: [...] }' },
      { status: 400 }
    )
  }

  try {
    const currentFile = await getFile(owner, repo, 'catalog/products.json', token)
    let currentProducts = []
    let orphanedPaths = []

    if (currentFile?.content) {
      try {
        const raw = Buffer.from(currentFile.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        currentProducts = JSON.parse(raw)
      } catch { /* si no se puede parsear, seguimos con array vacío */ }
    }

    // ── Merge o reemplazo directo ──
    let finalProducts
    let mergeInfo = null

    if (Array.isArray(baseProducts) && baseProducts.length > 0 && currentProducts.length > 0) {
      // Tenemos base → hacemos three-way merge
      const result = mergeProducts(baseProducts, products, currentProducts)
      finalProducts = result.merged
      mergeInfo = result.mergeInfo
    } else {
      // Sin base (fallback legacy) → reemplazo directo como antes
      finalProducts = products
    }

    orphanedPaths = findOrphanedImages(currentProducts, finalProducts)

    const json = JSON.stringify(finalProducts, null, 2)
    const base64 = Buffer.from(json, 'utf-8').toString('base64')
    await putFile(owner, repo, 'catalog/products.json', base64, 'actualizar catalogo', token, currentFile?.sha)

    if (orphanedPaths.length > 0) {
      await Promise.allSettled(
        orphanedPaths.map(path => deleteFile(owner, repo, path, token))
      )
    }

    return NextResponse.json({
      ok: true,
      deletedImages: orphanedPaths.length,
      merge: mergeInfo,
      totalProducts: finalProducts.length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e.message ?? 'Error desconocido' },
      { status: 500 }
    )
  }
}
