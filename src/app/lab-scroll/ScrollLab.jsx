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
      // Niebla suave y lejana: antes cerraba a 52 unidades y borraba la cancha
      // entera, dejando una franja blanca a media pantalla.
      scene.fog = new THREE.Fog('#e8f1fa', 70, 210)

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

      // ───────────────────────── LA CANCHA ─────────────────────────
      // Todo geometría real, no una foto de fondo: la cámara gira 90° durante el
      // guion y una imagen plana se delataría al rotar. Además así la red no
      // aparece dos veces (antes estaba la de verdad y la de la foto de fondo).
      //
      // Escala: la paleta mide 2.9 unidades y en la vida real 45 cm, así que
      // 1 unidad ≈ 15.5 cm. De ahí salen todas las medidas de abajo.
      const SUELO_Y = -3
      const RED_ALTO = 5.67        // 0.88 m: la altura real de una red de pádel
      const RED_Z = 5.5
      const MEDIA = 32

      // Domo de cielo: un degradé suave alrededor de todo, para que fuera de la
      // cancha no quede el vacío blanco. Va por dentro de una esfera enorme, así
      // acompaña el giro de la cámara (un fondo plano se delataría al rotar).
      const cieloCnv = document.createElement('canvas')
      cieloCnv.width = 4; cieloCnv.height = 256
      const cieloCtx = cieloCnv.getContext('2d')
      const grad = cieloCtx.createLinearGradient(0, 0, 0, 256)
      grad.addColorStop(0, '#cfe3f7')      // arriba, cielo
      grad.addColorStop(0.55, '#eaf4fd')
      grad.addColorStop(1, '#f7fbff')      // abajo, casi blanco
      cieloCtx.fillStyle = grad
      cieloCtx.fillRect(0, 0, 4, 256)
      const texCielo = new THREE.CanvasTexture(cieloCnv)
      texCielo.colorSpace = THREE.SRGBColorSpace
      const cielo = new THREE.Mesh(
        new THREE.SphereGeometry(170, 32, 20),
        new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, fog: false })
      )
      scene.add(cielo)

      // Explanada exterior: el terreno que se ve más allá del vidrio, en un tono
      // distinto al de la cancha para que se lea el límite.
      const explanada = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 420),
        new THREE.MeshStandardMaterial({ color: '#dfe9f2', roughness: 1 })
      )
      explanada.rotation.x = -Math.PI / 2
      explanada.position.y = -3.06
      scene.add(explanada)

      const piso = new THREE.Mesh(
        new THREE.PlaneGeometry(240, 240),
        new THREE.MeshStandardMaterial({ color: '#7fb3e3', roughness: 0.95 })
      )
      piso.rotation.x = -Math.PI / 2
      piso.position.y = SUELO_Y
      scene.add(piso)

      // Paredes de vidrio: el vidrio se sugiere con opacidad baja y poca
      // rugosidad, no con transmisión real (cara y acá no se notaría).
      const matVidrio = new THREE.MeshStandardMaterial({
        color: '#dff0fb', roughness: 0.08, metalness: 0.1,
        transparent: true, opacity: 0.2, side: THREE.DoubleSide,
      })
      const matMarco = new THREE.MeshStandardMaterial({ color: '#2f4257', roughness: 0.5, metalness: 0.35 })
      const VIDRIO_ALTO = 26
      const paredes = new THREE.Group()
      const ponerPared = (ancho, x, z, giro) => {
        const g = new THREE.Group()
        const v = new THREE.Mesh(new THREE.PlaneGeometry(ancho, VIDRIO_ALTO), matVidrio)
        v.position.y = SUELO_Y + VIDRIO_ALTO / 2
        g.add(v)
        for (let k = -ancho / 2; k <= ancho / 2 + 0.01; k += 8) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, VIDRIO_ALTO, 0.22), matMarco)
          m.position.set(k, SUELO_Y + VIDRIO_ALTO / 2, 0)
          g.add(m)
        }
        ;[SUELO_Y + 0.15, SUELO_Y + VIDRIO_ALTO].forEach(y => {
          const h = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.26, 0.26), matMarco)
          h.position.set(0, y, 0)
          g.add(h)
        })
        g.position.set(x, 0, z)
        g.rotation.y = giro
        paredes.add(g)
        return v
      }
      const pared = ponerPared(80, 0, RED_Z - 42, 0)
      ponerPared(80, 0, RED_Z + 42, 0)
      ponerPared(84, -MEDIA, RED_Z, Math.PI / 2)
      ponerPared(84, MEDIA, RED_Z, Math.PI / 2)
      scene.add(paredes)

      // Techo: vigas cruzadas bien altas. Cierran la escena por arriba, que era
      // lo que quedaba más vacío, sin taparle el cielo al fondo.
      const TECHO_Y = -3 + 34
      const matViga = new THREE.MeshStandardMaterial({ color: '#c8d6e5', roughness: 0.8 })
      const techo = new THREE.Group()
      for (let x = -MEDIA; x <= MEDIA + 0.01; x += 16) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 96), matViga)
        v.position.set(x, TECHO_Y, RED_Z)
        techo.add(v)
      }
      for (let z = -42; z <= 42.01; z += 14) {
        const v = new THREE.Mesh(new THREE.BoxGeometry(MEDIA * 2, 0.5, 0.5), matViga)
        v.position.set(0, TECHO_Y - 0.7, RED_Z + z)
        techo.add(v)
      }
      scene.add(techo)

      // ── LA RED ──
      // La malla usa una rejilla dibujada al vuelo, así se ve el tejido en lugar
      // de un panel gris uniforme.
      const red = new THREE.Group()
      const cnv = document.createElement('canvas')
      cnv.width = cnv.height = 64
      const ctx = cnv.getContext('2d')
      ctx.strokeStyle = '#16283c'
      ctx.lineWidth = 8
      ctx.strokeRect(0, 0, 64, 64)
      const texRed = new THREE.CanvasTexture(cnv)
      texRed.wrapS = texRed.wrapT = THREE.RepeatWrapping
      texRed.repeat.set(100, 9)
      const matMalla = new THREE.MeshStandardMaterial({
        map: texRed, alphaMap: texRed, transparent: true, opacity: 0.92,
        roughness: 0.95, side: THREE.DoubleSide, depthWrite: false,
      })
      const malla = new THREE.Mesh(new THREE.PlaneGeometry(MEDIA * 2, RED_ALTO), matMalla)
      malla.position.y = SUELO_Y + RED_ALTO / 2
      const cinta = new THREE.Mesh(
        new THREE.BoxGeometry(MEDIA * 2, 0.42, 0.14),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
      )
      cinta.position.y = SUELO_Y + RED_ALTO
      const matPoste = new THREE.MeshStandardMaterial({ color: '#243447', roughness: 0.6, metalness: 0.3 })
      const posteIzq = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, RED_ALTO + 1.1, 12), matPoste)
      posteIzq.position.set(-MEDIA, SUELO_Y + (RED_ALTO + 1.1) / 2, 0)
      const posteDer = posteIzq.clone()
      posteDer.position.x = MEDIA
      red.add(malla, cinta, posteIzq, posteDer)
      red.position.z = RED_Z
      scene.add(red)

      // Líneas de la cancha: dan la referencia de profundidad del vuelo
      const matLinea = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 })
      const lineas = new THREE.Group()
      ;[-22, -10, 10, 22].forEach(z => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(MEDIA * 2, 0.02, 0.2), matLinea)
        l.position.set(0, SUELO_Y + 0.02, RED_Z + z)
        lineas.add(l)
      })
      const linea = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 44), matLinea)
      linea.position.set(0, SUELO_Y + 0.02, RED_Z)
      lineas.add(linea)
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
      const COLOR_CARTON = new THREE.Color('#eef2f7')   // claro y plano, no cartón realista

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
        matFieltro.roughness = mix(0.95, 0.75, k)
        // las costuras se borran en la primera mitad: son de la pelota, no de la caja
        const vc = Math.max(0, 1 - k * 2)
        matCostura.opacity = vc
        costuraA.visible = costuraB.visible = vc > 0.02
      }
      matCostura.transparent = true
      // Los detalles del envío (cintas + etiqueta) NO son otra caja: se apoyan
      // sobre la misma malla que antes era pelota, y aparecen recién cuando la
      // forma ya es cúbica. Así nunca hay dos objetos pisándose.
      // Sombra de contacto: una mancha suave debajo. Sin esto la caja se ve
      // despegada del piso por más que esté apoyada.
      const matSombra = new THREE.MeshBasicMaterial({
        color: '#4a6885', transparent: true, opacity: 0, depthWrite: false,
      })
      const sombra = new THREE.Mesh(new THREE.CircleGeometry(R_BOLA * 1.9, 28), matSombra)
      sombra.rotation.x = -Math.PI / 2
      scene.add(sombra)

      const paquete = new THREE.Group()
      const L = R_BOLA * 2                       // la caja mide esto de cara a cara
      const matCinta = new THREE.MeshStandardMaterial({
        color: '#2563EB', roughness: 0.55, transparent: true, opacity: 0,   // cintas en el azul de la marca
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

        // ── Paleta: espera al fondo, amaga y golpea hacia la cámara ──
        // Queda del otro lado de la red, así la pelota viene hacia vos, cruza
        // por encima y pica de este lado. No se corta de golpe: acompaña el
        // golpe y se va apagando.
        const PAL_Z = -6
        paleta.position.set(mix(0, -0.8, aMano) - 1.4 * aVuelo, 0.4 + 1.1 * aVuelo, PAL_Z)
        paleta.rotation.y = mix(0, -0.35, aMano)
        paleta.rotation.z = mix(mix(0, 0.8, aMano), -1.1, aGolpe)
        const salePaleta = suave(seg(t, 0.44, 0.62))
        paleta.visible = salePaleta < 0.99
        paleta.traverse(o => {
          if (o.isMesh && o.material) {
            o.material.transparent = true
            o.material.opacity = 1 - salePaleta
          }
        })

        // ── Pelota ──
        // Ya NO se oculta en ningún momento: es esta misma malla la que termina
        // siendo la caja, así que tiene que estar siempre en pantalla.
        pelota.visible = aEntra > 0.01

        // Física del tiro. El tiempo avanza LINEAL con el scroll (sin suavizado):
        // si no, la pelota parece frenar y acelerar sola.
        const G = 15, SUELO = SUELO_Y + R_BOLA, REBOTE = 0.55
        // Velocidades calculadas para que PASE la red de 5.67 de alto: al llegar
        // a la red va por 3.8 de altura, bien por encima del borde (2.67).
        const VZ = 10, VX = 1.6, V0Y = 11.5
        const T_PIQUE = 1.77                     // cuándo toca el piso (calculado)
        let bx, by, bz
        if (aGolpe <= 0) {
          const te = seg(t, 0.18, 0.30)          // entra desde el frente, cayendo
          bx = mix(-3.2, 0, te)
          bz = mix(15, PAL_Z, te)
          by = balistica(te * 0.62, 5.5, 0.4, G, 0.5, 0)
        } else {
          const tv = seg(t, 0.30, 0.92) * 2.30   // segundos de vuelo: da para UN pique
          // al picar pierde parte del avance, como una pelota de verdad
          const rec = tv < T_PIQUE ? tv : T_PIQUE + (tv - T_PIQUE) * 0.42
          bx = VX * rec
          bz = PAL_Z + VZ * rec                  // cruza la red y pica del otro lado
          by = balistica(tv, 0.5, V0Y, G, SUELO, REBOTE)
        }
        // Al final se apoya en el piso: con la física pura quedaría flotando.
        // Al volverse cubo la cara de abajo queda a R_BOLA del centro, así que
        // apoyarla pide esa altura exacta más un pelín para que no se funda con
        // el piso ni lo atraviese.
        by = mix(by, SUELO_Y + R_BOLA + 0.04, suave(seg(t, 0.86, 1.00)))
        pelota.position.set(bx, by, bz)

        // ── Cámara: un giro continuo de 90° alrededor de la pelota ──
        // Se resuelve ANTES que la caja, porque la caja tiene que terminar
        // enfrentando a la cámara para que el logo se lea.
        const sigue = suave(seg(t, 0.24, 0.46))          // suelta la paleta, toma la pelota
        const giro = suave(seg(t, 0.42, 0.90)) * (Math.PI / 2)
        const foco = new THREE.Vector3(0, 0.9, PAL_Z).lerp(pelota.position, sigue)
        // Arranca cerca para que la paleta se lea como protagonista, y termina
        // un poco más lejos y más alta: pegada al piso, la red entraba de canto
        // cortando la pantalla en diagonal.
        const dist = mix(8.5, 12, suave(seg(t, 0.40, 0.92)))
        const alto = mix(1.6, 3.6, suave(seg(t, 0.45, 0.92)))
        camera.position.set(
          foco.x + Math.sin(giro) * dist,
          foco.y + alto,
          foco.z + Math.cos(giro) * dist
        )
        camera.lookAt(foco)

        // ── DE PELOTA A ENVÍO ──
        // La misma malla cambia de forma y de color. No se achica ni desaparece
        // para dejarle lugar a otra: es la pelota la que se vuelve caja.
        transformar(suave(seg(t, 0.68, 0.95)))

        // Gira mientras es pelota; al volverse caja se alinea y queda QUIETA, con
        // la cara del logo enfrentando a la cámara. Se calcula en función del
        // scroll (no acumulando) para que ir y volver den lo mismo.
        const vueltas = seg(t, 0.30, 0.72) * 9
        const alinea = suave(seg(t, 0.68, 0.90))
        pelota.rotation.x = vueltas * (1 - alinea)
        pelota.rotation.z = vueltas * 0.4 * (1 - alinea)
        pelota.rotation.y = mix(vueltas * 0.3, giro, alinea)

        // Cintas y etiqueta: se apoyan encima y sólo cuando la forma ya es
        // cúbica. Antes se verían flotando alrededor de una esfera.
        const detalle = suave(seg(t, 0.80, 0.98))
        paquete.visible = detalle > 0.01
        matCinta.opacity = detalle
        matEtiqueta.opacity = detalle
        paquete.position.copy(pelota.position)
        paquete.rotation.copy(pelota.rotation)

        // La sombra sigue a la pelota por el piso: se agranda y se aclara cuanto
        // más alto va, como una sombra de verdad.
        const altura = Math.max(0, pelota.position.y - SUELO_Y)
        sombra.position.set(pelota.position.x, SUELO_Y + 0.03, pelota.position.z)
        sombra.scale.setScalar(1 + altura * 0.16)
        matSombra.opacity = pelota.visible ? Math.max(0, 0.34 - altura * 0.035) : 0

        renderer.render(scene, camera)
      }
      frame()

      // La escena ya ocupa su lugar: recién ahora ScrollTrigger puede medir bien
      ScrollTrigger.refresh()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        ;scene.traverse(o => {
          o.geometry?.dispose()
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
          else o.material?.dispose()
        })
        texRed.dispose()
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
