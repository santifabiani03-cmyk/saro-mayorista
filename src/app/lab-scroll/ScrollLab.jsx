'use client'

/**
 * MAQUETA del nuevo hero con scroll cinematográfico.
 *
 * Sirve para validar el GUION (ritmo, recorrido de cámara, en qué momento entra
 * cada texto) con formas simples, antes de producir los assets 3D definitivos.
 *
 * Cómo está armado (importante):
 *   GSAP sólo anima UN número — el progreso del guion, de 0 a 1 — y los textos.
 *   Three.js lee ese número en cada frame y coloca todo en su lugar.
 * Se hace así porque la escena 3D carga de forma asíncrona: si GSAP animara los
 * objetos directamente, quedaría desincronizado según qué termine de cargar antes.
 */

import { useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// `at` = punto del guion (0 a 1) donde entra cada texto; `lado` deja libre el otro.
const ACTOS = [
  { at: 0.02, lado: 'izq', k: 'La marca',  t: 'Paletas que se sienten distinto', d: '15 años fabricando en Argentina.' },
  { at: 0.24, lado: 'der', k: 'El golpe',  t: 'Potencia que responde',           d: 'Carbono 12K: cada golpe vuelve.' },
  { at: 0.45, lado: 'izq', k: 'En vuelo',  t: 'De la cancha a tu casa',          d: 'Seguimos la pelota hasta tu pedido.' },
  { at: 0.66, lado: 'der', k: 'El envío',  t: 'Llega a todo el país',            d: 'Correo Argentino y vía Cargo.' },
  { at: 0.86, lado: 'izq', k: 'Tu pedido', t: 'Armalo en 2 minutos',             d: 'Elegís y cerramos por WhatsApp.' },
]

/** Progreso 0→1 dentro del tramo [a,b] del guion. */
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
const mix = (x, y, k) => x + (y - x) * k
const suave = k => k * k * (3 - 2 * k)

export default function ScrollLab() {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const mountRef = useRef(null)
  const progRef = useRef({ t: 0 })   // ← el único puente entre GSAP y Three

  // ── Escena 3D: lee progRef en cada frame ──
  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    import('three').then(THREE => {
      if (disposed) return
      const mount = mountRef.current
      if (!mount) return

      const W = () => mount.clientWidth || 1
      const H = () => mount.clientHeight || 1

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#eef2f8')

      const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200)
      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(W(), H())
      mount.appendChild(renderer.domElement)

      scene.add(new THREE.HemisphereLight('#ffffff', '#c3d1e5', 1.15))
      const sol = new THREE.DirectionalLight('#ffffff', 1.5)
      sol.position.set(4, 8, 6)
      scene.add(sol)

      // Piso (referencia visual para el pique)
      const piso = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({ color: '#2563EB', transparent: true, opacity: 0.14 })
      )
      piso.rotation.x = -Math.PI / 2
      piso.position.y = -3
      scene.add(piso)

      // Placeholders: brazo, paleta, pelota y paquete
      const brazo = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 2.4, 6, 12),
        new THREE.MeshStandardMaterial({ color: '#e8b48c' })
      )
      const paleta = new THREE.Group()
      const cara = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.16, 26),
        new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.2, roughness: 0.4 })
      )
      cara.rotation.x = Math.PI / 2
      const mango = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 1.1, 10),
        new THREE.MeshStandardMaterial({ color: '#0F172A' })
      )
      mango.position.y = -1.5
      paleta.add(cara, mango)

      const pelota = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 22, 16),
        new THREE.MeshStandardMaterial({ color: '#d4ff00' })
      )
      const paquete = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: '#c98b4b' })
      )
      scene.add(brazo, paleta, pelota, paquete)

      const onResize = () => {
        renderer.setSize(W(), H())
        camera.aspect = W() / H()
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(mount)

      let raf = 0
      const frame = () => {
        raf = requestAnimationFrame(frame)
        const t = progRef.current.t

        // ── El guion, escrito en función del progreso ──
        // 0.00–0.18 · la paleta se presenta
        // 0.18–0.30 · entra el brazo y prepara
        // 0.30–0.42 · el golpe: la pelota sale
        // 0.42–0.62 · POV: la cámara viaja con la pelota
        // 0.62–0.74 · pique y rebote
        // 0.74–0.88 · la pelota se vuelve paquete
        // 0.88–1.00 · el paquete se acomoda al costado
        const aPresenta = suave(seg(t, 0.00, 0.18))
        const aPrepara  = suave(seg(t, 0.18, 0.30))
        const aGolpe    = suave(seg(t, 0.30, 0.42))
        const aVuelo    = suave(seg(t, 0.42, 0.62))
        const aPique    = suave(seg(t, 0.62, 0.74))
        const aMorph    = suave(seg(t, 0.74, 0.88))
        const aFinal    = suave(seg(t, 0.88, 1.00))

        // Paleta: gira, amaga y golpea; después sale de cuadro
        paleta.position.set(mix(0, -5, aGolpe), 0.4, 0)
        paleta.rotation.y = mix(0.9 * aPresenta, -0.4, aPrepara)
        paleta.rotation.z = mix(mix(0, 0.85, aPrepara), -1.15, aGolpe)
        paleta.visible = aGolpe < 0.98

        // Brazo: aparece sólo para el golpe
        brazo.visible = aPrepara > 0.05 && aGolpe < 0.98
        brazo.rotation.z = Math.PI / 2.6
        brazo.position.set(mix(-6.5, -2.5, aPrepara) - 5 * aGolpe, -1.5, 0)

        // Pelota: sale del impacto, vuela, pica y rebota
        const enVuelo = aGolpe > 0.35 && aMorph < 0.5
        pelota.visible = enVuelo
        const px = mix(0, 7, aGolpe) + mix(0, 5, aVuelo) + 2 * aPique
        const pyVuelo = mix(0.4, 3.2, aGolpe) - 2.2 * aVuelo
        const pyPique = aPique < 0.5
          ? mix(pyVuelo, -2.6, aPique * 2)          // baja y toca el piso
          : mix(-2.6, 1.4, (aPique - 0.5) * 2)      // rebota hacia arriba
        pelota.position.set(px, aPique > 0 ? pyPique : pyVuelo, mix(0, -9, aVuelo))
        pelota.scale.setScalar(mix(1, 0.01, suave(seg(t, 0.76, 0.82))))
        pelota.rotation.x += 0.25

        // Paquete: crece donde quedó la pelota y se acomoda a un costado
        paquete.visible = aMorph > 0.1
        paquete.scale.setScalar(mix(0.01, 1, suave(seg(t, 0.78, 0.88))))
        paquete.position.set(mix(px, 10.5, aFinal), mix(1.4, 0.5, aFinal), mix(-9, -6.5, aFinal))
        paquete.rotation.set(0.22 * aMorph, mix(0, 0.9, aMorph) + 0.3 * aFinal, 0)

        // Cámara: arranca al frente, acompaña la pelota y termina mirando el paquete
        camera.position.set(
          mix(0, 4, aVuelo) + mix(0, 4.5, aFinal),
          mix(1.6, 1.4, aPresenta) + 1.4 * aVuelo - 0.6 * aPique,
          mix(9, 7.4, aPresenta) - 6 * aVuelo + 1.5 * aFinal
        )
        camera.lookAt(
          enVuelo ? pelota.position.x * 0.7 : (paquete.visible ? paquete.position.x * 0.8 : 0),
          0.4,
          enVuelo ? pelota.position.z * 0.6 : -3
        )

        renderer.render(scene, camera)
      }
      frame()

      // La escena ya ocupa su lugar: recién ahora ScrollTrigger puede medir bien
      ScrollTrigger.refresh()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        ;[piso, cara, mango, pelota, paquete, brazo].forEach(m => {
          m.geometry?.dispose(); m.material?.dispose()
        })
        renderer.dispose()
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      }
    })

    return () => { disposed = true; cleanup() }
  }, [])

  // ── Scroll: una timeline que sólo mueve el progreso y los textos ──
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stageRef.current,
        start: 'top top',
        end: '+=600%',     // cuánto hay que scrollear para recorrer el guion
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
      defaults: { ease: 'none' },   // con scrub nunca se usa easing
    })

    // El guion completo dura 1 unidad: así el `at` de cada texto es directo.
    tl.to(progRef.current, { t: 1, duration: 1 }, 0)

    gsap.set('.acto', { autoAlpha: 0, y: 26 })
    ACTOS.forEach((a, i) => {
      tl.to(`.acto-${i}`, { autoAlpha: 1, y: 0, duration: 0.05 }, a.at)
        .to(`.acto-${i}`, { autoAlpha: 0, y: -22, duration: 0.05 }, a.at + 0.14)
    })
  }, { scope: rootRef })

  return (
    <div ref={rootRef} className="bg-[#eef2f8]">
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-saro-dark/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur">
        MAQUETA · formas simples para validar el guion
      </div>

      <section ref={stageRef} className="lab-stage relative h-screen w-full overflow-hidden">
        <div ref={mountRef} className="absolute inset-0" />

        {ACTOS.map((a, i) => (
          <div
            key={i}
            className={`acto acto-${i} absolute top-1/2 -translate-y-1/2 w-[min(86vw,380px)] ${
              a.lado === 'izq' ? 'left-5 sm:left-16 text-left' : 'right-5 sm:right-16 text-right'
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[.32em] text-saro-blue mb-2">{a.k}</p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark tracking-tight leading-[1.05]">
              {a.t}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-3 leading-relaxed">{a.d}</p>
          </div>
        ))}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
          Scrolleá
        </div>
      </section>

      <section className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center px-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark tracking-tight">
            Acá sigue la página
          </h2>
          <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">
            Catálogos, cómo comprar, historia… El hero termina y el sitio continúa normal.
          </p>
        </div>
      </section>
    </div>
  )
}
