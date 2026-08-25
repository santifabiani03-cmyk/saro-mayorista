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

// Tramo del scroll en el que transcurre el golpe completo (para la animación mocap)

// Ajuste fino de la mano 3D: como el modelo viene con su propia orientación,
// estos valores son los que hay que tocar si el agarre no queda bien.
const MANO = {
  escala: 2.0,
  rot: [0, Math.PI / 2, Math.PI],   // gira el puño para que el hueco quede vertical
  offset: [0.05, -0.15, 0],         // corrimiento fino sobre el mango
}

/** Progreso 0→1 dentro del tramo [a,b] del guion. */
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)))
const mix = (x, y, k) => x + (y - x) * k
const suave = k => k * k * (3 - 2 * k)

/**
 * Altura de la pelota con física real: cae como parábola y cuando toca el piso
 * rebota más bajo (pierde energía, como una pelota de verdad).
 *   y0/v0 = altura y velocidad al salir · g = gravedad · e = cuánto rebota (0-1)
 */
function balistica(t, y0, v0, g, suelo, e) {
  let y = y0, v = v0, resto = t
  for (let i = 0; i < 6; i++) {
    const disc = v * v + 2 * g * (y - suelo)
    if (disc <= 0) break
    const tSuelo = (v + Math.sqrt(disc)) / g      // cuándo toca el piso
    if (resto < tSuelo) return y + v * resto - 0.5 * g * resto * resto
    resto -= tSuelo
    y = suelo
    v = Math.sqrt(disc) * e                        // rebota con menos fuerza
    if (v < 0.35) return suelo                     // ya casi no pica
  }
  return Math.max(suelo, y + v * resto - 0.5 * g * resto * resto)
}

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
      scene.fog = new THREE.Fog('#eef2f8', 20, 52)   // funde el fondo con el aire

      const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200)
      // preserveDrawingBuffer permite leer el cuadro ya dibujado (para inspeccionarlo)
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
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
        new THREE.PlaneGeometry(96, 42),
        new THREE.MeshStandardMaterial({ map: texCancha, roughness: 1, transparent: true, opacity: 0.55 })
      )
      pared.position.set(0, 8, -26)
      scene.add(pared)
      const linea = new THREE.Mesh(
        new THREE.BoxGeometry(96, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: '#ffffff' })
      )
      linea.position.set(0, 0.6, -25.9)
      scene.add(linea)

      // ── LA RED ──
      // Va ENTRE la paleta y la cámara: uno está en su lado de la cancha, la
      // pelota se devuelve por encima de la red y pica en el campo de enfrente.
      const RED_Z = 5.5, RED_ALTO = 1.5, SUELO_Y = -3
      const red = new THREE.Group()
      const matMalla = new THREE.MeshStandardMaterial({
        color: '#1b2b3d', roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
      })
      const malla = new THREE.Mesh(new THREE.PlaneGeometry(20, RED_ALTO), matMalla)
      malla.position.y = SUELO_Y + RED_ALTO / 2
      // cinta blanca del borde superior
      const cinta = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.16, 0.06),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
      )
      cinta.position.y = SUELO_Y + RED_ALTO
      const matPoste = new THREE.MeshStandardMaterial({ color: '#243447', roughness: 0.6, metalness: 0.3 })
      const posteIzq = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, RED_ALTO + 0.2, 10), matPoste)
      posteIzq.position.set(-10, SUELO_Y + (RED_ALTO + 0.2) / 2, 0)
      const posteDer = posteIzq.clone()
      posteDer.position.x = 10
      red.add(malla, cinta, posteIzq, posteDer)
      red.position.z = RED_Z
      scene.add(red)

      // Líneas de la cancha (dan referencia de profundidad al vuelo)
      const matLinea = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 })
      const lineas = new THREE.Group()
      ;[-12, -6, 12].forEach(z => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(20, 0.02, 0.14), matLinea)
        l.position.set(0, SUELO_Y + 0.02, RED_Z + z)
        lineas.add(l)
      })
      const central = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 24), matLinea)
      central.position.set(0, SUELO_Y + 0.02, RED_Z)
      lineas.add(central)
      scene.add(lineas)

      // Placeholders: paleta, pelota y paquete
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
      // Paquete real (Meshy, 79 KB) con el logo de la marca pegado en la cara.
      loader.load('/models/paquete.glb', gltf => {
        if (disposed) return
        const m = gltf.scene
        const bb = new THREE.Box3().setFromObject(m)
        const sz = new THREE.Vector3(); bb.getSize(sz)
        const ct = new THREE.Vector3(); bb.getCenter(ct)
        m.position.sub(ct)
        const cont = new THREE.Group()
        cont.add(m)
        const escala = 1.6 / Math.max(sz.x, sz.y, sz.z)
        cont.scale.setScalar(escala)

        // El logo va como calcomanía sobre la cara frontal: así queda nítido y
        // se puede ubicar con precisión, sin tocar la textura del modelo.
        const texLogo = new THREE.TextureLoader().load('/assets/logo-caja.png')
        texLogo.colorSpace = THREE.SRGBColorSpace
        const anchoCara = sz.x * escala
        const logo = new THREE.Mesh(
          new THREE.PlaneGeometry(anchoCara * 0.62, anchoCara * 0.62 * (180 / 900)),
          new THREE.MeshBasicMaterial({ map: texLogo, transparent: true, opacity: 0.85 })
        )
        logo.position.set(0, 0, sz.z * escala / 2 + 0.012)   // apenas sobre la cara
        cont.add(logo)

        paquete.add(cont)
        ;[caja, cintaH, cintaV, tapa].forEach(o => { o.visible = false })
      }, undefined, () => { /* si falla, queda la caja simple */ })

      // Mano generada con Meshy (101 KB ya optimizada). Si carga, reemplaza a la
      // mano de cápsulas; si falla, queda la simple y el guion sigue igual.

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

      // Pelota de pádel: fieltro (nada de brillo) y las costuras blancas curvas
      // ── LA PELOTA QUE SE VUELVE ENVÍO ──
      // No hay dos objetos que se intercambian: es UNA sola malla cuyos vértices
      // viajan de la esfera al cubo. Cada vértice se mueve por su propia dirección
      // hasta la cara del cubo (d / mayor componente), así la forma cambia de a
      // poco y sin saltos. Como las esquinas del cubo quedan MÁS lejos del centro
      // que la superficie de la esfera, la pelota nunca se achica: se expande
      // hacia las esquinas hasta volverse caja.
      const R_BOLA = 0.4
      const geoBola = new THREE.SphereGeometry(R_BOLA, 40, 30)
      const vertEsfera = Float32Array.from(geoBola.attributes.position.array)
      const vertCubo = new Float32Array(vertEsfera.length)
      for (let i = 0; i < vertEsfera.length; i += 3) {
        const x = vertEsfera[i], y = vertEsfera[i + 1], z = vertEsfera[i + 2]
        const L = Math.hypot(x, y, z) || 1
        const dx = x / L, dy = y / L, dz = z / L
        const may = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) || 1
        vertCubo[i] = (dx / may) * R_BOLA
        vertCubo[i + 1] = (dy / may) * R_BOLA
        vertCubo[i + 2] = (dz / may) * R_BOLA
      }
      // colores entre los que viaja la superficie: fieltro → cartón
      const COLOR_FIELTRO = new THREE.Color('#d8e83c')
      const COLOR_CARTON = new THREE.Color('#c69a6b')

      const pelota = new THREE.Group()
      const matFieltro = new THREE.MeshStandardMaterial({
        color: '#d8e83c', roughness: 0.95, metalness: 0,
      })
      const bola = new THREE.Mesh(geoBola, matFieltro)
      const geoCostura = new THREE.TorusGeometry(0.395, 0.028, 10, 48)
      const matCostura = new THREE.MeshStandardMaterial({ color: '#fdfdf5', roughness: 0.85 })
      const costuraA = new THREE.Mesh(geoCostura, matCostura)
      costuraA.rotation.set(Math.PI / 2, 0, 0)
      costuraA.position.y = 0.12
      costuraA.scale.set(0.93, 0.93, 1)
      const costuraB = new THREE.Mesh(geoCostura, matCostura)
      costuraB.rotation.set(Math.PI / 2, 0, 0)
      costuraB.position.y = -0.12
      costuraB.scale.set(0.93, 0.93, 1)
      pelota.add(bola, costuraA, costuraB)

      // k = 0 pelota · k = 1 caja. Mueve los vértices y el color a la vez.
      const posBola = geoBola.attributes.position
      let kAnterior = -1
      const transformar = (k) => {
        if (Math.abs(k - kAnterior) < 0.002) return
        kAnterior = k
        const a = posBola.array
        for (let i = 0; i < a.length; i++) a[i] = vertEsfera[i] + (vertCubo[i] - vertEsfera[i]) * k
        posBola.needsUpdate = true
        geoBola.computeVertexNormals()
        matFieltro.color.copy(COLOR_FIELTRO).lerp(COLOR_CARTON, k)
        matFieltro.roughness = mix(0.95, 0.92, k)
        // las costuras se borran en la primera mitad: son de la pelota, no de la caja
        const vc = Math.max(0, 1 - k * 2)
        matCostura.opacity = vc
        costuraA.visible = costuraB.visible = vc > 0.02
      }
      matCostura.transparent = true
      // Los detalles del envío (cintas + etiqueta) NO son otra caja: se apoyan
      // sobre la misma malla que antes era pelota, y aparecen recién cuando la
      // forma ya es cúbica. Así nunca hay dos objetos pisándose.
      const paquete = new THREE.Group()
      const L = R_BOLA * 2                       // la caja mide esto de cara a cara
      const matCinta = new THREE.MeshStandardMaterial({
        color: '#e8d9bd', roughness: 0.7, transparent: true, opacity: 0,
      })
      const geoCintaH = new THREE.BoxGeometry(L * 1.02, L * 0.17, L * 1.02)
      const cintaH = new THREE.Mesh(geoCintaH, matCinta)
      const geoCintaV = new THREE.BoxGeometry(L * 0.17, L * 1.02, L * 1.02)
      const cintaV = new THREE.Mesh(geoCintaV, matCinta)
      // etiqueta con el logo, en una cara
      const matEtiqueta = new THREE.MeshStandardMaterial({
        color: '#f3efe6', roughness: 0.9, transparent: true, opacity: 0,
      })
      const caja = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.44, L * 0.3), matEtiqueta)
      caja.position.z = L * 0.51
      const tapa = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.44, L * 0.3), matEtiqueta)
      tapa.position.z = -L * 0.51
      tapa.rotation.y = Math.PI
      new THREE.TextureLoader().load('/assets/logo-caja.png', tx => {
        if (disposed) return
        tx.colorSpace = THREE.SRGBColorSpace
        matEtiqueta.map = tx
        matEtiqueta.needsUpdate = true
      })
      paquete.add(cintaH, cintaV, caja, tapa)

      scene.add(paleta, pelota, paquete)

      const onResize = () => {
        renderer.setSize(W(), H())
        camera.aspect = W() / H()
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(mount)

      let raf = 0
      // Permite pedir un cuadro concreto del guion sin depender del scroll ni de
      // requestAnimationFrame. Sirve para inspeccionar la escena cuadro a cuadro.
      if (typeof window !== 'undefined') {
        window.__lab = {
          ver(t) { progRef.current.t = t; dibujar(t); return renderer.domElement.toDataURL('image/webp', 0.7) },
          // encuadra toda la escena: sirve para comprobar que hay geometría
          vistaGeneral(t = 0.05) {
            progRef.current.t = t
            dibujar(t)
            const caja = new THREE.Box3()
            let mallas = 0
            scene.traverse(o => { if (o.isMesh && o.visible) { mallas++; caja.expandByObject(o) } })
            if (caja.isEmpty()) return { mallas, caja: 'vacia' }
            const c = new THREE.Vector3(), sz = new THREE.Vector3()
            caja.getCenter(c); caja.getSize(sz)
            const d = Math.max(sz.x, sz.y, sz.z) * 1.4
            camera.position.set(c.x, c.y + sz.y * 0.1, c.z + d)
            camera.lookAt(c)
            renderer.render(scene, camera)
            return { mallas, centro: c.toArray().map(n => +n.toFixed(1)), img: renderer.domElement.toDataURL('image/webp', 0.7) }
          },
        }
      }
      const frame = () => {
        raf = requestAnimationFrame(frame)
        dibujar(progRef.current.t)
      }
      const dibujar = (t) => {

        // ── El guion, escrito en función del progreso ──
        // 0.00–0.18 · la paleta espera quieta, de frente
        // 0.18–0.30 · la pelota ENTRA desde el frente, cayendo hacia la paleta
        // 0.30–0.38 · el golpe
        // 0.30–0.68 · vuelo: cruza la red y pica del otro lado
        // 0.42–0.90 · la cámara gira 90° alrededor de la pelota, sin cortes
        // 0.68–0.95 · la pelota cambia de forma y color hasta ser el envío
        // 0.92–1.00 · la caja se asienta y queda quieta
        const aMano   = suave(seg(t, 0.10, 0.22))
        const aEntra  = suave(seg(t, 0.18, 0.30))
        const aGolpe  = suave(seg(t, 0.30, 0.38))
        const aVuelo  = suave(seg(t, 0.38, 0.64))

        // ── Paleta: espera, amaga y golpea. Después sale de cuadro. ──
        paleta.position.set(mix(0, -0.6, aMano) - 4.5 * aVuelo, 0.4, 0)
        paleta.rotation.y = mix(0, -0.35, aMano)
        paleta.rotation.z = mix(mix(0, 0.8, aMano), -1.0, aGolpe)
        paleta.visible = aVuelo < 0.9

        // ── Pelota ──
        // Llega desde el frente cayendo, la golpean, y sale en parábola real.
        // Ya NO se oculta en ningún momento: es esta misma malla la que termina
        // siendo la caja, así que tiene que estar siempre en pantalla.
        pelota.visible = aEntra > 0.01

        // Física del tiro. El tiempo avanza LINEAL con el scroll (sin suavizado):
        // si no, la pelota parece frenar y acelerar sola.
        const G = 15, SUELO = -2.6, REBOTE = 0.55
        const VZ = 6.5, VX = 2.6, V0Y = 6.2      // velocidades al salir del golpe
        const T_PIQUE = 1.18                     // cuándo toca el piso (calculado)
        let bx, by, bz
        if (aGolpe <= 0) {
          // Entrada: llega desde el frente cayendo hacia la paleta
          const te = seg(t, 0.18, 0.30)
          bx = mix(-3.8, 0, te)
          bz = mix(4.5, 0, te)
          by = balistica(te * 0.62, 3.4, 0.4, G, 0.5, 0)
        } else {
          const tv = seg(t, 0.30, 0.92) * 1.90   // segundos de vuelo: da para UN pique
          // al picar pierde parte del avance horizontal, como una pelota de verdad
          const rec = tv < T_PIQUE ? tv : T_PIQUE + (tv - T_PIQUE) * 0.45
          bx = VX * rec
          bz = VZ * rec                          // cruza la red y sigue de largo
          by = balistica(tv, 0.5, V0Y, G, SUELO, REBOTE)
        }
        // Al final la caja se apoya en el piso y queda quieta: si siguiera la
        // física pura terminaría flotando a media parábola.
        const asienta = suave(seg(t, 0.86, 1.00))
        by = mix(by, SUELO + R_BOLA, asienta)
        pelota.position.set(bx, by, bz)
        // gira acompañando el movimiento, y se va frenando al volverse caja
        const giroBola = (0.12 + 0.3 * aGolpe) * (1 - suave(seg(t, 0.70, 0.94)))
        pelota.rotation.x += giroBola
        pelota.rotation.z += giroBola * 0.4

        // ── DE PELOTA A ENVÍO ──
        // La misma malla cambia de forma y de color. No se achica ni desaparece
        // para dejarle lugar a otra: es la pelota la que se vuelve caja.
        const cambio = suave(seg(t, 0.68, 0.95))
        transformar(cambio)

        // Los detalles del envío se apoyan encima, y sólo cuando la forma ya es
        // cúbica: si aparecieran antes se verían flotando alrededor de una esfera.
        const detalle = suave(seg(t, 0.82, 0.99))
        paquete.visible = detalle > 0.01
        matCinta.opacity = detalle
        matEtiqueta.opacity = detalle * 0.95
        paquete.position.copy(pelota.position)
        paquete.rotation.copy(pelota.rotation)
        paquete.scale.setScalar(1)

        // ── Cámara ──
        // Un solo movimiento continuo: empieza mirando la paleta de frente y va
        // rotando 90° alrededor de la pelota mientras se acerca. El giro usa el
        // progreso suavizado, así arranca y termina sin tirón.
        const FOCO_INICIAL = new THREE.Vector3(0, 0.6, 0)
        const sigue = suave(seg(t, 0.24, 0.46))       // deja la paleta, toma la pelota
        const foco = FOCO_INICIAL.clone().lerp(pelota.position, sigue)

        const giro = suave(seg(t, 0.42, 0.90)) * (Math.PI / 2)   // los 90°
        const dist = mix(11, 5.2, suave(seg(t, 0.40, 0.90)))     // se va acercando
        const alto = mix(2.4, 1.1, suave(seg(t, 0.45, 0.92)))

        camera.position.set(
          foco.x + Math.sin(giro) * dist,
          foco.y + alto,
          foco.z + Math.cos(giro) * dist
        )
        camera.lookAt(foco)

        renderer.render(scene, camera)
      }
      frame()

      // La escena ya ocupa su lugar: recién ahora ScrollTrigger puede medir bien
      ScrollTrigger.refresh()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        ;[piso, pared, linea, malla, cinta, posteIzq, posteDer, central, cara, mango, bola, costuraA, costuraB, caja, cintaH, cintaV, tapa].forEach(m => {
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
