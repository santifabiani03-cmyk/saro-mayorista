'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

/**
 * VisorPaletas — las paletas en 3D en el catálogo de /paletas: se elige una, se
 * gira arrastrando y se mira de frente, de canto o por el grip, con la medida
 * de cada vista dibujada.
 *
 * Carga en etapas para no frenar el catálogo: three.js recién cuando el visor
 * está por entrar en pantalla y el navegador quedó libre, y cada modelo
 * (~500 KB) recién cuando se lo elige. Sin WebGL queda la foto de la paleta.
 *
 * `items`: los modelos de src/data/paletas3d.js ya cruzados con el catálogo
 * (nombre, precio, href, material). Lo arma CatalogView.
 */

// giro (rad), altura a la que mira la cámara y alto visible (m). El modelo mide lo que la paleta real.
const VISTAS = {
  frente: { giro: 0, y: -0.045, alto: 0.74, nombre: 'Frente' },
  canto: { giro: Math.PI / 2, y: -0.045, alto: 0.74, nombre: 'Canto' },
  grip: { giro: 0.5, y: -0.21, alto: 0.4, nombre: 'Grip' },
}
const SVG_NS = 'http://www.w3.org/2000/svg'
const pesos = n => '$' + Math.round(n).toLocaleString('es-AR')
const cm = mm => (mm / 10).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' cm'

export default function VisorPaletas({ items }) {
  const [indice, setIndice] = useState(0)
  const [vista, setVista] = useState('frente')
  const [cargando, setCargando] = useState(true)
  const [sin3d, setSin3d] = useState(false)
  const escenaRef = useRef(null)
  const lienzoRef = useRef(null)
  const cotasRef = useRef(null)
  const api = useRef(null)            // lo que la escena 3D le deja manejar a React
  const indiceRef = useRef(0)
  const actual = items[indice]

  useEffect(() => {
    const escena = escenaRef.current, lienzo = lienzoRef.current, cotas = cotasRef.current
    if (!escena || !lienzo || !items.length) return
    let vivo = true
    let limpiar = () => {}

    const arrancar = async () => {
      const [THREE, { GLTFLoader }, { RoomEnvironment }, { MeshoptDecoder }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/loaders/GLTFLoader.js'),
        import('three/examples/jsm/environments/RoomEnvironment.js'),
        import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      ])
      if (!vivo) return
      const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const celular = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768

      const render = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true })
      render.setPixelRatio(Math.min(window.devicePixelRatio, celular ? 1.5 : 2))
      render.toneMapping = THREE.NeutralToneMapping   // respeta el color de la foto (ACES corre los rojos a naranja)
      render.toneMappingExposure = 0.7   // medido: con 0,7 el brillo queda como en la foto
      const mundo = new THREE.Scene()
      const pmrem = new THREE.PMREMGenerator(render)
      mundo.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture
      const clave = new THREE.DirectionalLight(0xffffff, 1.6); clave.position.set(-1.2, 1.6, 2.2); mundo.add(clave)
      const contra = new THREE.DirectionalLight(0xdfe9ff, 0.9); contra.position.set(1.5, 0.6, -2); mundo.add(contra)
      const camara = new THREE.PerspectiveCamera(26, 1, 0.05, 20)
      const pivote = new THREE.Group(); mundo.add(pivote)

      const est = { giro: -0.5, giroMeta: 0, y: VISTAS.frente.y, alto: VISTAS.frente.alto, escala: 0.9, escalaMeta: 1, vel: 0, suelto: performance.now(), mece: 0, vista: 'frente' }

      const medir = () => {
        const w = escena.clientWidth || 1, h = escena.clientHeight || 1
        render.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(medir); ro.observe(escena); medir()

      const cargador = new GLTFLoader(); cargador.setMeshoptDecoder(MeshoptDecoder)
      const anis = render.capabilities.getMaxAnisotropy()
      const cache = new Map()
      const cargar = slug => {
        if (!cache.has(slug)) cache.set(slug, cargador.loadAsync(`/models/paletas/${slug}.glb`).then(g => {
          g.scene.traverse(o => {
            if (o.isMesh) for (const k of ['map', 'normalMap']) if (o.material[k]) o.material[k].anisotropy = anis
          })
          return g.scene
        }))
        return cache.get(slug)
      }

      // Cotas: reglas finas que acompañan a la paleta mientras está quieta en la vista
      let reglas = []
      const dibujarCotas = p => {
        cotas.replaceChildren(); reglas = []
        const L = p.largo / 2000, A = p.ancho / 2000, T = p.espesor / 2000, G = p.grip / 1000
        const def = [
          { vista: 'frente', a: [-A - 0.028, -L, 0], b: [-A - 0.028, L, 0], texto: cm(p.largo), lado: true },
          { vista: 'frente', a: [-A, L + 0.026, 0], b: [A, L + 0.026, 0], texto: cm(p.ancho), lado: false },
          { vista: 'canto', a: [0, L + 0.024, T], b: [0, L + 0.024, -T], texto: p.espesor + ' mm', lado: false },
          { vista: 'grip', a: [-0.05, -L, 0], b: [-0.05, -L + G, 0], texto: 'Grip ' + cm(p.grip), lado: true },
        ]
        for (const d of def) {
          const g = document.createElementNS(SVG_NS, 'g'); g.style.opacity = 0; g.style.transition = 'opacity .35s'
          const linea = tope => {
            const l = document.createElementNS(SVG_NS, 'line')
            l.setAttribute('stroke', '#0D1628'); l.setAttribute('stroke-width', tope ? 1.6 : 1.2)
            g.appendChild(l); return l
          }
          const t = document.createElementNS(SVG_NS, 'text'); t.textContent = d.texto
          t.setAttribute('text-anchor', d.lado ? 'end' : 'middle')
          t.setAttribute('style', 'font: 700 13px var(--font-titulo), Archivo, sans-serif; fill: #0D1628; paint-order: stroke; stroke: #F1F4F9; stroke-width: 5px; stroke-linejoin: round')
          g.appendChild(t); cotas.appendChild(g)
          reglas.push({ ...d, g, t, l: linea(false), ta: linea(true), tb: linea(true), a: new THREE.Vector3(...d.a), b: new THREE.Vector3(...d.b) })
        }
      }
      const v3 = new THREE.Vector3()
      const pantalla = p => {
        v3.copy(p).applyMatrix4(pivote.matrixWorld).project(camara)
        return [(v3.x * 0.5 + 0.5) * escena.clientWidth, (-v3.y * 0.5 + 0.5) * escena.clientHeight]
      }
      const pone = (l, a, b, c, d) => { l.setAttribute('x1', a); l.setAttribute('y1', b); l.setAttribute('x2', c); l.setAttribute('y2', d) }
      const moverCotas = () => {
        const d = est.giroMeta - VISTAS[est.vista].giro, vuelta = Math.PI * 2
        const cerca = Math.abs(est.giro - est.giroMeta) < 0.12 && Math.abs(d - Math.round(d / vuelta) * vuelta) < 0.06 && est.escala > 0.98
        for (const r of reglas) {
          const ver = cerca && r.vista === est.vista
          r.g.style.opacity = ver ? 1 : 0
          if (!ver) continue
          const [x1, y1] = pantalla(r.a), [x2, y2] = pantalla(r.b)
          const dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy) || 1, px = -dy / n * 6, py = dx / n * 6
          pone(r.l, x1, y1, x2, y2); pone(r.ta, x1 - px, y1 - py, x1 + px, y1 + py); pone(r.tb, x2 - px, y2 - py, x2 + px, y2 + py)
          if (r.lado) { r.t.setAttribute('x', Math.min(x1, x2) - 10); r.t.setAttribute('y', (y1 + y2) / 2 + 4) }
          else { r.t.setAttribute('x', (x1 + x2) / 2); r.t.setAttribute('y', Math.min(y1, y2) - 10) }
        }
      }

      let turno = 0
      const mostrar = async i => {
        const mio = ++turno, p = items[i]
        setCargando(true); est.escalaMeta = 0.9
        try {
          const modelo = await cargar(p.slug)
          if (!vivo || mio !== turno) return
          pivote.clear(); pivote.add(modelo)
          est.escalaMeta = 1
          dibujarCotas(p)
          setCargando(false)
          // con la paleta ya en pantalla, se adelanta la siguiente del riel
          if (items[i + 1]) cargar(items[i + 1].slug).catch(() => {})
        } catch (err) {
          console.error('No se pudo cargar el modelo 3D:', err)
          if (vivo && mio === turno) setSin3d(true)
        }
      }
      const ponerVista = v => {
        est.vista = v
        const vuelta = Math.PI * 2
        est.giroMeta = VISTAS[v].giro + Math.round((est.giro - VISTAS[v].giro) / vuelta) * vuelta
        est.vel = 0; est.suelto = performance.now()
      }
      api.current = { mostrar, ponerVista }

      // Arrastre con inercia
      let agarre = null
      const bajar = e => { agarre = { x: e.clientX, giro: est.giroMeta }; lienzo.setPointerCapture(e.pointerId); lienzo.style.cursor = 'grabbing' }
      const mover = e => {
        if (!agarre) return
        const nuevo = agarre.giro + (e.clientX - agarre.x) * 0.011
        est.vel = nuevo - est.giroMeta; est.giroMeta = nuevo
      }
      const soltar = () => { if (!agarre) return; agarre = null; lienzo.style.cursor = 'grab'; est.suelto = performance.now() }
      lienzo.addEventListener('pointerdown', bajar); lienzo.addEventListener('pointermove', mover)
      lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar)

      let visible = true, raf = 0, antes = performance.now()
      const cuadro = ahora => {
        if (!visible) { raf = 0; return }
        raf = requestAnimationFrame(cuadro)
        const dt = Math.min(0.05, (ahora - antes) / 1000); antes = ahora
        if (!agarre && Math.abs(est.vel) > 0.0004) { est.giroMeta += est.vel; est.vel *= 0.93 }
        // en reposo se mece apenas, para que el canto y el relieve del grip tomen luz
        const enReposo = !agarre && !quieto && Math.abs(est.vel) <= 0.0004 && ahora - est.suelto > 1800
        est.mece += ((enReposo ? 1 : 0) - est.mece) * (1 - Math.exp(-dt * 2))
        const k = 1 - Math.exp(-dt * 7), v = VISTAS[est.vista]
        est.giro += (est.giroMeta - est.giro) * k
        est.y += (v.y - est.y) * k
        est.alto += (v.alto - est.alto) * k
        est.escala += (est.escalaMeta - est.escala) * (1 - Math.exp(-dt * 10))
        pivote.rotation.y = est.giro + est.mece * 0.2 * Math.sin(ahora / 1900)
        pivote.rotation.x = -0.05
        pivote.scale.setScalar(est.escala)
        const angosto = Math.max(1, 0.46 / (est.alto * camara.aspect))   // en pantallas angostas se aleja para que entre el ancho
        const dist = (est.alto * angosto / 2) / Math.tan(THREE.MathUtils.degToRad(camara.fov / 2))
        camara.position.set(0, est.y + 0.03, dist); camara.lookAt(0, est.y, 0)
        render.render(mundo, camara)
        moverCotas()
      }
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        if (visible && !raf) { antes = performance.now(); raf = requestAnimationFrame(cuadro) }
      })
      io.observe(escena)

      limpiar = () => {
        cancelAnimationFrame(raf); ro.disconnect(); io.disconnect()
        lienzo.removeEventListener('pointerdown', bajar); lienzo.removeEventListener('pointermove', mover)
        lienzo.removeEventListener('pointerup', soltar); lienzo.removeEventListener('pointercancel', soltar)
        api.current = null
        cache.forEach(prom => prom.then(esc => esc.traverse(o => {
          if (!o.isMesh) return
          o.geometry.dispose(); o.material.map?.dispose(); o.material.normalMap?.dispose(); o.material.dispose()
        })).catch(() => {}))
        mundo.environment.dispose(); pmrem.dispose(); render.dispose()
      }
      mostrar(indiceRef.current)
    }

    // three.js se pide cuando el visor está cerca de la pantalla y el navegador quedó libre
    let espera = 0
    const cerca = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      cerca.disconnect()
      const ir = () => arrancar().catch(err => { console.error('Sin 3D:', err); if (vivo) setSin3d(true) })
      if ('requestIdleCallback' in window) espera = window.requestIdleCallback(ir, { timeout: 1500 })
      else espera = window.setTimeout(ir, 300)
    }, { rootMargin: '300px' })
    cerca.observe(escena)

    return () => {
      vivo = false; cerca.disconnect()
      if ('cancelIdleCallback' in window) window.cancelIdleCallback(espera); else window.clearTimeout(espera)
      limpiar()
    }
  }, [items])

  if (!items.length) return null

  const elegir = i => { indiceRef.current = i; setIndice(i); api.current?.mostrar(i) }
  const cambiarVista = v => { setVista(v); api.current?.ponerVista(v) }

  return (
    <section aria-label="Paletas en 3D" className="rounded-2xl border border-tinta-100/80 bg-white shadow-card overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] bg-gradient-to-b from-tinta-50 to-tinta-200/70">
        <div className="p-5 sm:p-8 flex flex-col gap-4 justify-center order-2 lg:order-1">
          <div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-saro-dark tracking-tight leading-[1.08]">Mirala en 3D antes de pedirla</h2>
            <p className="text-sm text-tinta-600 mt-2 leading-relaxed max-w-md">
              Elegí una paleta, girala con el dedo o el mouse y mirá el frente, el canto y el grip.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-tinta-200 p-4 sm:p-5 max-w-md" aria-live="polite">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-lg sm:text-xl font-extrabold text-saro-dark tracking-tight">{actual.nombre}</p>
              <p className="font-display text-lg font-extrabold text-saro-blue tabular-nums whitespace-nowrap">{pesos(actual.precio)}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {actual.material && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-saro-dark text-white">{actual.material}</span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-saro-light text-saro-blue border border-saro-line">{actual.color}</span>
            </div>
            <dl className="grid grid-cols-4 gap-2 mt-4">
              {[['Largo', cm(actual.largo)], ['Ancho', cm(actual.ancho)], ['Perfil', actual.espesor + ' mm'], ['Agujeros', actual.agujeros]].map(([k, v]) => (
                <div key={k} className="border-l-2 border-tinta-200 pl-2 min-w-0">
                  <dt className="text-[11px] text-tinta-500">{k}</dt>
                  <dd className="font-display text-sm font-bold text-saro-dark tabular-nums whitespace-nowrap">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={actual.href}
              className="mt-4 inline-flex items-center gap-2 bg-saro-dark hover:bg-saro-blue text-white font-bold text-sm px-5 py-3 rounded-xl transition-colors btn-press"
            >
              Ver esta paleta
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
              </svg>
            </Link>
          </div>
        </div>

        <div ref={escenaRef} className="relative h-[58vh] min-h-[380px] max-h-[560px] lg:h-[540px] order-1 lg:order-2">
          {sin3d ? (
            <img src={`/models/paletas/mini/${actual.slug}.webp`} alt={actual.nombre} className="absolute inset-0 m-auto max-h-[86%] mix-blend-multiply" />
          ) : (
            <div
              className="absolute left-1/2 bottom-[58px] w-[38%] h-[5%] -translate-x-1/2 pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, rgba(13,22,40,.26), rgba(13,22,40,0))' }}
            />
          )}
          <canvas
            ref={lienzoRef}
            hidden={sin3d}
            className="absolute inset-0 w-full h-full block cursor-grab"
            style={{ touchAction: 'pan-y' }}
            aria-label={`${actual.nombre} en 3D. Arrastrá para girarla.`}
          />
          <svg ref={cotasRef} className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" aria-hidden="true" />
          {!sin3d && cargando && (
            <span className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-tinta-600 bg-white/85 border border-tinta-200 px-3.5 py-2 rounded-full pointer-events-none">
              Cargando la paleta…
            </span>
          )}
          {!sin3d && (
            <div role="group" aria-label="Vista de la paleta" className="absolute left-1/2 bottom-2.5 -translate-x-1/2 flex gap-0.5 p-1 bg-white/90 border border-tinta-200 rounded-full">
              {Object.entries(VISTAS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={vista === k}
                  onClick={() => cambiarVista(k)}
                  className={`text-[13px] font-bold px-4 py-2 rounded-full transition-colors ${vista === k ? 'bg-saro-dark text-white' : 'text-tinta-600 hover:text-saro-dark'}`}
                >
                  {v.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div role="group" aria-label="Elegí una paleta" className="flex gap-1.5 overflow-x-auto px-3 sm:px-5 py-2.5 border-t border-tinta-100">
        {items.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            aria-pressed={i === indice}
            onClick={() => elegir(i)}
            className={`flex-none w-[88px] grid justify-items-center gap-1 px-1.5 pt-2 pb-2 rounded-xl border text-[11px] leading-tight font-semibold text-center transition-colors ${
              i === indice ? 'border-saro-dark text-saro-dark bg-tinta-50' : 'border-transparent text-tinta-600 hover:bg-tinta-50'
            }`}
          >
            <img src={`/models/paletas/mini/${p.slug}.webp`} alt="" loading="lazy" width="56" height="74" className="w-14 h-[74px] object-contain mix-blend-multiply" />
            <span>{p.corto}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
