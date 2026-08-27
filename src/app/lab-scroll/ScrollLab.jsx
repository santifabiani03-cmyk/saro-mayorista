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

import { useRef, useEffect, useState } from 'react'
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
// La paleta usa el mismo alto que el hero de la página pública (5.2 allá con
// cámara de FOV 34), para que se lea igual de grande.
const ALTO_PALETA = 3.9
const CODO = 1.5              // cuánto por debajo del mango está el pivote del swing
// Punto exacto donde la pelota toca el centro de la cara. Lo comparten la
// entrada, el golpe y la salida: si cada tramo usa el suyo, la pelota salta.
const IMPACTO = { x: 0, y: 3.2, z: -6 }
// La pelota NO debe llegar al centro de la paleta sino a su CARA: la paleta
// tiene 0.33 de grosor y la pelota 0.29 de radio, así que el contacto ocurre
// 0.45 antes. Y en el instante del golpe el swing adelanta la paleta 0.42.
// Sin esto la pelota entraba media unidad dentro del modelo: la atravesaba.
const CONTACTO = { x: 0, y: 3.2, z: -6 + 0.42 + 0.45 }
// Momento exacto en que la cara pasa por el punto de impacto (mitad del tramo
// de golpe del swing). La pelota tiene que cambiar de rumbo JUSTO acá.
const T_IMPACTO = 0.291

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
  // Quien pide "reducir movimiento" suele hacerlo por mareo o vértigo. No
  // alcanza con no animar: hay que darle la misma historia en forma legible.
  const [sinMovimiento, setSinMovimiento] = useState(false)
  useEffect(() => {
    setSinMovimiento(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

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
      // Sin niebla. Lavaba el fondo y aplanaba la cancha; con el domo de cielo
      // detrás ya no hace falta nada que disimule el borde del mundo.

      // FOV 34 como el hero de la página pública: menos distorsión de
      // perspectiva y la paleta se lee del mismo modo.
      const camera = new THREE.PerspectiveCamera(34, W() / H(), 0.1, 400)
      // preserveDrawingBuffer permite leer el cuadro ya dibujado (para inspeccionarlo)
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
      // Sin curva de exposición, las zonas claras se van a blanco puro y todo
      // queda plano y quemado — es buena parte de lo que se lee como "barato".
      // ACES comprime las altas luces como lo hace una cámara de verdad.
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.92
      // Sombras reales: apoyan los objetos en el piso mejor que cualquier truco.
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(W(), H())
      mount.appendChild(renderer.domElement)

      // Iluminación de entorno: el modelo real necesita reflejos para verse bien
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
      scene.environmentIntensity = 0.38     // el ambiente aclaraba las sombras
      scene.add(new THREE.HemisphereLight('#ffffff', '#c3d1e5', 0.34))   // menos relleno = sombra más marcada
      const sol = new THREE.DirectionalLight('#fff6e8', 1.15)   // apenas cálido, como el sol
      sol.position.set(4, 8, 6)
      sol.castShadow = true
      sol.shadow.mapSize.set(1024, 1024)
      sol.shadow.camera.near = 1
      sol.shadow.camera.far = 260
      // el área que cubre la sombra: la cancha entera
      Object.assign(sol.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90 })
      sol.shadow.bias = -0.0012
      scene.add(sol)
      // Luz de relleno del lado opuesto: sin ella la cara en sombra queda plana
      const relleno = new THREE.DirectionalLight('#dceafc', 0.16)
      relleno.position.set(-7, 4, -5)
      scene.add(relleno)

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
      const MEDIA = 32.5   // media cancha a lo ancho (65 / 2)
      // Medidas reales: una cancha de pádel es de 20 x 10 m, que con esta escala
      // son 129 x 65 unidades. Van acá arriba porque las usa todo lo demás.
      const CANCHA_LARGO = 129, CANCHA_ANCHO = 65

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
      // Césped alrededor: da un afuera creíble en vez de una explanada neutra.
      // El moteado se dibuja al vuelo para que no se lea como un verde plano.
      const cesCnv = document.createElement('canvas')
      cesCnv.width = cesCnv.height = 128
      const cesCtx = cesCnv.getContext('2d')
      cesCtx.fillStyle = '#8fbf7a'
      cesCtx.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 900; i++) {
        cesCtx.fillStyle = i % 2 ? 'rgba(122,171,101,0.55)' : 'rgba(166,205,143,0.5)'
        cesCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 3)
      }
      const texCesped = new THREE.CanvasTexture(cesCnv)
      texCesped.colorSpace = THREE.SRGBColorSpace
      texCesped.wrapS = texCesped.wrapT = THREE.RepeatWrapping
      texCesped.repeat.set(40, 40)
      // El cargador se declara ACÁ, antes del primer uso.
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)

      // ── AFUERA DE LA CANCHA ──
      const afuera = new THREE.Group()
      const cartelesRef = {}

      // ── LONAS DE FONDO ──
      // En una cancha de verdad las paredes del fondo llevan lonas publicitarias.
      // Acá cumplen doble función: tapan el fondo, que era el problema, y ponen
      // la marca donde el ojo ya está mirando.
      const lonaCnv = document.createElement('canvas')
      lonaCnv.width = 1024; lonaCnv.height = 128
      const lx = lonaCnv.getContext('2d')
      lx.fillStyle = '#2563EB'                        // azul de la marca, no el navy
      lx.fillRect(0, 0, 1024, 128)
      const texLona = new THREE.CanvasTexture(lonaCnv)
      texLona.colorSpace = THREE.SRGBColorSpace
      const matLona = new THREE.MeshStandardMaterial({ map: texLona, roughness: 0.85 })
      // El logo va en blanco y con separación calculada, no a ojo: antes se
      // dibujaba cada 232 px con anchos variables y terminaba encimándose.
      const imgLogo = new Image()
      imgLogo.crossOrigin = 'anonymous'
      imgLogo.onload = () => {
        if (disposed) return
        const alto = 46
        const ancho = alto * (imgLogo.width / imgLogo.height || 3)
        const veces = 3
        const paso = 1024 / veces
        // se pinta en blanco usando el logo como recorte
        const aux = document.createElement('canvas')
        aux.width = Math.ceil(ancho); aux.height = Math.ceil(alto)
        const ax = aux.getContext('2d')
        ax.drawImage(imgLogo, 0, 0, ancho, alto)
        ax.globalCompositeOperation = 'source-in'
        ax.fillStyle = '#ffffff'
        ax.fillRect(0, 0, ancho, alto)
        for (let k = 0; k < veces; k++) {
          lx.drawImage(aux, paso * (k + 0.5) - ancho / 2, 64 - alto / 2)
        }
        texLona.needsUpdate = true
      }
      imgLogo.src = '/assets/logo-horizontal.png'

      const LONA_ALTO = 7
      ;[-1, 1].forEach(lado => {
        const lona = new THREE.Mesh(new THREE.PlaneGeometry(CANCHA_ANCHO, LONA_ALTO), matLona)
        // Del lado de AFUERA del cristal, como en las canchas de verdad
        lona.position.set(0, SUELO_Y + LONA_ALTO / 2 + 0.4, RED_Z + lado * (CANCHA_LARGO / 2 + 0.6))
        lona.rotation.y = lado > 0 ? Math.PI : 0
        scene.add(lona)
      })

      // ── MOBILIARIO DEL CLUB ──
      // Modelos CC0 de Poly Haven (uso comercial libre, sin atribución). Se
      // eligieron sobre generarlos con IA: están modelados por artistas, vienen
      // con texturas coherentes y pesan una fracción. El alambrado es además lo
      // que rodea una cancha de pádel de verdad.
      const ponerModelo = (ruta, colocar) => {
        loader.load(ruta, gltf => {
          if (disposed) return
          const o = gltf.scene
          o.updateMatrixWorld(true)
          const caja = new THREE.Box3().setFromObject(o)
          const t = new THREE.Vector3(); caja.getSize(t)
          const c = new THREE.Vector3(); caja.getCenter(c)
          // centrado en planta y apoyado en su base, normalizado a 1 de alto
          o.position.set(-c.x, -caja.min.y, -c.z)
          const cont = new THREE.Group()
          cont.add(o)
          cont.scale.setScalar(1 / (t.y || 1))
          cont.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true } })
          colocar(cont, t)
        }, undefined, () => { /* si no carga, la escena sigue igual */ })
      }

      // Bancos contra las paredes largas, mirando a la cancha
      ponerModelo('/models/banco.glb', (base) => {
        ;[[-1, -26], [-1, 30], [1, 2]].forEach(([lado, z]) => {
          const b = base.clone()
          b.scale.multiplyScalar(5.6)                 // ~0.87 m de alto
          b.position.set(lado * (CANCHA_ANCHO / 2 + 11), SUELO_Y, RED_Z + z)
          b.rotation.y = lado > 0 ? -Math.PI / 2 : Math.PI / 2
          afuera.add(b)
        })
      })

      // El alambrado perimetral se saca: competía con el cerramiento de la
      // cancha, que ahora ya tiene su propia reja.

      // ── CARTELERÍA DE PRODUCTOS ──
      // Fotos reales del catálogo, montadas en carteles fuera de la cancha. Son
      // planos con la imagen y nada más: no hay que modelar cada producto en 3D,
      // pesan lo que pesa un WebP y muestran el producto tal cual se vende.
      const CATALOGO = [
        '/assets/imagen-1779451998087.webp',   // medias
        '/assets/imagen-1779452173589.webp',   // canasto
        '/assets/imagen-1779452345276.webp',   // caramelera
        '/assets/imagen-1779452499007.webp',   // toalla
      ]
      // Orden distinto en cada carga: quien vuelve al sitio no ve siempre lo
      // mismo. Se mezcla una copia para no tocar la lista original.
      const PRODUCTOS = [...CATALOGO]
      for (let i = PRODUCTOS.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[PRODUCTOS[i], PRODUCTOS[j]] = [PRODUCTOS[j], PRODUCTOS[i]]
      }
      const CARTEL_ALTO = 20
      const carteles = new THREE.Group()
      const rotables = []
      const matPoste2 = new THREE.MeshStandardMaterial({ color: '#2f4257', roughness: 0.6, metalness: 0.3 })

      // La cámara arranca mirando al fondo y gira 90° hacia un costado. Los
      // carteles se reparten sobre ESE arco, así van entrando en cuadro a medida
      // que gira, en vez de quedar detrás.
      PRODUCTOS.forEach((ruta, i) => {
        // Los primeros van sobre el arco que recorre la cámara; el último cruza
        // al otro lado, para que también haya cartelería a la derecha.
        // Uno queda a la vista desde el arranque (la cámara empieza mirando al
        // fondo), otro cruza a la derecha, y el resto se reparte sobre el arco
        // que la cámara recorre al girar.
        // Posiciones fijas: uno CENTRADO al fondo (el que se ve al abrir la
        // página), dos abriéndose a los costados y uno que entra al girar.
        const ANGULOS = [-Math.PI / 2, -Math.PI / 2 - 0.62, -Math.PI / 2 + 0.62, Math.PI - 0.3]
        const ang = ANGULOS[i % ANGULOS.length]
        const rad = 84
        const x = Math.cos(ang) * rad
        const z = RED_Z + Math.sin(ang) * rad

        const grupo = new THREE.Group()
        // fondo blanco: las fotos del catálogo vienen sobre blanco, no recortadas
        const fondo = new THREE.Mesh(
          new THREE.PlaneGeometry(CARTEL_ALTO * 0.84, CARTEL_ALTO),
          new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, side: THREE.DoubleSide })
        )
        fondo.position.y = SUELO_Y + CARTEL_ALTO / 2 + 10
        grupo.add(fondo)

        // Material sin iluminación: la foto se ve con sus colores propios. Con
        // MeshStandard recibía sol + ambiente + relleno y salía quemada.
        const matFoto = new THREE.MeshBasicMaterial({
          transparent: true, side: THREE.DoubleSide, toneMapped: false,
        })
        const foto = new THREE.Mesh(
          new THREE.PlaneGeometry(CARTEL_ALTO * 0.72, CARTEL_ALTO * 0.72), matFoto
        )
        foto.position.set(0, SUELO_Y + CARTEL_ALTO / 2 + 10, 0.25)
        grupo.add(foto)
        new THREE.TextureLoader().load(ruta, tx => {
          if (disposed) return
          tx.colorSpace = THREE.SRGBColorSpace
          matFoto.map = tx
          matFoto.needsUpdate = true
        }, undefined, () => { foto.visible = false })

        // marco de la marca abajo, para que se lea como cartelería y no como foto pegada
        const zocalo = new THREE.Mesh(
          new THREE.BoxGeometry(CARTEL_ALTO * 0.86, CARTEL_ALTO * 0.1, 0.4),
          new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.7 })
        )
        zocalo.position.set(0, SUELO_Y + 10 + CARTEL_ALTO * 0.05, 0)
        grupo.add(zocalo)

        ;[-0.34, 0.34].forEach(d => {
          const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 10, 8), matPoste2)
          pata.position.set(d * CARTEL_ALTO * 0.84, SUELO_Y + 5, 0)
          grupo.add(pata)
        })

        grupo.traverse(o => { if (o.isMesh) o.castShadow = true })
        grupo.position.set(x, 0, z)
        grupo.lookAt(0, SUELO_Y + 16, RED_Z)        // todos miran hacia la cancha
        carteles.add(grupo)
        rotables.push({ grupo, base: grupo.rotation.y, fase: i * 1.7 })
      })
      cartelesRef.lista = rotables

      afuera.add(carteles)

      // ── EL CLUB ──
      // Un edificio bajo detrás de la cancha. Hecho por código y no con un
      // modelo generado: los edificios de Meshy vienen con la textura repartida
      // en miles de retazos y no se pueden achicar sin romperlos.
      const club = new THREE.Group()
      const matPared = new THREE.MeshStandardMaterial({ color: '#f2f5f8', roughness: 0.9 })
      const matTecho = new THREE.MeshStandardMaterial({ color: '#2f4257', roughness: 0.7 })
      const matVentana = new THREE.MeshStandardMaterial({
        color: '#7d99b5', roughness: 0.2, metalness: 0.4,   // vidrio claro: en oscuro se robaba el cuadro
      })
      const CL_ANCHO = 58, CL_ALTO = 20, CL_FONDO = 28
      const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(CL_ANCHO, CL_ALTO, CL_FONDO), matPared)
      cuerpo.position.y = SUELO_Y + CL_ALTO / 2
      club.add(cuerpo)
      // alero que sobresale, para que no sea una caja pelada
      const alero = new THREE.Mesh(new THREE.BoxGeometry(CL_ANCHO + 6, 2.4, CL_FONDO + 6), matTecho)
      alero.position.y = SUELO_Y + CL_ALTO + 1.2
      club.add(alero)
      // ventanal corrido al frente
      const ventanal = new THREE.Mesh(new THREE.BoxGeometry(CL_ANCHO * 0.82, CL_ALTO * 0.42, 0.6), matVentana)
      ventanal.position.set(0, SUELO_Y + CL_ALTO * 0.55, CL_FONDO / 2 + 0.2)
      club.add(ventanal)
      // cartel con el logo sobre el ventanal
      const matCartel = new THREE.MeshStandardMaterial({
        color: '#ffffff', roughness: 0.85, transparent: true,
      })
      const cartel = new THREE.Mesh(new THREE.PlaneGeometry(CL_ANCHO * 0.34, CL_ANCHO * 0.34 / 3), matCartel)
      cartel.position.set(0, SUELO_Y + CL_ALTO * 0.85, CL_FONDO / 2 + 0.4)
      new THREE.TextureLoader().load('/assets/logo-caja.png', tx => {
        if (disposed) return
        tx.colorSpace = THREE.SRGBColorSpace
        matCartel.map = tx
        matCartel.needsUpdate = true
      })
      club.add(cartel)
      // A 132 el club ocupaba el 97% del cuadro a lo ancho y tapaba el fondo
      // entero. A 260 se lee como un edificio a lo lejos, que es lo que es.
      club.position.set(-52, 0, RED_Z - 260)
      afuera.add(club)

      // ── EL LÍMITE DEL TERRENO ──
      // Sin esto el césped se corta de golpe contra el cielo y se ve el borde
      // del mundo. Un seto perimetral cierra la vista a lo lejos.
      const matSeto = new THREE.MeshStandardMaterial({ color: '#4e7a48', roughness: 1 })
      const seto = new THREE.Mesh(new THREE.TorusGeometry(180, 7, 6, 40), matSeto)
      seto.rotation.x = Math.PI / 2
      seto.position.set(0, SUELO_Y + 1, RED_Z)
      seto.scale.y = 0.55
      afuera.add(seto)

      // otra cancha a lo lejos, apenas insinuada: da idea de club, no de cancha suelta
      const vecina = new THREE.Mesh(
        new THREE.PlaneGeometry(58, 26),
        new THREE.MeshStandardMaterial({ color: '#8fc0e8', roughness: 0.95 })
      )
      vecina.rotation.x = -Math.PI / 2
      vecina.position.set(0, -2.98, RED_Z - 96)
      afuera.add(vecina)
      scene.add(afuera)

      const explanada = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 420),
        new THREE.MeshStandardMaterial({ map: texCesped, roughness: 1 })
      )
      explanada.rotation.x = -Math.PI / 2
      explanada.position.y = -3.06
      scene.add(explanada)

      // Césped sintético: fibras verticales finas con variación, no un celeste
      // plano. Se dibuja al vuelo y se repite, así no pesa nada.
      const cesCnv2 = document.createElement('canvas')
      cesCnv2.width = cesCnv2.height = 128
      const cx2 = cesCnv2.getContext('2d')
      cx2.fillStyle = '#7fb3e3'
      cx2.fillRect(0, 0, 128, 128)
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * 128, y = Math.random() * 128
        const claro = Math.random() > 0.5
        cx2.strokeStyle = claro ? 'rgba(255,255,255,0.16)' : 'rgba(40,90,140,0.14)'
        cx2.lineWidth = 1
        cx2.beginPath()
        cx2.moveTo(x, y)
        cx2.lineTo(x + (Math.random() - 0.5) * 1.5, y + 2.5 + Math.random() * 2)
        cx2.stroke()
      }
      const texPiso = new THREE.CanvasTexture(cesCnv2)
      // Sin esto Three la toma como lineal y la muestra lavada: el piso se veía
      // blanco. Era la única textura del archivo a la que le faltaba.
      texPiso.colorSpace = THREE.SRGBColorSpace
      texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping
      texPiso.repeat.set(26, 52)
      texPiso.anisotropy = 8
      const piso = new THREE.Mesh(
        new THREE.PlaneGeometry(CANCHA_ANCHO, CANCHA_LARGO),
        new THREE.MeshStandardMaterial({ map: texPiso, roughness: 1, metalness: 0, color: '#cfe0ee' })
      )
      piso.rotation.x = -Math.PI / 2
      piso.position.set(0, SUELO_Y, RED_Z)
      piso.receiveShadow = true
      scene.add(piso)
      // vereda perimetral: el borde de cemento que rodea la cancha
      const vereda = new THREE.Mesh(
        new THREE.PlaneGeometry(CANCHA_ANCHO + 16, CANCHA_LARGO + 16),
        new THREE.MeshStandardMaterial({ color: '#c9d4dd', roughness: 1 })
      )
      vereda.rotation.x = -Math.PI / 2
      vereda.position.set(0, SUELO_Y - 0.02, RED_Z)
      scene.add(vereda)

      // Paredes de vidrio: el vidrio se sugiere con opacidad baja y poca
      // rugosidad, no con transmisión real (cara y acá no se notaría).
      const matVidrio = new THREE.MeshStandardMaterial({
        color: '#dff0fb', roughness: 0.08, metalness: 0.1,
        transparent: true, opacity: 0.14, side: THREE.DoubleSide,   // más limpio: deja ver el afuera
      })
      const matMarco = new THREE.MeshStandardMaterial({ color: '#2f4257', roughness: 0.5, metalness: 0.35 })
      const VIDRIO_ALTO = 26
      const paredes = new THREE.Group()
      // ── CERRAMIENTO, con la estructura de una cancha real ──
      // Vidrio templado de 3 m con 1 m de reja por encima. Los fondos son todo
      // vidrio; los laterales llevan vidrio sólo en las puntas y reja en los
      // 12 m del medio, con la puerta de 2 x 2 m junto a la red.
      const VIDRIO_H = 3 / 0.155          // 19.4 — los 3 m de vidrio
      const REJA_H = 1 / 0.155            // 6.5  — el metro de reja de arriba
      const PUERTA_A = 2 / 0.155          // 12.9 — 2 m de ancho
      const PUERTA_H = 2 / 0.155          // 12.9 — 2 m de alto
      const VIDRIO_PUNTA = 4 / 0.155      // 25.8 — vidrio en cada punta del lateral

      // rejilla metálica, dibujada al vuelo
      const rejCnv = document.createElement('canvas')
      rejCnv.width = rejCnv.height = 32
      const rx = rejCnv.getContext('2d')
      rx.strokeStyle = '#243447'
      rx.lineWidth = 4
      rx.strokeRect(0, 0, 32, 32)
      const texReja = new THREE.CanvasTexture(rejCnv)
      texReja.wrapS = texReja.wrapT = THREE.RepeatWrapping
      const matReja = new THREE.MeshStandardMaterial({
        map: texReja, alphaMap: texReja, transparent: true,
        roughness: 0.8, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false,
      })
      const hacerReja = (ancho, alto, repX) => {
        const t = texReja.clone()
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(repX, alto / 2)
        t.needsUpdate = true
        const m = matReja.clone()
        m.map = t; m.alphaMap = t
        return new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), m)
      }
      const montante = (x, alto, y0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, alto, 0.26), matMarco)
        m.position.set(x, y0 + alto / 2, 0)
        return m
      }

      const ponerPared = (ancho, x, z, giro, tipo) => {
        const g = new THREE.Group()

        if (tipo === 'fondo') {
          // todo vidrio abajo, reja arriba
          const v = new THREE.Mesh(new THREE.PlaneGeometry(ancho, VIDRIO_H), matVidrio)
          v.position.y = SUELO_Y + VIDRIO_H / 2
          g.add(v)
          const r = hacerReja(ancho, REJA_H, ancho / 4)
          r.position.y = SUELO_Y + VIDRIO_H + REJA_H / 2
          g.add(r)
          // montantes cada pieza de vidrio (1.996 m)
          const piezas = Math.round(ancho / (1.996 / 0.155))
          for (let k = 0; k <= piezas; k++) {
            g.add(montante(-ancho / 2 + (ancho / piezas) * k, VIDRIO_H + REJA_H, SUELO_Y))
          }
        } else {
          // lateral: vidrio en las puntas, reja en el medio, puerta junto a la red
          const medio = ancho - VIDRIO_PUNTA * 2
          ;[-1, 1].forEach(lado => {
            const v = new THREE.Mesh(new THREE.PlaneGeometry(VIDRIO_PUNTA, VIDRIO_H), matVidrio)
            v.position.set(lado * (ancho / 2 - VIDRIO_PUNTA / 2), SUELO_Y + VIDRIO_H / 2, 0)
            g.add(v)
            const r = hacerReja(VIDRIO_PUNTA, REJA_H, VIDRIO_PUNTA / 4)
            r.position.set(lado * (ancho / 2 - VIDRIO_PUNTA / 2), SUELO_Y + VIDRIO_H + REJA_H / 2, 0)
            g.add(r)
          })
          // el tramo de reja del centro, partido por la puerta
          const pano = (medio - PUERTA_A) / 2
          ;[-1, 1].forEach(lado => {
            const r = hacerReja(pano, VIDRIO_H + REJA_H, pano / 4)
            r.position.set(lado * (PUERTA_A / 2 + pano / 2), SUELO_Y + (VIDRIO_H + REJA_H) / 2, 0)
            g.add(r)
          })
          // encima de la puerta
          const arriba = hacerReja(PUERTA_A, VIDRIO_H + REJA_H - PUERTA_H, PUERTA_A / 4)
          arriba.position.set(0, SUELO_Y + PUERTA_H + (VIDRIO_H + REJA_H - PUERTA_H) / 2, 0)
          g.add(arriba)
          // marco de la puerta
          ;[-1, 1].forEach(lado => g.add(montante(lado * PUERTA_A / 2, PUERTA_H, SUELO_Y)))
          const dintel = new THREE.Mesh(new THREE.BoxGeometry(PUERTA_A + 0.3, 0.3, 0.3), matMarco)
          dintel.position.set(0, SUELO_Y + PUERTA_H, 0)
          g.add(dintel)
          // montantes de los paños de vidrio de las puntas
          ;[-1, 1].forEach(lado => {
            g.add(montante(lado * ancho / 2, VIDRIO_H + REJA_H, SUELO_Y))
            g.add(montante(lado * (ancho / 2 - VIDRIO_PUNTA), VIDRIO_H + REJA_H, SUELO_Y))
          })
        }

        // remates horizontal de arriba y zócalo
        ;[SUELO_Y + 0.15, SUELO_Y + VIDRIO_H + REJA_H].forEach(y => {
          const h = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.28, 0.28), matMarco)
          h.position.set(0, y, 0)
          g.add(h)
        })
        g.position.set(x, 0, z)
        g.rotation.y = giro
        paredes.add(g)
        return g
      }
      const pared = ponerPared(CANCHA_ANCHO, 0, RED_Z - CANCHA_LARGO / 2, 0, 'fondo')
      ponerPared(CANCHA_ANCHO, 0, RED_Z + CANCHA_LARGO / 2, 0, 'fondo')
      ponerPared(CANCHA_LARGO, -CANCHA_ANCHO / 2, RED_Z, Math.PI / 2, 'lateral')
      ponerPared(CANCHA_LARGO, CANCHA_ANCHO / 2, RED_Z, Math.PI / 2, 'lateral')
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
      // Tejido más cerrado y oscuro: antes se veía como un velo transparente
      ctx.strokeStyle = '#05090f'   // casi negro: se leía clara contra el fondo
      ctx.lineWidth = 15
      ctx.strokeRect(0, 0, 64, 64)
      const texRed = new THREE.CanvasTexture(cnv)
      texRed.wrapS = texRed.wrapT = THREE.RepeatWrapping
      texRed.repeat.set(100, 9)
      const matMalla = new THREE.MeshStandardMaterial({
        map: texRed, alphaMap: texRed, transparent: true, opacity: 1, color: '#8fa0b4',
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

      // ── LÍNEAS ──
      // Las de reglamento y nada más. Antes había cuatro líneas paralelas, dos
      // de ellas a 1.6 m de la red: en una cancha de pádel no existen.
      const matLinea = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 })
      const lineas = new THREE.Group()
      const SAQUE = 6.95 / 0.155        // 44.8 — la línea de saque va a 6.95 m de la red
      // una línea de saque de cada lado
      ;[-SAQUE, SAQUE].forEach(z => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(CANCHA_ANCHO, 0.02, 0.3), matLinea)
        l.position.set(0, SUELO_Y + 0.02, RED_Z + z)
        lineas.add(l)
      })
      // la central sólo cruza el área de saque, de una línea de saque a la otra
      const central = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, SAQUE * 2), matLinea)
      central.position.set(0, SUELO_Y + 0.02, RED_Z)
      lineas.add(central)
      // líneas de fondo, en el borde de la cancha
      ;[-CANCHA_LARGO / 2, CANCHA_LARGO / 2].forEach(z => {
        const l = new THREE.Mesh(new THREE.BoxGeometry(CANCHA_ANCHO, 0.02, 0.3), matLinea)
        l.position.set(0, SUELO_Y + 0.02, RED_Z + z)
        lineas.add(l)
      })
      const linea = central
      scene.add(lineas)

      // Placeholders: paleta, pelota y paquete
      // La paleta cuelga de un pivote que hace de CODO, igual que en el hero de
      // la página pública: al rotar el pivote el mango acompaña el arco en vez
      // de girar sobre su propio centro, y el golpe se lee como un brazo.
      const codo = new THREE.Group()
      const paleta = new THREE.Group()
      paleta.position.y = ALTO_PALETA / 2 + CODO
      codo.add(paleta)
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

      // Paquete real (Meshy, 79 KB) con el logo de la marca pegado en la cara.

      // Mano generada con Meshy (101 KB ya optimizada). Si carga, reemplaza a la
      // mano de cápsulas; si falla, queda la simple y el guion sigue igual.

      loader.load('/models/paleta-opt.glb', gltf => {
        if (disposed) return
        const modelo = gltf.scene
        const box = new THREE.Box3().setFromObject(modelo)
        const size = new THREE.Vector3(); box.getSize(size)
        const centro = new THREE.Vector3(); box.getCenter(centro)
        modelo.position.sub(centro)

        // El modelo se centra por su caja completa, que incluye el mango, así que
        // el origen NO cae en el centro de la cara: la pelota terminaba pegándole
        // al borde. Se busca la cara midiendo dónde el modelo es más ANCHO —
        // la cabeza es ancha, el mango es fino — y se corrige esa diferencia.
        const FRANJAS = 40
        const ancho = new Array(FRANJAS).fill(0)
        modelo.updateMatrixWorld(true)
        modelo.traverse(o => {
          const pos = o.isMesh && o.geometry?.attributes?.position
          if (!pos) return
          const v = new THREE.Vector3()
          for (let i = 0; i < pos.count; i += 3) {          // 1 de cada 3 alcanza
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld)
            const f = Math.min(FRANJAS - 1, Math.max(0, Math.floor(((v.y - box.min.y + centro.y) / size.y) * FRANJAS)))
            ancho[f] = Math.max(ancho[f], Math.abs(v.x))
          }
        })
        const anchoMax = Math.max(...ancho)
        let suma = 0, peso = 0
        ancho.forEach((a2, i) => {
          if (a2 < anchoMax * 0.62) return                  // descarta el mango
          const y = (i + 0.5) / FRANJAS * size.y - size.y / 2
          suma += y * a2; peso += a2
        })
        if (peso > 0) modelo.position.y -= suma / peso      // la cara queda en el origen

        const cont = new THREE.Group()
        cont.add(modelo)
        cont.scale.setScalar(ALTO_PALETA / size.y)
        paleta.add(cont)

        // ── CORDAJE ──
        // La textura del modelo trae el damero gris que usan los editores para
        // dibujar "transparente": quedó horneado y se ve como un ajedrez. Se le
        // superpone un cordaje de verdad — agujeros redondos en grilla — a cada
        // lado de la cara, sin tocar el modelo.
        const cor = document.createElement('canvas')
        cor.width = cor.height = 256
        const cc = cor.getContext('2d')
        cc.fillStyle = '#1c1c1e'
        cc.fillRect(0, 0, 256, 256)
        cc.globalCompositeOperation = 'destination-out'
        const PASO = 256 / 7
        for (let fx = 0; fx < 7; fx++)
          for (let fy = 0; fy < 7; fy++) {
            cc.beginPath()
            cc.arc((fx + 0.5) * PASO, (fy + 0.5) * PASO, PASO * 0.31, 0, Math.PI * 2)
            cc.fill()
          }
        const texCordaje = new THREE.CanvasTexture(cor)
        texCordaje.wrapS = texCordaje.wrapT = THREE.RepeatWrapping
        texCordaje.repeat.set(2.4, 2.4)
        const matCordaje = new THREE.MeshStandardMaterial({
          color: '#26262a', roughness: 0.85, metalness: 0.05,
          alphaMap: texCordaje, transparent: true, side: THREE.DoubleSide,
        })
        // el disco cubre la zona ancha de la cara, medida más arriba
        const rCara = (anchoMax * (ALTO_PALETA / size.y)) * 0.86
        for (const lado of [1, -1]) {
          const disco = new THREE.Mesh(new THREE.CircleGeometry(rCara, 48), matCordaje)
          disco.position.set(0, ALTO_PALETA * 0.055, lado * ALTO_PALETA * 0.028)
          disco.rotation.y = lado > 0 ? 0 : Math.PI
          paleta.add(disco)
        }
        cont.traverse(o => { if (o.isMesh) o.castShadow = true })
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
      const R_BOLA = 0.29
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
      // La costura de una pelota NO son dos anillos paralelos: es UNA sola línea
      // cerrada que sube y baja dos veces al dar la vuelta. Se traza con una curva
      // que oscila en altura y se apoya sobre la esfera.
      class Costura extends THREE.Curve {
        getPoint(u, destino = new THREE.Vector3()) {
          const a = u * Math.PI * 2
          return destino
            .set(Math.cos(a), 0.78 * Math.sin(2 * a), Math.sin(a))
            .normalize()
            .multiplyScalar(R_BOLA * 1.008)
        }
      }
      const geoCostura = new THREE.TubeGeometry(new Costura(), 220, R_BOLA * 0.055, 8, true)
      const matCostura = new THREE.MeshStandardMaterial({ color: '#fdfdf5', roughness: 0.85 })
      const costuraA = new THREE.Mesh(geoCostura, matCostura)
      const costuraB = new THREE.Mesh(geoCostura, matCostura)
      costuraB.visible = false
      pelota.add(bola, costuraA, costuraB)
      bola.castShadow = true

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

      // La paleta también proyecta: sin sombra propia se ve flotando sobre la
      // cancha por más que esté bien ubicada en el espacio.
      const matSombraPal = new THREE.MeshBasicMaterial({
        color: '#3f5d7d', transparent: true, opacity: 0, depthWrite: false,
      })
      const sombraPal = new THREE.Mesh(new THREE.CircleGeometry(1, 32), matSombraPal)
      sombraPal.rotation.x = -Math.PI / 2
      sombraPal.scale.set(ALTO_PALETA * 0.20, 1, ALTO_PALETA * 0.34)
      scene.add(sombraPal)

      const paquete = new THREE.Group()
      const L = R_BOLA * 2                       // la caja mide esto de cara a cara
      const matCinta = new THREE.MeshStandardMaterial({
        color: '#2563EB', roughness: 0.55, transparent: true, opacity: 0,   // cintas en el azul de la marca
      })
      const geoCintaH = new THREE.BoxGeometry(L * 1.02, L * 0.17, L * 1.02)
      const cintaH = new THREE.Mesh(geoCintaH, matCinta)
      // Una sola cinta, la horizontal. La vertical cruzaba justo por encima del
      // logo y lo dejaba ilegible, azul sobre azul.
      const geoCintaV = new THREE.BoxGeometry(L * 0.17, L * 1.02, L * 1.02)
      const cintaV = new THREE.Mesh(geoCintaV, matCinta)
      cintaV.visible = false
      // etiqueta con el logo, en una cara
      const matEtiqueta = new THREE.MeshStandardMaterial({
        color: '#f3efe6', roughness: 0.9, transparent: true, opacity: 0,
      })
      // proporción 3:1, la del logo: antes el cartel era casi cuadrado y lo estiraba
      const caja = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.72, L * 0.24), matEtiqueta)
      caja.position.set(0, L * 0.26, L * 0.51)   // arriba de la cinta, no encima
      const tapa = new THREE.Mesh(new THREE.PlaneGeometry(L * 0.72, L * 0.24), matEtiqueta)
      tapa.position.set(0, L * 0.26, -L * 0.51)
      tapa.rotation.y = Math.PI
      new THREE.TextureLoader().load('/assets/logo-caja.png', tx => {
        if (disposed) return
        tx.colorSpace = THREE.SRGBColorSpace
        matEtiqueta.map = tx
        matEtiqueta.needsUpdate = true
      })
      paquete.add(cintaH, cintaV, caja, tapa)

      scene.add(codo, pelota, paquete)

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
        // Con la pestaña de fondo el navegador ya frena requestAnimationFrame
        // solo, así que no hace falta nada más para no gastar batería. La versión
        // anterior usaba un IntersectionObserver y, si marcaba "no visible", el
        // bucle se cortaba y la pantalla quedaba en blanco.
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

        // ── Paleta: el mismo golpe del hero de la página pública ──
        // Tres fases sobre un único progreso, como en Paleta3D: carga (w), golpe
        // (sw) y vuelta (rec). El swing sale del codo, así el mango acompaña el
        // arco. Los números son los del golpe "drive" de allá.
        const prog = seg(t, 0.12, 0.48)
        const w   = suave(seg(prog, 0, 0.35))     // carga hacia atrás
        const sw  = suave(seg(prog, 0.35, 0.60))  // suelta el golpe
        const rec = suave(seg(prog, 0.60, 1))     // acompaña y vuelve
        const pico = sw * (1 - rec)               // pico justo en el impacto

        codo.rotation.z = 0.42 * w - 1.10 * sw + 0.70 * rec
        codo.rotation.x = -0.30 * w * (1 - sw)
        // Giro de cara acotado: con -0.95 la paleta mostraba el canto casi de
        // perfil, que es justo la zona con la textura más floja del modelo.
        codo.rotation.y = -0.42 * suave(seg(prog, 0, 0.3)) * (1 - suave(seg(prog, 0.62, 1)))
        // profundidad: carga hacia atrás y empuja al impactar, como allá
        const empuje = 1.4 * (-0.4 * w * (1 - sw) + pico)

        // El codo corrige su posición según el ángulo para que la CARA quede en
        // el punto de impacto: si no, el arco la aleja justo cuando llega la pelota.
        const BRAZO = ALTO_PALETA / 2 + CODO
        codo.position.set(
          IMPACTO.x + Math.sin(codo.rotation.z) * BRAZO,
          IMPACTO.y - Math.cos(codo.rotation.z) * BRAZO,
          IMPACTO.z + empuje
        )
        // La paleta se queda en escena después del golpe: es el producto.
        codo.visible = true

        // ── Pelota ──
        // Nunca se oculta: es esta misma malla la que termina siendo la caja.
        pelota.visible = aEntra > 0.01

        // Cuánto se transformó y cuánto se alineó. Va acá arriba porque de esto
        // depende dónde está el piso para esta forma.
        const cambio = suave(seg(t, 0.68, 0.95))
        const alinea = suave(seg(t, 0.68, 0.90))
        // Una esfera apoya a R del centro mire como mire, pero un CUBO ROTADO
        // apoya sobre una esquina, hasta 1.73·R. Sin esto la caja se hunde en el
        // piso justo mientras se transforma.
        // La caja crece mientras se forma, así que el radio que toca el piso
        // también crece. Antes se usaba el radio sin escalar y la caja terminaba
        // 0.13 unidades hundida.
        const escalaForma = 1 + 0.55 * cambio
        const PISO_FORMA = SUELO_Y + R_BOLA * escalaForma * (1 + 0.732 * cambio * (1 - alinea))

        // Física del tiro. El tiempo avanza LINEAL con el scroll (sin suavizado):
        // si no, la pelota parece frenar y acelerar sola.
        const G = 15, REBOTE = 0.62
        // Salida más fuerte quiere decir más RÁPIDA, no más alta: sube la
        // velocidad de avance y se baja la vertical, si no queda un globo.
        // Verificado: pasa la red con 2.64 de aire, pica en z=18.3 y rebota
        // 3.2 unidades, un solo pique.
        const VZ = 15, VX = 2.1, V0Y = 8.5
        const T_PIQUE = 1.62                     // cuándo toca el piso (calculado)
        let bx, by, bz
        if (t < T_IMPACTO) {
          // ENTRADA por el costado, no de frente a la cámara: antes venía casi
          // pegada al lente y no se leía la trayectoria.
          const te = suave(seg(t, 0.02, T_IMPACTO))
          bx = mix(-17, CONTACTO.x, te)
          bz = mix(3.5, CONTACTO.z, te)
          by = mix(8.2, CONTACTO.y, te) - Math.sin(te * Math.PI) * 1.4
        } else {
          const tv = seg(t, T_IMPACTO, 0.92) * 2.60   // segundos de vuelo: da para UN pique
          const rz = tv < T_PIQUE ? tv : T_PIQUE + (tv - T_PIQUE) * 0.42
          bx = CONTACTO.x + VX * rz
          bz = CONTACTO.z + VZ * rz               // cruza la red y pica del otro lado
          by = balistica(tv, CONTACTO.y, V0Y, G, PISO_FORMA, REBOTE)
        }
        by = Math.max(by, PISO_FORMA)
        by = mix(by, SUELO_Y + R_BOLA * escalaForma + 0.02, suave(seg(t, 0.86, 1.00)))
        pelota.position.set(bx, by, bz)

        // ── Cámara: un giro continuo de 90° alrededor de la pelota ──
        // Se resuelve ANTES que la caja, porque la caja tiene que terminar
        // enfrentando a la cámara para que el logo se lea.
        const sigue = suave(seg(t, 0.24, 0.46))          // suelta la paleta, toma la pelota
        const giro = suave(seg(t, 0.42, 0.90)) * (Math.PI / 2)
        const foco = new THREE.Vector3(IMPACTO.x, IMPACTO.y, IMPACTO.z).lerp(pelota.position, sigue)
        // Arranca cerca para que la paleta se lea como protagonista, y termina
        // un poco más lejos y más alta: pegada al piso, la red entraba de canto
        // cortando la pantalla en diagonal.
        // Calibrado para FOV 34: a 7.5 la paleta ocupa el 63% del alto, igual que
        // en el hero de la página pública. Al final se acerca a 6.5 para que la
        // caja se lea, y desde esa altura la red queda fuera del cuadro en vez
        // de cruzarlo en diagonal.
        const dist = mix(7.5, 6.5, suave(seg(t, 0.40, 0.92)))
        const alto = mix(1.2, 2.4, suave(seg(t, 0.45, 0.92)))
        camera.position.set(
          foco.x + Math.sin(giro) * dist,
          foco.y + alto,
          foco.z + Math.cos(giro) * dist
        )
        camera.lookAt(foco)

        // El sol gira despacio con el guion: con la luz clavada, el tramo largo
        // del vuelo quedaba plano porque nada cambiaba de tono.
        sol.position.set(4 + 9 * suave(t), 8 + 3 * suave(t), 6 - 11 * suave(t))
          sol.intensity = mix(1.6, 1.3, suave(seg(t, 0.3, 0.95)))   // más directa, sombra más definida

        // ── DE PELOTA A ENVÍO ──
        // La misma malla cambia de forma y de color. No se achica ni desaparece
        // para dejarle lugar a otra: es la pelota la que se vuelve caja.
        transformar(cambio)

        // Gira mientras es pelota; al volverse caja se alinea y queda QUIETA, con
        // la cara del logo enfrentando a la cámara. Se calcula en función del
        // scroll (no acumulando) para que ir y volver den lo mismo.
        const vueltas = seg(t, 0.30, 0.72) * 9
        pelota.rotation.x = vueltas * (1 - alinea)
        pelota.rotation.z = vueltas * 0.4 * (1 - alinea)
        pelota.rotation.y = mix(vueltas * 0.3, giro, alinea)

        // Cintas y etiqueta: se apoyan encima y sólo cuando la forma ya es
        // cúbica. Antes se verían flotando alrededor de una esfera.
        const detalle = suave(seg(t, 0.80, 0.98))
        paquete.visible = detalle > 0.01
        matCinta.opacity = detalle
        matEtiqueta.opacity = detalle
        // La caja CRECE al formarse: la pelota nunca se achica, pero el envío
        // termina con más presencia que una pelota de pádel.
        pelota.scale.setScalar(escalaForma)
        paquete.position.copy(pelota.position)
        paquete.rotation.copy(pelota.rotation)
        paquete.scale.setScalar(escalaForma)

        // Los carteles de producto basculan apenas, cada uno con su desfase: da
        // sensación de carrusel sin que ninguno llegue a darse vuelta.
        if (cartelesRef.lista) {
          for (const c of cartelesRef.lista) {
            c.grupo.rotation.y = c.base + Math.sin(t * 5 + c.fase) * 0.20
          }
        }

        // La sombra sigue a la pelota por el piso: se agranda y se aclara cuanto
        // más alto va, como una sombra de verdad.
        // La sombra de la paleta la sigue por el piso: se agranda y se aclara
        // cuanto más alto está, igual que la de la pelota.
        const altPal = Math.max(0, codo.position.y + BRAZO - SUELO_Y)
        sombraPal.position.set(IMPACTO.x, SUELO_Y + 0.02, IMPACTO.z + 0.4)
        sombraPal.scale.set(ALTO_PALETA * 0.20 * (1 + altPal * 0.03), 1, ALTO_PALETA * 0.34 * (1 + altPal * 0.03))
        matSombraPal.opacity = 0   // ya hay sombra real proyectada por el sol

        const altura = Math.max(0, pelota.position.y - SUELO_Y)
        // La sombra ahora la proyecta el sol. La mancha pintada quedaba siempre
        // del mismo tamaño y no seguía la distancia: se apaga.
        sombra.visible = false

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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // La escena queda en un cuadro que ya cuenta el final (la caja formada) y
      // no se crea el pin: antes quedaban siete pantallas de scroll vacío.
      progRef.current.t = 0.97
      return
    }

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

      <section
        ref={stageRef}
        className={`lab-stage relative w-full overflow-hidden ${
          sinMovimiento ? 'min-h-screen py-16' : 'h-screen'
        }`}
      >
        <div ref={mountRef} className="absolute inset-0" />

        {ACTOS.map((a, i) => (
          <div
            key={i}
            className={
              sinMovimiento
                // en columna y sobre un fondo propio: los cinco textos comparten
                // el mismo punto absoluto y, sin la animación que los turna,
                // quedarían encimados e ilegibles
                ? 'acto relative mx-auto w-[min(90vw,560px)] text-left bg-white/85 backdrop-blur rounded-2xl px-5 py-4 mb-3 shadow-card'
                : `acto acto-${i} absolute top-1/2 -translate-y-1/2 w-[min(86vw,380px)] ${
                    a.lado === 'izq' ? 'left-5 sm:left-16 text-left' : 'right-5 sm:right-16 text-right'
                  }`
            }
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
