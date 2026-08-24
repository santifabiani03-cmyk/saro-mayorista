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
  { at: 0.01, lado: 'izq', k: 'La marca',  t: 'Paletas que se sienten distinto', d: '15 años fabricando en Argentina.' },
  { at: 0.30, lado: 'der', k: 'El golpe',  t: 'Potencia que responde',           d: 'Carbono 12K: cada golpe vuelve.' },
  { at: 0.48, lado: 'izq', k: 'En vuelo',  t: 'De la cancha a tu casa',          d: 'Seguimos la pelota hasta tu pedido.' },
  { at: 0.68, lado: 'der', k: 'El envío',  t: 'Llega a todo el país',            d: 'Correo Argentino y vía Cargo.' },
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

    Promise.all([
      import('three'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
    ]).then(([THREE, { GLTFLoader }, { MeshoptDecoder }, { RoomEnvironment }]) => {
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

      // Iluminación de entorno: el modelo real necesita reflejos para verse bien
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.add(new THREE.HemisphereLight('#ffffff', '#c3d1e5', 0.9))
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

      // Pared del fondo: es contra la que se juega, queda DETRÁS de la paleta.
      // Sirve de referencia para entender de dónde viene la pelota.
      const texCancha = new THREE.TextureLoader().load('/assets/fondo-cancha.webp')
      texCancha.colorSpace = THREE.SRGBColorSpace
      const pared = new THREE.Mesh(
        new THREE.PlaneGeometry(46, 20),
        new THREE.MeshStandardMaterial({ map: texCancha, roughness: 1 })
      )
      pared.position.set(0, 4, -16)
      scene.add(pared)
      const linea = new THREE.Mesh(
        new THREE.BoxGeometry(46, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: '#ffffff' })
      )
      linea.position.set(0, 0.6, -15.9)
      scene.add(linea)

      // Placeholders: brazo, paleta, pelota y paquete
      // Mano + antebrazo. Se arma como grupo para poder moverlo junto con la paleta.
      const piel = new THREE.MeshStandardMaterial({ color: '#d99b6c', roughness: 0.75 })
      const brazo = new THREE.Group()
      const antebrazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 2.2, 6, 14), piel)
      antebrazo.rotation.z = 0.5
      antebrazo.position.set(-1.05, -1.15, 0.15)
      const palma = new THREE.Mesh(new THREE.SphereGeometry(0.44, 18, 14), piel)
      palma.scale.set(1, 1.25, 0.72)
      const dedos = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.62, 5, 10), piel)
      dedos.rotation.x = Math.PI / 2
      dedos.position.set(0.06, 0.16, 0.34)
      const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.42, 5, 10), piel)
      pulgar.rotation.set(Math.PI / 2, 0, 0.5)
      pulgar.position.set(-0.05, -0.18, 0.3)
      brazo.add(antebrazo, palma, dedos, pulgar)
      // La paleta real del sitio. Mientras carga se muestra una silueta simple,
      // así el guion se puede seguir aunque el .glb tarde.
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

      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
      loader.load('/models/paleta-opt.glb', gltf => {
        if (disposed) return
        const modelo = gltf.scene
        const box = new THREE.Box3().setFromObject(modelo)
        const size = new THREE.Vector3(); box.getSize(size)
        const centro = new THREE.Vector3(); box.getCenter(centro)
        modelo.position.sub(centro)
        const cont = new THREE.Group()
        cont.add(modelo)
        cont.scale.setScalar(2.9 / size.y)   // alto aproximado al del placeholder
        paleta.add(cont)
        cara.visible = false                  // se van los placeholders
        mango.visible = false
      }, undefined, () => { /* si falla, queda la silueta simple */ })

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
        // 0.00–0.16 · la paleta espera quieta, de frente
        // 0.16–0.26 · entra la mano y la agarra
        // 0.26–0.36 · la pelota INGRESA desde la pared del fondo
        // 0.36–0.44 · el golpe
        // 0.44–0.62 · la pelota viene HACIA la cámara y la cámara retrocede
        // 0.62–0.74 · pique y rebote
        // 0.74–0.86 · se transforma en paquete (mismo lugar, transición limpia)
        // 0.86–1.00 · el paquete se acomoda al costado
        const aMano   = suave(seg(t, 0.16, 0.26))
        const aEntra  = suave(seg(t, 0.26, 0.36))
        const aGolpe  = suave(seg(t, 0.36, 0.44))
        const aVuelo  = suave(seg(t, 0.44, 0.62))
        const aPique  = suave(seg(t, 0.62, 0.74))
        const aMorph  = suave(seg(t, 0.74, 0.86))
        const aFinal  = suave(seg(t, 0.86, 1.00))

        // ── Paleta ──
        // Queda QUIETA hasta que la mano la toma (aMano). Recién ahí se prepara y golpea.
        paleta.position.set(mix(0, -0.6, aMano) - 4.5 * aVuelo, 0.4, 0)
        paleta.rotation.y = mix(0, -0.35, aMano)
        paleta.rotation.z = mix(mix(0, 0.8, aMano), -1.0, aGolpe)   // amaga y golpea
        paleta.visible = aVuelo < 0.9

        // ── Mano: entra desde abajo, toma el mango y de ahí acompaña a la paleta ──
        brazo.visible = aMano > 0.02 && aVuelo < 0.9
        // el mango de la paleta cae ~1.1 abajo de su centro
        const mangoX = paleta.position.x + Math.sin(paleta.rotation.z) * 1.1
        const mangoY = paleta.position.y - Math.cos(paleta.rotation.z) * 1.1
        brazo.position.set(
          mix(mangoX - 3.2, mangoX, aMano),
          mix(mangoY - 3.4, mangoY, aMano),
          0.35                                   // apenas adelante, para que no la tape la paleta
        )
        brazo.rotation.z = paleta.rotation.z     // gira con la paleta: se ve que la sostiene

        // ── Pelota ──
        // Entra desde la pared (z negativo) → la golpean → sale HACIA la cámara (z positivo).
        const yaEntro = aEntra > 0.01
        pelota.visible = yaEntro && aMorph < 0.55
        const zEntrada = mix(4.5, 0, aEntra)           // entra por el borde del cuadro, del lado de la cámara
        const zSalida  = mix(0, 11.5, aVuelo)           // la paleta la devuelve hacia el frente
        const pz = aGolpe > 0 ? zSalida : zEntrada
        const pxBall = mix(-3.8, 0, aEntra) + mix(0, 4, aVuelo) + 1.6 * aPique
        // altura: llega a la altura de la paleta, sale, y después cae para el pique
        const yAntes = mix(2.6, 0.5, aEntra)   // baja mientras se acerca
        const ySale  = mix(0.5, 1.8, aGolpe) - 0.8 * aVuelo
        const yPique = aPique < 0.5
          ? mix(ySale, -2.6, aPique * 2)                // cae y toca el piso
          : mix(-2.6, 1.2, (aPique - 0.5) * 2)          // rebota
        pelota.position.set(pxBall, aPique > 0 ? yPique : (aGolpe > 0 ? ySale : yAntes), pz)
        pelota.rotation.x += 0.3

        // ── Paquete: aparece exactamente donde está la pelota ──
        // La pelota se achica y el paquete crece en el MISMO tramo: la transición
        // queda limpia porque comparten lugar y no se pisan con otros movimientos.
        const cambio = suave(seg(t, 0.76, 0.84))
        pelota.scale.setScalar(1 - cambio)
        paquete.visible = cambio > 0.01
        paquete.scale.setScalar(cambio)
        paquete.position.set(
          mix(pelota.position.x, 9.5, aFinal),
          mix(pelota.position.y, 0.6, aFinal),
          mix(pelota.position.z, 10.5, aFinal)
        )
        paquete.rotation.set(0.18 * cambio, mix(0, 0.7, cambio) + 0.4 * aFinal, 0)

        // ── Cámara ──
        // Empieza de frente; cuando la pelota viene hacia ella, retrocede para que
        // se vea venir; al final se corre para dejar el paquete a un costado.
        camera.position.set(
          mix(0, 2.5, aFinal),
          mix(1.6, 2.2, aVuelo) - 0.7 * aPique + 0.2 * aFinal,
          mix(9, 8, aMano) + mix(0, 9, aVuelo) + 2.5 * aPique - 2 * aFinal
        )
        const mira = paquete.visible ? paquete.position : (pelota.visible ? pelota.position : paleta.position)
        camera.lookAt(mira.x * 0.85, mix(0.4, mira.y, 0.6), mira.z * 0.5)

        renderer.render(scene, camera)
      }
      frame()

      // La escena ya ocupa su lugar: recién ahora ScrollTrigger puede medir bien
      ScrollTrigger.refresh()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        ;[piso, pared, linea, cara, mango, pelota, paquete, antebrazo, palma, dedos, pulgar].forEach(m => {
          m.geometry?.dispose(); m.material?.dispose()
        })
        pmrem.dispose()
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
