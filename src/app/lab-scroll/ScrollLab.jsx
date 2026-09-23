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
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// `at` = punto del guion (0 a 1) donde entra cada texto; `lado` deja libre el otro.
// El texto sale del que ya está en la landing pública, no inventado acá: si
// la web dice "Control, potencia y polivalentes", el hero tiene que decir lo
// mismo. Cuando cambie el copy de la landing, hay que actualizar esto.
// Cada texto acompaña lo que se VE en ese momento: el golpe con la tecnología,
// la pelota cruzando la cancha con el envío, la caja que aparece con el pedido.
// Antes "Armalo en dos minutos" salía con la pelota en el aire y no tenía nada
// que ver con la imagen. `fin: true` = no se va: es el cierre y lleva los botones.
const ACTOS = [
  { at: 0.01, lado: 'izq', k: 'Fábrica argentina', t: 'Paletas de pádel',
    d: '15 años fabricando. Control, potencia y polivalentes.' },
  { at: 0.27, lado: 'der', k: 'Tecnología',        t: 'Carbono para cada nivel',
    d: 'Elegís el modelo según cómo jugás.' },
  { at: 0.44, lado: 'izq', k: 'El envío',          t: 'Envíos a todo el país',
    d: 'Directo de fábrica, a donde estés.' },
  { at: 0.70, lado: 'der', k: 'Tu pedido',         t: 'Armalo en dos minutos',
    d: 'Colores, talles y cantidades. Las promos se aplican solas.' },
  { at: 0.86, lado: 'izq', k: 'Cerrás vos',        t: 'Cerrá por WhatsApp',
    d: 'Te llega el pedido redactado para coordinar todo.', fin: true },
]
const DURA_ACTO = 0.13      // cuánto del guion queda en pantalla cada texto

// ── Tiempos del tramo final (en puntos del guion, 0 a 1) ──
// Después del golpe la pelota pica, rebota, y en lo alto del rebote un destello
// la tapa: cuando se apaga, ya es una caja que cae y se asienta. El destello
// existe para esconder el cambio de objeto — el paso intermedio de pelota a
// caja, hecho a la vista, parecía una pelota desinflada.
const RITMO_VUELO = 6.24    // segundos de vuelo por unidad de guion
const T_DESTELLO = 0.70     // pico del destello = lo alto del rebote
const T_APOYO = 0.80        // la caja ya quedó quieta en el piso

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
// La paleta se aleja para que ocupe en pantalla LO MISMO que en el hero
// público. Allá mide 5.2 de alto con la cámara a 11.5, o sea 0.452 de alto por
// unidad de distancia. Acá mide 3.9 y la cámara está en (0, 4.4, 1.5): para dar
// el mismo 0.452 tiene que quedar a 8.63, y de ahí sale este z.
// Si cambiás ALTO_PALETA o la cámara del arranque, rehacé la cuenta.
const IMPACTO = { x: 0, y: 3.2, z: -7.05 }
// La pelota NO debe llegar al centro de la paleta sino a su CARA: la paleta
// tiene 0.33 de grosor y la pelota 0.29 de radio, así que el contacto ocurre
// 0.45 antes. Y en el instante del golpe el swing adelanta la paleta 0.42.
// Sin esto la pelota entraba media unidad dentro del modelo: la atravesaba.
// Sale de IMPACTO y no de un -6 repetido a mano: si se mueve la paleta, el
// punto de contacto la sigue solo.
const CONTACTO = { x: IMPACTO.x, y: IMPACTO.y, z: IMPACTO.z + 0.42 + 0.45 }
// Momento exacto en que la cara pasa por el punto de impacto (mitad del tramo
// de golpe del swing). La pelota tiene que cambiar de rumbo JUSTO acá.
// Mientras golpea, la paleta NO está en CONTACTO: el swing la adelanta con
// `empuje`, así que la cara queda esa distancia más adelante. Esta función es la
// ÚNICA fuente de ese número, y la usan los dos lados: el swing para mover la
// paleta y la pelota para saber a dónde tiene que llegar. Cuando cada uno lo
// calculaba por su cuenta, la pelota apuntaba a la cara en reposo y llegaba con
// el swing ya terminado — por eso la atravesaba.
const empujeDe = (prog, thrust = 0) => {
  const w   = suave(seg(prog, 0, 0.35))
  const sw  = suave(seg(prog, 0.35, 0.60))
  const rec = suave(seg(prog, 0.60, 1))
  return thrust * (-0.4 * w * (1 - sw) + sw * (1 - rec))
}
// Instante del swing en el que la pelota se encuentra con la cara. Es el PICO
// del empuje: el punto más adelantado del swing, donde la paleta deja de ir
// hacia adelante y empieza a volver. Antes estaba en 0.5 y la paleta seguía
// avanzando después del encuentro, así que alcanzaba a la pelota y se la comía
// — cuanto más fuerte el golpe, peor (la volea se hundía un cuarto de unidad).
const P_GOLPE = 0.6

// El guion mueve el swing con `prog = seg(t, 0.12, 0.48)`, así que el golpe
// cae en el t donde ese prog vale P_GOLPE. Estaba clavado en 0.291, que da
// prog 0.475: la pelota salía disparada cuando la paleta todavía venía en
// camino, y se veía atravesarla. Sale de la cuenta para que no puedan volver a
// separarse si se toca alguno de los dos.
const T_IMPACTO = 0.12 + P_GOLPE * (0.48 - 0.12)

// Los cinco tipos de golpe, con los valores exactos del hero de la página
// pública: amplitud del swing lateral (zAmp), sesgo arriba/abajo (xBias), giro
// de cara (yAmp) y empuje en profundidad (thrust).
const SHOTS = {
  drive:  { zAmp: 0.9,  xBias:  0.0,  yAmp: -0.95, thrust: 1.4 },
  volea:  { zAmp: 0.42, xBias:  0.18, yAmp: -0.45, thrust: 1.9 },
  globo:  { zAmp: 0.55, xBias: -0.32, yAmp: -0.5,  thrust: 0.8 },
  remate: { zAmp: 0.6,  xBias:  0.34, yAmp: -0.32, thrust: 1.4 },
  reves:  { zAmp: 0.6,  xBias:  0.05, yAmp: -0.5,  thrust: 1.2, flip: true },
  // El del guion es un drive con MENOS giro de cara. Con el giro del drive
  // (-0.95, unos 54°) la paleta se ponía de canto en la preparación y mostraba
  // el costado, que es justo donde la textura de Meshy quedó mal. Mismo empuje
  // que el drive, así el punto de contacto no cambia.
  guion:  { zAmp: 0.9,  xBias:  0.0,  yAmp: -0.32, thrust: 1.4 },
}

// Dónde está la CARA en ese instante: adelantada por el empuje del tiro del
// guion. La pelota tiene que salir de ahí, no del contacto en reposo.
const CONTACTO_GUION = {
  x: CONTACTO.x,
  y: CONTACTO.y,
  z: CONTACTO.z + empujeDe(P_GOLPE, SHOTS.guion.thrust),
}

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

export default function ScrollLab({ whatsappNumber = '' }) {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const mountRef = useRef(null)
  const progRef = useRef({ t: 0 })   // ← el único puente entre GSAP y Three
  // Quien pide "reducir movimiento" suele hacerlo por mareo o vértigo. No
  // alcanza con no animar: hay que darle la misma historia en forma legible.
  const [sinMovimiento, setSinMovimiento] = useState(false)
  // Se prende cuando llegó la paleta: saca la pantalla de carga
  const [listo, setListo] = useState(false)
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
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/GTAOPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/ShaderPass.js'),
      import('three/examples/jsm/shaders/VignetteShader.js'),
      import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
      import('three/examples/jsm/utils/BufferGeometryUtils.js'),
    ]).then(([THREE, { GLTFLoader }, { MeshoptDecoder },
              { EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass },
              { UnrealBloomPass }, { ShaderPass }, { VignetteShader },
              { RoundedBoxGeometry }, { mergeVertices }]) => {
      if (disposed) return
      const mount = mountRef.current
      if (!mount) return

      const W = () => mount.clientWidth || 1
      const H = () => mount.clientHeight || 1

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#eef2f8')
      // Niebla atmosférica. Es LA clave de profundidad que faltaba: sin ella
      // un arbusto a 10 metros y uno a 150 llegan al ojo con el mismo contraste
      // y el mismo color, así que el cerebro los lee a la misma distancia y la
      // escena se aplana. El color es la banda media del degradé del cielo (el
      // stop 0.55 de más abajo), para que lo lejano se disuelva en el horizonte
      // en vez de recortarse contra él.
      // Arranca RECIÉN a 105, o sea pasada toda la cancha y el mobiliario: a 45
      // teñía de gris cosas de media distancia y apagaba el celeste de la
      // marca. Ahora sólo toca el seto y el club, que es lo único que tiene que
      // fundirse con el horizonte.
      // OJO: el domo de cielo tiene radio 170. `far` TIENE que quedar por
      // debajo o la niebla no llega a cerrar y se ve el corte del domo.
      // El gris que quedaba no venía tanto de la densidad como del COLOR: un
      // celeste desaturado tiñe de gris todo lo que toca. Este tiene el celeste
      // de la marca adentro, así que lo lejano se va a celeste, no a gris.
      // Septiembre 2026: casi sin niebla. Arrancaba en 105 y a esa distancia
      // están los árboles y el cerco, así que todo el fondo se fundía en una
      // bruma celeste que se sentía como una pared (probado en un iPhone 15).
      // Ahora apenas vela lo más lejano. Ya no hace falta para esconder el
      // borde del mundo: eso lo tapan las lomas lejanas, que dan la vuelta
      // completa y llegan hasta el piso.
      scene.fog = new THREE.Fog('#cfe4f7', 140, 400)   // el color del horizonte del cielo
      // (Hubo una niebla antes que lavaba el fondo: era densa y arrancaba
      // demasiado cerca. La de arriba empieza recién pasada la cancha.)

      // FOV 34 como el hero de la página pública: menos distorsión de
      // perspectiva y la paleta se lee del mismo modo.
      const camera = new THREE.PerspectiveCamera(34, W() / H(), 0.1, 400)
      // preserveDrawingBuffer permite leer el cuadro ya dibujado (para
      // inspeccionarlo con window.__lab). Cuesta rendimiento, así que sólo en
      // desarrollo: en producción nadie lee el cuadro.
      const inspeccion = process.env.NODE_ENV !== 'production'
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: inspeccion })
      // Sin curva de exposición, las zonas claras se van a blanco puro y todo
      // queda plano y quemado — es buena parte de lo que se lee como "barato".
      // ACES comprime las altas luces como lo hace una cámara de verdad.
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 0.96
      // Sombras reales: apoyan los objetos en el piso mejor que cualquier truco.
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
      renderer.setSize(W(), H())
      mount.appendChild(renderer.domElement)

      // ── OCLUSIÓN AMBIENTAL ──
      // Las sombras proyectadas dicen dónde pega el sol, pero no oscurecen los
      // rincones: donde el alambrado toca el piso, debajo del banco, entre los
      // bollos de un arbusto. Sin eso los objetos parecen apoyados encima de la
      // escena en vez de estar adentro, y es buena parte de lo que se lee como
      // "barato". GTAO calcula ese oscurecimiento por geometría, cada cuadro.
      const composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      const gtao = new GTAOPass(scene, camera, W(), H())
      gtao.output = GTAOPass.OUTPUT.Default        // AO mezclado, no el AO solo
      // Radio en unidades de la escena: 1 unidad ~ 15,5 cm, así que 6 son unos
      // 90 cm — el tamaño de los recovecos que queremos marcar.
      gtao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.2, thickness: 1.4,
                                scale: 1.1, samples: 8 })
      // El AO es un pase entero de pantalla y cuesta. En un celular ese costo
      // sale del mismo presupuesto que la animación, y un hero que se traba es
      // peor que un hero sin oclusión: se apaga solo en pantallas chicas y en
      // equipos de pocos núcleos. En desktop queda prendido.
      const equipoFlojo = (navigator.hardwareConcurrency || 4) <= 4
      gtao.enabled = W() >= 900 && !equipoFlojo
      composer.addPass(gtao)
      // Escena aparte para los efectos de luz (el destello de la caja). Si van
      // en la escena principal, la oclusión ambiental los dibuja como un plano
      // sólido — sin la orientación hacia la cámara que tiene un sprite — y
      // deja una mancha negra enorme cruzando el cuadro. Se dibujan encima,
      // después de la oclusión y antes del bloom, así el destello además brilla.
      const escenaFx = new THREE.Scene()
      const pasoFx = new RenderPass(escenaFx, camera)
      pasoFx.clear = false
      composer.addPass(pasoFx)
      // Bloom muy contenido: el umbral alto hace que sólo florezca lo que ya
      // está casi blanco (el reflejo del sol en el dorado de la paleta, el
      // brillo del vidrio). Esto es una marca deportiva: si se nota que hay
      // bloom, está de más.
      // A resolución completa este pase costaba 8,2 ms — más que la oclusión
      // ambiental, para un efecto que casi no se ve. A la mitad cuesta un
      // cuarto y, siendo un halo difuso, no se distingue. Se apaga con el mismo
      // criterio que el AO.
      const bloom = new UnrealBloomPass(new THREE.Vector2(W() / 2, H() / 2), 0.13, 0.5, 0.92)
      bloom.enabled = gtao.enabled
      composer.addPass(bloom)
      composer.addPass(new OutputPass())           // tonemapping va al final
      // Viñeta apenas marcada, DESPUÉS del tonemapping para que el valor sea
      // predecible. Baja la luminancia de las esquinas sin cambiarles el tono,
      // así el ojo cae al centro del cuadro. Con `darkness` alto se ensucia de
      // gris y rompe el blanco de la marca: 0.85 es el techo acá.
      const vineta = new ShaderPass(VignetteShader)
      vineta.uniforms.offset.value = 1.15
      // 0.6 (era 0.85): con las esquinas más oscuras el cuadro se sentía cerrado
      vineta.uniforms.darkness.value = 0.6
      composer.addPass(vineta)
      // Corrección de color final: un poco más de contraste y de saturación.
      // La escena tenía un velo gris lavado — mucho relleno de ambiente y nada
      // que lo compense — y se veía menos nítida que el hero público. Es una
      // cuenta por píxel, no cuesta casi nada.
      const grading = new ShaderPass({
        uniforms: { tDiffuse: { value: null }, contraste: { value: 1.08 }, saturacion: { value: 1.12 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
          uniform sampler2D tDiffuse; uniform float contraste; uniform float saturacion;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(tDiffuse, vUv);
            vec3 col = (c.rgb - 0.5) * contraste + 0.5;
            float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col = mix(vec3(l), col, saturacion);
            gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a);
          }`,
      })
      composer.addPass(grading)
      composer.setSize(W(), H())
      composer.setPixelRatio(Math.min(devicePixelRatio, 2))

      // Iluminación de entorno: el modelo real necesita reflejos para verse bien
      const pmrem = new THREE.PMREMGenerator(renderer)
      // Sonda de entorno EXTERIOR, dibujada acá mismo. Antes se usaba
      // RoomEnvironment, que es un cuarto cerrado: todos los materiales
      // recibían el rebote de cuatro paredes y un techo, y por eso el metal y
      // el vidrio devolvían reflejos de interior en una cancha al aire libre.
      // Es un equirectangular: la horizontal recorre los 360° alrededor y la
      // vertical va del cenit al nadir. Mismo degradé que el domo de cielo,
      // más el sol en la MISMA dirección que la DirectionalLight de abajo, para
      // que el reflejo caiga donde cae la luz.
      const SOL_DIR = [4, 8, 6]
      const ibl = document.createElement('canvas')
      ibl.width = 512; ibl.height = 256
      {
        const c = ibl.getContext('2d')
        const g = c.createLinearGradient(0, 0, 0, 256)
        g.addColorStop(0, '#bcd8f4')      // cenit
        g.addColorStop(0.42, '#dceaf8')
        g.addColorStop(0.5, '#eaf4fd')    // horizonte: el mismo de la niebla
        g.addColorStop(0.58, '#dfe7ec')   // ya es suelo, apenas más gris
        g.addColorStop(1, '#c9d4dc')      // nadir: rebote del piso, claro
        c.fillStyle = g
        c.fillRect(0, 0, 512, 256)
        // el sol, en la dirección exacta de la luz principal
        const [sx, sy, sz] = SOL_DIR
        const len = Math.hypot(sx, sy, sz)
        const u = (Math.atan2(sz / len, sx / len) / (Math.PI * 2)) * 512
        const vv = (Math.acos(sy / len) / Math.PI) * 256
        const halo = c.createRadialGradient(u, vv, 0, u, vv, 62)
        halo.addColorStop(0, '#fffdf6')
        halo.addColorStop(0.18, '#fff8e9')
        halo.addColorStop(1, 'rgba(255,248,233,0)')
        c.fillStyle = halo
        c.fillRect(u - 62, vv - 62, 124, 124)
      }
      const texIbl = new THREE.CanvasTexture(ibl)
      texIbl.mapping = THREE.EquirectangularReflectionMapping
      texIbl.colorSpace = THREE.SRGBColorSpace
      scene.environment = pmrem.fromEquirectangular(texIbl).texture
      texIbl.dispose()
      // Sube de 0.38 a 0.55: este entorno es más parejo y más claro que el
      // cuarto, así que con el valor viejo las sombras quedaban muertas.
      // Baja de 0.55 a 0.42: el ambiente ilumina TODO por igual y, pasado
      // cierto punto, aplana los colores y los empuja al gris. Con el sol más
      // fuerte ya no hace falta tanto relleno.
      // Baja de 0.42 a 0.32 junto con el hemisférico: el relleno parejo era lo
      // que dejaba todo con el mismo valor y sin volumen. El sol sube para
      // compensar, así la escena no se oscurece: sólo gana contraste.
      scene.environmentIntensity = 0.32
      scene.add(new THREE.HemisphereLight('#ffffff', '#c3d1e5', 0.22))   // menos relleno = sombra más marcada
      // Sube de 1.15 a 1.6 y se entibia: el pedido era que el día se vea
      // SOLEADO. Con el relleno un poco más bajo, la diferencia entre la cara
      // iluminada y la sombra crece, que es lo que hace leer un mediodía y no
      // un día nublado.
      // Más cálido y más fuerte que antes (1.6, #fff4e0): un mediodía de sol se
      // lee por la diferencia entre la cara iluminada y la sombra.
      const sol = new THREE.DirectionalLight('#ffe8c4', 2.0)
      sol.position.set(...SOL_DIR)   // el mismo vector que el sol del entorno
      sol.castShadow = true
      // El mapa cubre 180 x 180 unidades: a 1024 eran 5,7 píxeles por unidad y
      // la sombra de la paleta salía como una mancha borrosa. A 2048 se
      // duplica, salvo en equipos flojos o pantallas chicas.
      const sombraFina = W() >= 900 && (navigator.hardwareConcurrency || 4) > 4
      sol.shadow.mapSize.set(sombraFina ? 2048 : 1024, sombraFina ? 2048 : 1024)
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

      // Dónde está cada cancha del club. UNA sola lista, y de acá salen las dos
      // cosas: qué canchas se dibujan y de dónde hay que sacar los objetos del
      // entorno. Antes había dos versiones que no se hablaban — los arbustos
      // esquivaban tres canchas puestas a lo ancho que no existían, y la única
      // cancha que se dibujaba estaba al fondo, así que nadie la esquivaba. Ese
      // era el desorden: plantas creciendo adentro de la cancha de al lado.
      const SEPARACION = 22            // el pasillo entre cancha y cancha
      // La vecina está en la MISMA posición en la que la dibuja hacerVecina
      // (antes esta lista decía -87 y se dibujaba en -91).
      const CANCHAS = [
        { x: 0, z: RED_Z, principal: true },
        { x: -(CANCHA_ANCHO + 26), z: RED_Z },                         // la de al lado
        // NO agregar una cancha al fondo: empuja el seto perimetral fuera del
        // domo de cielo (radio 170) y el horizonte queda pelado. El club se
        // lee igual con dos canchas.
      ]
      // ¿Este punto está fuera de TODAS las canchas, con su vereda incluida?
      const libre = (x, z, margen = 12) => CANCHAS.every(c =>
        Math.abs(x - c.x) > CANCHA_ANCHO / 2 + margen ||
        Math.abs(z - c.z) > CANCHA_LARGO / 2 + margen)

      // Domo de cielo: un degradé suave alrededor de todo, para que fuera de la
      // cancha no quede el vacío blanco. Va por dentro de una esfera enorme, así
      // acompaña el giro de la cámara (un fondo plano se delataría al rotar).
      // El canvas pasa de 4 px de ancho a 1024 porque ahora lleva nubes, y una
      // tira de 4 px sólo puede tener degradé vertical.
      const cieloCnv = document.createElement('canvas')
      cieloCnv.width = 1024; cieloCnv.height = 512
      const cieloCtx = cieloCnv.getContext('2d')
      const grad = cieloCtx.createLinearGradient(0, 0, 0, 512)
      // Más saturado que antes, sobre todo cerca del horizonte: con el club
      // abierto se ve mucho más cielo, y el celeste casi blanco de antes hacía
      // que pareciera un día de niebla.
      grad.addColorStop(0, '#6aaee8')      // arriba: celeste de día despejado
      grad.addColorStop(0.34, '#9ccbf1')
      grad.addColorStop(0.5, '#c9e2f8')    // el horizonte
      grad.addColorStop(0.62, '#dcedfb')
      grad.addColorStop(1, '#eef6fe')
      cieloCtx.fillStyle = grad
      cieloCtx.fillRect(0, 0, 1024, 512)
      // Nubes: cada una son varios óvalos difusos superpuestos, que es lo que
      // hace que se lea como nube y no como una mancha. Las posiciones salen de
      // una cuenta fija y no de Math.random, para que el cielo sea siempre el
      // mismo y no cambie de una recarga a otra.
      for (let n = 0; n < 9; n++) {
        const cx = ((n * 137) % 100) / 100 * 1024
        const cy = 70 + ((n * 53) % 100) / 100 * 110
        const esc = 0.7 + ((n * 31) % 60) / 100
        cieloCtx.save()
        cieloCtx.globalAlpha = 0.5 + ((n * 17) % 30) / 100
        for (let b = 0; b < 5; b++) {
          const bx = cx + (b - 2) * 34 * esc
          const by = cy + ((b % 2) ? -9 : 6) * esc
          const r = (30 + (b === 2 ? 16 : 0)) * esc
          const gr = cieloCtx.createRadialGradient(bx, by, 0, bx, by, r)
          gr.addColorStop(0, 'rgba(255,255,255,0.95)')
          gr.addColorStop(0.55, 'rgba(255,255,255,0.55)')
          gr.addColorStop(1, 'rgba(255,255,255,0)')
          cieloCtx.fillStyle = gr
          cieloCtx.beginPath(); cieloCtx.ellipse(bx, by, r * 1.5, r, 0, 0, Math.PI * 2); cieloCtx.fill()
        }
        cieloCtx.restore()
      }
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

      // ── PANTALLAS LED DE TORNEO ──
      // Donde había una lona azul fija ahora hay una pantalla como las de los
      // torneos: fondo azul de la marca, el logo y mensajes que corren despacio.
      // Está justo detrás de la paleta, así que es lo que le da vida a su fondo
      // sin competirle: se mueve lento y es del mismo azul que ya estaba.
      // Los mensajes salen de la landing, como los textos del guion.
      const LED_W = 2048, LED_H = 224          // 9,3 : 1, la proporción de la pantalla
      const ledCnv = document.createElement('canvas')
      ledCnv.width = LED_W; ledCnv.height = LED_H
      const lx = ledCnv.getContext('2d')
      const texLona = new THREE.CanvasTexture(ledCnv)
      texLona.colorSpace = THREE.SRGBColorSpace
      texLona.wrapS = THREE.RepeatWrapping      // para que el contenido corra sin corte
      texLona.anisotropy = 4
      // Sin iluminación y sin tonemapping: es una pantalla, emite su propia luz.
      // El blanco del texto pasa el umbral del bloom y brilla apenas, como un LED.
      const matLona = new THREE.MeshBasicMaterial({ map: texLona, toneMapped: false })
      // Frases de la landing que NO dice el guion: con "Fábrica argentina" o
      // "Envíos a todo el país" la pantalla repetía, justo detrás, el texto que
      // estaba en primer plano.
      const MENSAJES = ['DISEÑOS PERSONALIZADOS', 'PARA CLUBES Y EVENTOS', '15 AÑOS EN EL MERCADO']
      const pintarLed = (logo) => {
        const g = lx.createLinearGradient(0, 0, 0, LED_H)
        g.addColorStop(0, '#1d4ed8')
        g.addColorStop(0.5, '#2563EB')
        g.addColorStop(1, '#1d4ed8')
        lx.fillStyle = g
        lx.fillRect(0, 0, LED_W, LED_H)
        // Tamaño contenido: con letra de 74 px el texto competía con el
        // titular y con la paleta, justo detrás de ella.
        const altoLogo = 62
        const anchoLogo = logo ? altoLogo * (logo.width / logo.height) : 0
        // el cuerpo de letra más grande que entre con aire entre pieza y pieza
        let fs = 50, anchos = []
        do {
          lx.font = `800 ${fs}px Inter, system-ui, sans-serif`
          anchos = MENSAJES.map(m => lx.measureText(m).width)
          fs -= 2
        } while (anchos.reduce((a, b) => a + b, 0) + anchoLogo + 4 * 110 > LED_W && fs > 30)
        const piezas = [{ ancho: anchoLogo, logo: true }, ...MENSAJES.map((m, i) => ({ ancho: anchos[i], texto: m }))]
        const hueco = (LED_W - piezas.reduce((a, q) => a + q.ancho, 0)) / piezas.length
        lx.textBaseline = 'middle'
        let x = hueco / 2
        for (const q of piezas) {
          // separador: un punto celeste en el medio del hueco anterior. El
          // primero cae en el borde y se dibuja también del otro lado, así el
          // corte al repetir no se nota.
          const sep = x - hueco / 2
          lx.fillStyle = 'rgba(191,219,254,0.9)'
          for (const sx of sep < 12 ? [sep, sep + LED_W] : [sep]) {
            lx.beginPath(); lx.arc(sx, LED_H / 2, 7, 0, Math.PI * 2); lx.fill()
          }
          lx.fillStyle = 'rgba(255,255,255,0.88)'
          if (q.logo && logo) lx.drawImage(logo, x, LED_H / 2 - altoLogo / 2, anchoLogo, altoLogo)
          else if (q.texto) lx.fillText(q.texto, x, LED_H / 2 + 4)
          x += q.ancho + hueco
        }
        // líneas de barrido muy suaves: la textura de una pantalla de LEDs
        lx.fillStyle = 'rgba(0,0,0,0.10)'
        for (let y = 0; y < LED_H; y += 4) lx.fillRect(0, y, LED_W, 1)
        texLona.needsUpdate = true
      }
      pintarLed(null)

      // El logo va en blanco: se pinta usando el logo como recorte. Se arma una
      // sola vez, grande, y de ahí sale para la pantalla, la franja de los
      // carteles, la cinta de la caja y las banderas.
      const imgLogo = new Image()
      imgLogo.crossOrigin = 'anonymous'
      imgLogo.onload = () => {
        if (disposed) return
        const alto = 128
        const ancho = alto * (imgLogo.width / imgLogo.height || 3)
        const aux = document.createElement('canvas')
        aux.width = Math.ceil(ancho); aux.height = Math.ceil(alto)
        const ax = aux.getContext('2d')
        ax.drawImage(imgLogo, 0, 0, ancho, alto)
        ax.globalCompositeOperation = 'source-in'
        ax.fillStyle = '#ffffff'
        ax.fillRect(0, 0, ancho, alto)
        pintarLed(aux)
        // el mismo logo blanco, centrado, en la franja de los carteles
        const az = 40, anz = az * (imgLogo.width / imgLogo.height || 3)
        zocCtx.drawImage(aux, 256 - anz / 2, 32 - az / 2, anz, az)
        texZocalo.needsUpdate = true
        // en las banderas, a lo alto (se lee de abajo hacia arriba)
        pintarBanderas(aux)
        // y en la cinta de la caja, dos veces a lo largo
        const ac = 30, anc = ac * (imgLogo.width / imgLogo.height || 3)
        ;[128, 384].forEach(cx => cintaCtx.drawImage(aux, cx - anc / 2, 32 - ac / 2, anc, ac))
        texCinta.needsUpdate = true
      }
      imgLogo.src = '/assets/logo-horizontal.png'

      const LONA_ALTO = 7
      ;[-1, 1].forEach(lado => {
        const lona = new THREE.Mesh(new THREE.PlaneGeometry(CANCHA_ANCHO, LONA_ALTO), matLona)
        // Del lado de AFUERA del cristal, como en las canchas de verdad
        lona.position.set(0, SUELO_Y + LONA_ALTO / 2 + 0.4, RED_Z + lado * (CANCHA_LARGO / 2 + 0.6))
        lona.rotation.y = lado > 0 ? Math.PI : 0
        scene.add(lona)
        // el gabinete de la pantalla: un marco oscuro con espesor, detrás
        const gabinete = new THREE.Mesh(
          new THREE.BoxGeometry(CANCHA_ANCHO + 0.8, LONA_ALTO + 0.8, 0.9),
          new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6, metalness: 0.3 })
        )
        gabinete.position.copy(lona.position)
        gabinete.position.z += lado * 0.5
        gabinete.rotation.y = lona.rotation.y
        scene.add(gabinete)
      })

      // ── MOBILIARIO DEL CLUB ──
      // Modelos CC0 de Poly Haven (uso comercial libre, sin atribución). Se
      // eligieron sobre generarlos con IA: están modelados por artistas, vienen
      // con texturas coherentes y pesan una fracción. El alambrado es además lo
      // que rodea una cancha de pádel de verdad.
      const ponerModelo = (ruta, colocar, soloEstas = null) => {
        loader.load(ruta, gltf => {
          if (disposed) return
          const o = gltf.scene
          // Algunos modelos vienen como KIT de piezas sueltas repartidas por el
          // archivo (el banco trae patas, asiento, respaldo y conectores por
          // separado). Si se cargan todas juntas se ven amontonadas, así que se
          // deja sólo lo que arma la pieza.
          if (soloEstas) {
            // Coincidencia EXACTA, no parcial: buscar "seat" dentro del nombre
            // también dejaba pasar "seat_bench", que es otro asiento suelto del
            // kit y aparecía como una tabla flotando al costado del banco.
            o.traverse(m => {
              if (m.isMesh) m.visible = soloEstas.includes(m.name)
            })
          }
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

      // ── BANCOS ──
      // Hechos por código. El modelo del kit se descartó después de tres
      // intentos: viene como piezas sueltas y, mires como lo mires, alguna
      // quedaba desprendida. Un banco son cuatro formas simples y así queda
      // limpio, pesa cero y se ajusta con números.
      const matListón = new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: 0.85 })
      const matHierro = new THREE.MeshStandardMaterial({ color: '#243447', roughness: 0.5, metalness: 0.4 })
      const hacerBanco = () => {
        const b2 = new THREE.Group()
        const LARGO = 11.6, ALTO = 5.6, FONDO = 4.2
        // patas: dos marcos en U invertida
        ;[-1, 1].forEach(lado => {
          const x = lado * (LARGO / 2 - 0.9)
          ;[-1, 1].forEach(d => {
            const pata = new THREE.Mesh(new THREE.BoxGeometry(0.34, ALTO * 0.52, 0.34), matHierro)
            pata.position.set(x, ALTO * 0.26, d * FONDO * 0.32)
            b2.add(pata)
          })
          const trav = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, FONDO * 0.7), matHierro)
          trav.position.set(x, ALTO * 0.52, 0)
          b2.add(trav)
          // respaldo inclinado
          const sop = new THREE.Mesh(new THREE.BoxGeometry(0.3, ALTO * 0.55, 0.3), matHierro)
          sop.position.set(x, ALTO * 0.78, -FONDO * 0.3)
          sop.rotation.x = -0.18
          b2.add(sop)
        })
        // listones del asiento
        for (let i = 0; i < 4; i++) {
          const l = new THREE.Mesh(new THREE.BoxGeometry(LARGO, 0.26, 0.82), matListón)
          l.position.set(0, ALTO * 0.55, -FONDO * 0.28 + i * 0.98)
          b2.add(l)
        }
        // listones del respaldo
        for (let i = 0; i < 3; i++) {
          const l = new THREE.Mesh(new THREE.BoxGeometry(LARGO, 0.72, 0.24), matListón)
          l.position.set(0, ALTO * 0.66 + i * 0.86, -FONDO * 0.33 - i * 0.16)
          l.rotation.x = -0.18
          b2.add(l)
        }
        b2.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        return b2
      }

      // Todo lo de afuera va SÓLO sobre el arco que recorre la cámara: entre
      // mirar al fondo y mirar al costado. Poner cosas donde nunca se miran es
      // peso que se descarga para nada.
      // El arco tiene que cubrir TODO lo que la cámara llega a mirar. Arranca
      // mirando al fondo (-Z) y termina mirando al costado (-X), así que el
      // fondo visible barre de -Z hasta -X. Antes iba de -Z a +Z y dejaba la
      // zona del final completamente vacía: ahí estaba el fondo pelado.
      const enArco = (frac, radio, desvio = 0) => {
        const ang = -Math.PI / 2 - 0.55 - frac * 2.15 + desvio
        // Un radio fijo no alcanza: la cancha es rectangular, así que el mismo
        // radio cae afuera por los lados y ADENTRO por las puntas. Se empuja
        // hasta salir del rectángulo (más el ancho de la vereda).
        const MARGEN = 14
        let r = radio
        for (let i = 0; i < 60; i++) {
          const x = Math.cos(ang) * r
          const z = RED_Z + Math.sin(ang) * r
          if (libre(x, z, MARGEN)) return [x, z]
          r += 5
        }
        return [Math.cos(ang) * r, RED_Z + Math.sin(ang) * r]
      }

      // Farolas: dan altura y marcan el perímetro
      ponerModelo('/models/farola.glb', (base) => {
        [0.06, 0.42, 0.78].forEach((f, i) => {
          const [x, z] = enArco(f, 106)
          const l = base.clone()
          l.scale.multiplyScalar(38)                  // ~5.9 m
          l.position.set(x, SUELO_Y, z)
          l.rotation.y = Math.atan2(-x, RED_Z - z)
          afuera.add(l)
        })
      })

      // Maceteros contra la vereda, cada uno con su planta adentro
      const LUGARES_MACETA = [0.14, 0.3, 0.58, 0.74]
      ponerModelo('/models/macetero.glb', (base) => {
        LUGARES_MACETA.forEach(f => {
          const [x, z] = enArco(f, 62)
          const m = base.clone()
          m.scale.multiplyScalar(5.2)                 // ~0.8 m
          m.position.set(x, SUELO_Y, z)
          m.rotation.y = Math.atan2(-x, RED_Z - z)
          afuera.add(m)
        })
      })
      // La planta va aparte: el macetero viene vacío, es sólo el cajón
      ponerModelo('/models/planta.glb', (base) => {
        LUGARES_MACETA.forEach((f, i) => {
          const [x, z] = enArco(f, 62)
          const pl = base.clone()
          pl.scale.multiplyScalar(4.4 + (i % 2) * 0.8)
          pl.position.set(x, SUELO_Y + 3.4, z)        // apoyada sobre el borde del cajón
          pl.rotation.y = i * 1.9
          afuera.add(pl)
        })
      })

      // Los bancos van sobre el mismo arco que el resto. Antes tenían su
      // posición escrita a mano, 3 unidades MÁS CERCA que el borde de la
      // vereda: eran lo único adelantado de la escena, y con la cámara casi a
      // ras del piso el encuadre los cortaba al medio. Eso era el "banco
      // bugeado" — el modelo siempre estuvo bien, estaba mal ubicado.
      ;[0.22, 0.5, 0.86].forEach(f => {
        const [x, z] = enArco(f, 74)
        const b2 = hacerBanco()
        b2.position.set(x, SUELO_Y, z)
        b2.rotation.y = Math.atan2(-x, RED_Z - z)   // mirando a la cancha
        afuera.add(b2)
      })

      // ── ARBUSTOS ──
      // Hechos por código, igual que el banco y la red. Los modelos descargados
      // traían las hojas una por una y textura fotográfica: al lado de una
      // cancha de color liso y una red de líneas desentonaban, y aplanarles la
      // textura no alcanzó. El problema no era el color, era el NIVEL DE
      // DETALLE — un objeto fotográfico entre objetos esquemáticos canta.
      // Cambio de estilo: antes eran icosaedros de pocas caras con flatShading,
      // y al lado de una paleta hiperrealista se leían como "videojuego viejo".
      // Ahora son masas suaves: más subdivisión, la superficie ondulada con
      // ruido (bollos de follaje, no una bola lisa) y sombreado continuo.
      // Sigue siendo estilizado — nada de hojas una por una — pero moderno.
      const hacerGeoFollaje = (detalle, relieve = 1) => {
        // El icosaedro viene con cada triángulo suelto (sin vértices
        // compartidos): recalcular normales así da luz plana cara por cara, o
        // sea las mismas facetas de antes. Se unen los vértices primero.
        const base = new THREE.IcosahedronGeometry(1, detalle)
        base.deleteAttribute('normal')
        base.deleteAttribute('uv')
        const geo = mergeVertices(base)
        base.dispose()
        const pos = geo.attributes.position
        const v = new THREE.Vector3()
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i)
          // Ruido fijo (senos cruzados), no Math.random: todos los arbustos
          // comparten esta geometría y tiene que ser siempre la misma.
          const r = 1 + relieve * (
            0.09 * Math.sin(v.x * 5.1 + v.y * 2.3) * Math.cos(v.z * 4.7 - v.y * 1.9)
            + 0.05 * Math.sin(v.x * 11.3 - v.z * 9.1 + v.y * 7.7))
          v.multiplyScalar(r)
          pos.setXYZ(i, v.x, v.y, v.z)
        }
        geo.computeVertexNormals()
        return geo
      }
      // Los arbustos cercanos son pocos y van con 1280 caras. El seto son 390
      // copias enormes a lo lejos: con 320 caras y el relieve más suave alcanza
      // — lo facetado venía de las normales planas, no de la cantidad de caras
      // (ver hacerGeoFollaje). Con 1280 sumaba 375 mil triángulos para nada.
      const geoFollaje = hacerGeoFollaje(3)
      const geoSeto = hacerGeoFollaje(2, 0.6)
      // Verdes un poco más profundos: con el sol más fuerte, los claros de
      // antes se iban a verde agua.
      const VERDES = ['#4f7f40', '#5e8c48', '#416b36', '#6a9752']
      const matFollaje = VERDES.map(c => new THREE.MeshStandardMaterial({
        color: c, roughness: 0.95,
      }))
      // Un arbusto son dos o tres bollos pegados: así no es una bola perfecta
      const hacerArbusto = (alto, semilla) => {
        const g = new THREE.Group()
        const bollos = 2 + (semilla % 2)
        for (let i = 0; i < bollos; i++) {
          const b = new THREE.Mesh(geoFollaje, matFollaje[(semilla + i) % VERDES.length])
          const r = alto * (0.52 - i * 0.09)
          b.scale.set(r * 1.25, r, r * 1.25)              // achatado, como un arbusto
          b.position.set((i - 0.5) * alto * 0.38, r * 0.86, ((semilla + i) % 3 - 1) * alto * 0.2)
          b.castShadow = true
          b.receiveShadow = true
          g.add(b)
        }
        return g
      }
      // Tres portes, para que el verde no sea liso ni repetido
      ;[
        // más bajos que antes (15 / 10 / 6): eran parte de la pared verde
        [[0.04, 0.34, 0.68, 0.92], 9, 96],                        // grandes, al fondo
        [[0.16, 0.46, 0.8], 7, 74],                               // medianos
        [[0.1, 0.26, 0.4, 0.56, 0.72, 0.88], 5, 62],              // chicos, cerca
      ].forEach(([lugares, alto, radio], fila) => {
        lugares.forEach((f, i) => {
          const [x, z] = enArco(f, radio + (i % 3) * 14, (i % 2 ? 0.09 : -0.09))
          const a2 = hacerArbusto(alto * (0.82 + (i % 3) * 0.16), fila * 3 + i)
          a2.position.set(x, SUELO_Y, z)
          a2.rotation.y = i * 1.7
          afuera.add(a2)
        })
      })

      // ── EL LOCAL ──
      // Del modelo de Meshy se usan SOLO las piezas del local (fachada, vidrio,
      // puerta, techo, cartel, mostrador y estantes): la cancha y los árboles
      // que traía ya los tenemos hechos. Quedó en 11 KB.
      // Viene sin materiales, que en este caso es una ventaja: se pinta con la
      // paleta de la marca en vez de pelear contra una textura ajena.
      const PINTURA = {
        ShopFloor:   { color: '#dfe7ee', roughness: 0.95 },
        ShopBody:    { color: '#f4f8fb', roughness: 0.9 },
        ShopFacade:  { color: '#ffffff', roughness: 0.85 },
        // El vidrio va CASI opaco a propósito. Con opacidad baja se veía el
        // interior del local, que no tiene luz propia, y quedaba un rectángulo
        // negro enorme en pantalla — justo lo que la marca no admite. Así se
        // lee como vidrio con reflejo de cielo, que es como se ve de día.
        ShopGlass:   { color: '#d8e9f5', roughness: 0.12, metalness: 0.3,
                       transparent: true, opacity: 0.94 },
        ShopDoor:    { color: '#2E9BD6', roughness: 0.6 },
        ShopRoof:    { color: '#2E9BD6', roughness: 0.75 },
        ShopSign:    { color: '#12719F', roughness: 0.6 },
        ShopCounter: { color: '#e4ebf1', roughness: 0.85 },
      }
      const matEstante = new THREE.MeshStandardMaterial({ color: '#cdd9e3', roughness: 0.85 })
      ponerModelo('/models/shop.glb', (base) => {
        base.traverse(o => {
          if (!o.isMesh) return
          const receta = PINTURA[o.name] || (o.name.startsWith('Shelf_') ? null : null)
          o.material = receta ? new THREE.MeshStandardMaterial(receta) : matEstante
          o.castShadow = true
          o.receiveShadow = true
        })
        // ponerModelo deja todo normalizado a 1 de alto, así que la escala real
        // va acá: 26 unidades son unos 4 m, la altura de un local.
        base.scale.multiplyScalar(26)
        // Va en el pasillo entre las dos canchas, del lado al que la cámara
        // termina mirando: así entra en cuadro sobre el final del scroll.
        // Pegado al fondo del pasillo y corrido: a -46 quedaba tan cerca que
        // ocupaba la franja superior entera del cuadro final.
        base.position.set(-52, SUELO_Y, 40)
        base.rotation.y = Math.PI / 2      // el frente mira a la cancha
        afuera.add(base)
      })

      // ── ZONA DE DESCANSO ──
      // Entre las dos canchas, justo donde la cámara termina mirando. Mesas con
      // sombrilla, hechas por código: son cilindros y conos, no vale traer un
      // modelo para esto.
      const matMesa = new THREE.MeshStandardMaterial({ color: '#e8edf2', roughness: 0.75 })
      const matCano = new THREE.MeshStandardMaterial({ color: '#4a5c70', roughness: 0.5, metalness: 0.35 })
      const matTela = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.9, side: THREE.DoubleSide })
      const hacerMesa = (x, z, giro) => {
        const g = new THREE.Group()
        const tapa = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.34, 20), matMesa)
        tapa.position.y = 4.6
        g.add(tapa)
        const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 4.6, 10), matCano)
        pie.position.y = 2.3
        g.add(pie)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.3, 12), matCano)
        base.position.y = 0.15
        g.add(base)
        // sombrilla
        const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 15, 8), matCano)
        mastil.position.y = 7.5
        g.add(mastil)
        const paraguas = new THREE.Mesh(new THREE.ConeGeometry(7.6, 3.4, 16, 1, true), matTela)
        paraguas.position.y = 15
        g.add(paraguas)
        // banquetas alrededor
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2
          const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 12), matMesa)
          b2.position.set(Math.cos(ang) * 7.4, 3.2, Math.sin(ang) * 7.4)
          g.add(b2)
          const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 3.2, 8), matCano)
          p2.position.set(Math.cos(ang) * 7.4, 1.6, Math.sin(ang) * 7.4)
          g.add(p2)
        }
        g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        g.position.set(x, SUELO_Y, z)
        g.rotation.y = giro
        afuera.add(g)
      }
      // Van en el pasillo ENTRE las dos canchas (de -32.5 a -54.5, o sea
      // centrado en -43.5). Antes estaban en -58 y -92: las tres adentro de la
      // cancha de al lado, que es lo que se veía mal.
      // El local está rotado 90°, así que su ancho (8 m) va sobre Z: ocupa de
      // z=14 a z=66. La primera mesa caía en 22-38, o sea adentro — se veía
      // atravesarlo. Las tres se corren al tramo del pasillo que queda libre,
      // con la sombrilla (radio 8) entrando entera.
      ;[[-43.5, 2, 0.4], [-43.5, -26, -0.3], [-43.5, -54, 0.9]].forEach(([x, z, r]) => hacerMesa(x, z, r))

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
      // 13 (eran 20): con 20 el cartel llegaba al borde de arriba del cuadro y
      // no quedaba cielo; así se ve el horizonte por encima.
      const CARTEL_ALTO = 13
      // Altura del pie. Con 10 los carteles quedaban entre 15 y 32 px POR ENCIMA
      // del borde de arriba en todo el tramo del hero: existían, tenían la foto
      // cargada y no se veían nunca. Medido proyectándolos a pantalla.
      const CARTEL_PIE = 3
      const carteles = new THREE.Group()
      const rotables = []
      // Franja azul con el logo, compartida por todos los carteles. El logo se
      // pinta cuando carga la imagen (ver imgLogo.onload, más arriba).
      const zocCnv = document.createElement('canvas')
      zocCnv.width = 512; zocCnv.height = 64
      const zocCtx = zocCnv.getContext('2d')
      zocCtx.fillStyle = '#2563EB'
      zocCtx.fillRect(0, 0, 512, 64)
      const texZocalo = new THREE.CanvasTexture(zocCnv)
      texZocalo.colorSpace = THREE.SRGBColorSpace
      const matZocalo = new THREE.MeshStandardMaterial({ map: texZocalo, roughness: 0.7 })
      const matZocaloCanto = new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.7 })
      // Marco: un panel con espesor alrededor de la foto. Sin marco, la foto
      // blanca sin iluminación se leía como una calcomanía pegada en el vidrio.
      const matMarcoCartel = new THREE.MeshStandardMaterial({ color: '#1b2a3d', roughness: 0.55, metalness: 0.25 })
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
        const ANGULOS = [-Math.PI / 2, -Math.PI / 2 - 0.38, -Math.PI / 2 + 0.38, Math.PI - 0.3]
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
        fondo.position.y = SUELO_Y + CARTEL_ALTO / 2 + CARTEL_PIE
        grupo.add(fondo)

        // Material sin iluminación: la foto se ve con sus colores propios. Con
        // MeshStandard recibía sol + ambiente + relleno y salía quemada.
        // fog:false por el mismo motivo que toneMapped:false — la foto del
        // producto tiene que llegar con su color. A 86 unidades la niebla le
        // comía el 36% y los productos son lo único que la escena vende.
        const matFoto = new THREE.MeshBasicMaterial({
          transparent: true, side: THREE.DoubleSide, toneMapped: false, fog: false,
        })
        const foto = new THREE.Mesh(
          new THREE.PlaneGeometry(CARTEL_ALTO * 0.72, CARTEL_ALTO * 0.72), matFoto
        )
        foto.position.set(0, SUELO_Y + CARTEL_ALTO / 2 + CARTEL_PIE, 0.25)
        grupo.add(foto)
        new THREE.TextureLoader().load(ruta, tx => {
          if (disposed) return
          tx.colorSpace = THREE.SRGBColorSpace
          matFoto.map = tx
          matFoto.needsUpdate = true
        }, undefined, () => { foto.visible = false })

        // Marco con espesor, apenas detrás del fondo blanco
        const marcoC = new THREE.Mesh(
          new THREE.BoxGeometry(CARTEL_ALTO * 0.84 + 1.1, CARTEL_ALTO + 1.1, 0.7), matMarcoCartel
        )
        marcoC.position.set(0, SUELO_Y + CARTEL_ALTO / 2 + CARTEL_PIE, -0.4)
        grupo.add(marcoC)
        // franja de la marca abajo, con el logo: se lee como cartelería de la
        // marca y no como una foto suelta. Sólo la cara de adelante lleva el
        // logo; los cantos van lisos para que no se estire.
        const caras = [matZocaloCanto, matZocaloCanto, matZocaloCanto, matZocaloCanto, matZocalo, matZocaloCanto]
        const zocalo = new THREE.Mesh(
          new THREE.BoxGeometry(CARTEL_ALTO * 0.84 + 1.1, CARTEL_ALTO * 0.13, 0.9), caras
        )
        zocalo.position.set(0, SUELO_Y + CARTEL_PIE + CARTEL_ALTO * 0.065, 0.05)
        grupo.add(zocalo)

        ;[-0.34, 0.34].forEach(d => {
          const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, CARTEL_PIE, 8), matPoste2)
          pata.position.set(d * CARTEL_ALTO * 0.84, SUELO_Y + CARTEL_PIE / 2, 0)
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
      // entero, así que se lo mandó a 260 para que se leyera como un edificio a
      // lo lejos. Pero a 260 quedaba FUERA del domo de cielo (radio 170) y no
      // se veía nada: comprobado ocultándolo, la imagen no cambiaba un byte.
      // Ahora se acerca a 130 y se achica en la misma proporción, así ocupa en
      // pantalla exactamente lo mismo que antes — pero entra en el domo y, de
      // paso, en el rango de la niebla, que lo deja como una silueta tenue en
      // el horizonte. Si cambiás la distancia, cambiá la escala con la misma
      // cuenta o el encuadre se rompe.
      const CLUB_LEJOS = 130
      const kClub = CLUB_LEJOS / Math.hypot(52, 260)
      club.position.set(-52 * kClub, 0, RED_Z - 260 * kClub)
      club.scale.setScalar(kClub)
      afuera.add(club)

      // ── EL LÍMITE DEL TERRENO ──
      // Antes era un seto de tres filas, de hasta 2,4 m, que rodeaba todo el
      // club: visto desde la cancha era una pared verde continua y nunca se veía
      // el cielo ni el horizonte — por eso la escena se sentía cerrada. Ahora el
      // límite se arma en capas, de cerca a lejos, con aire entre una y otra:
      //   1. un cerco bajo (medio metro) que marca el borde del terreno
      //   2. árboles sueltos, con cielo entre copa y copa
      //   3. lomas lejanas, casi del color del cielo, que dan profundidad
      // Todo va sin sombra: queda fuera del área que cubre el mapa de sombras.

      // 1. Cerco bajo. Si una planta cae adentro de una cancha no se empuja
      //    (antes se empujaba hacia afuera y terminaba fuera del cielo): se omite.
      const CERCO = { radio: 124, cuantos: 150 }
      const seto = new THREE.InstancedMesh(geoSeto, new THREE.MeshStandardMaterial({ roughness: 0.95 }), CERCO.cuantos)
      seto.castShadow = false
      seto.receiveShadow = true
      {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
        const col = new THREE.Color()
        for (let i = 0; i < CERCO.cuantos; i++) {
          const ang = (i / CERCO.cuantos) * Math.PI * 2
          const rad = CERCO.radio + ((i * 7) % 5) * 1.6
          const x = Math.cos(ang) * rad, z = RED_Z + Math.sin(ang) * rad
          // dos ciclos de largo distinto (5 y 7): el patrón tarda 35 en repetirse
          const alto = 3 + ((i * 3) % 5) * 0.45 + ((i * 5) % 7) * 0.2
          const ancho = alto * (1.7 + ((i * 11) % 7) * 0.12)
          const visible = libre(x, z, 6)
          e.set(0, i * 1.31, 0)
          m.compose(
            new THREE.Vector3(x, SUELO_Y + alto * 0.55, z),
            q.setFromEuler(e),
            visible ? new THREE.Vector3(ancho, alto, ancho) : new THREE.Vector3(0, 0, 0)
          )
          seto.setMatrixAt(i, m)
          seto.setColorAt(i, col.set(VERDES[i % VERDES.length]))
        }
        seto.instanceMatrix.needsUpdate = true
        if (seto.instanceColor) seto.instanceColor.needsUpdate = true
      }
      seto.frustumCulled = false
      afuera.add(seto)

      // 2. Árboles sueltos: tronco y copa de tres bollos, del mismo estilo
      //    suave que los arbustos. Repartidos con el ángulo áureo, que no deja
      //    ni huecos grandes ni hileras. Detrás de la paleta (lo primero que se
      //    ve) se deja una ventana sin árboles, para que se vea el horizonte.
      const arboles = []
      for (let i = 0; i < 90 && arboles.length < 40; i++) {
        const ang = i * 2.39996                         // ángulo áureo
        const rad = 116 + ((i * 37) % 36)               // entre 116 y 151
        const x = Math.cos(ang) * rad, z = RED_Z + Math.sin(ang) * rad
        const frente = Math.atan2(Math.sin(ang + Math.PI / 2), Math.cos(ang + Math.PI / 2))
        if (Math.abs(frente) < 0.2) continue            // la ventana detrás de la paleta
        if (!libre(x, z, 14)) continue
        arboles.push({ x, z, alto: 17 + ((i * 13) % 11), i })
      }
      const troncos = new THREE.InstancedMesh(
        new THREE.CylinderGeometry(0.42, 0.62, 1, 7),
        new THREE.MeshStandardMaterial({ color: '#6b5a48', roughness: 0.95 }),
        arboles.length
      )
      const copas = new THREE.InstancedMesh(
        geoSeto, new THREE.MeshStandardMaterial({ roughness: 0.95 }), arboles.length * 3
      )
      {
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler()
        const col = new THREE.Color()
        arboles.forEach((a, k) => {
          const hT = a.alto * 0.5
          m.compose(new THREE.Vector3(a.x, SUELO_Y + hT / 2, a.z), q.identity(), new THREE.Vector3(1, hT, 1))
          troncos.setMatrixAt(k, m)
          const r = a.alto * 0.3
          ;[[0, 0.74, 0, 1], [0.42, 0.6, 0.2, 0.72], [-0.36, 0.64, -0.24, 0.66]].forEach(([dx, dy, dz, esc], j) => {
            e.set(0, a.i * 0.9 + j, 0)
            const rr = r * esc
            m.compose(
              new THREE.Vector3(a.x + dx * r, SUELO_Y + a.alto * dy, a.z + dz * r),
              q.setFromEuler(e),
              new THREE.Vector3(rr * 1.1, rr, rr * 1.1)
            )
            copas.setMatrixAt(k * 3 + j, m)
            copas.setColorAt(k * 3 + j, col.set(VERDES[(a.i + j) % VERDES.length]))
          })
        })
        troncos.instanceMatrix.needsUpdate = true
        copas.instanceMatrix.needsUpdate = true
        if (copas.instanceColor) copas.instanceColor.needsUpdate = true
      }
      troncos.frustumCulled = copas.frustumCulled = false
      troncos.receiveShadow = copas.receiveShadow = true
      afuera.add(troncos, copas)

      // 3. Lomas lejanas: dos siluetas en anillo alrededor de todo, pegadas al
      //    cielo. Son geometría y no un dibujo en el cielo porque el cielo tiene
      //    5 píxeles por grado: pintadas ahí salían como una mancha borrosa.
      //    Sin niebla, con el color ya "lavado" de lejos. Las frecuencias son
      //    enteras para que el anillo cierre sin salto.
      const hacerLomas = (radio, color, base, amp, f1, f2, grano) => {
        const SEG = 480
        const pos = [], idx = []
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2
          const h = base
            + amp * (0.5 + 0.5 * Math.sin(a * f1 + 1.3)) * (0.55 + 0.45 * Math.sin(a * f2 + 0.4))
            + grano * Math.abs(Math.sin(a * 97)) * (0.5 + 0.5 * Math.sin(a * 23 + 2))
          const x = Math.cos(a) * radio, z = RED_Z + Math.sin(a) * radio
          pos.push(x, SUELO_Y - 1, z, x, SUELO_Y + h, z)
          if (i < SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
        }
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
        g.setIndex(idx)
        return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide }))
      }
      afuera.add(hacerLomas(167, '#b4cfe8', 7, 11, 3, 7, 0))       // lomas, casi cielo
      afuera.add(hacerLomas(161, '#9dbbd5', 4, 5, 5, 11, 1.6))     // una arboleda más cerca

      // ── BANDERAS SARO ──
      // Banderas "vela" como las de los eventos, detrás del fondo de la cancha:
      // intercaladas con los carteles, suman altura, color de la marca y algo
      // que se mueve (se mecen con el viento, ver el bucle de cuadros).
      const bandCnv = document.createElement('canvas')
      bandCnv.width = 128; bandCnv.height = 512
      const bCtx = bandCnv.getContext('2d')
      const texBandera = new THREE.CanvasTexture(bandCnv)
      texBandera.colorSpace = THREE.SRGBColorSpace
      const pintarBanderas = (logo) => {
        const g = bCtx.createLinearGradient(0, 0, 128, 0)
        g.addColorStop(0, '#1d4ed8')
        g.addColorStop(1, '#2563EB')
        bCtx.fillStyle = g
        bCtx.fillRect(0, 0, 128, 512)
        bCtx.fillStyle = '#ffffff'
        bCtx.fillRect(0, 0, 9, 512)                  // la vaina blanca del mástil
        if (logo) {
          bCtx.save()
          bCtx.translate(68, 300)
          bCtx.rotate(-Math.PI / 2)
          const al = 58, an = al * (logo.width / logo.height)
          bCtx.drawImage(logo, -an / 2, -al / 2, an, al)
          bCtx.restore()
        }
        texBandera.needsUpdate = true
      }
      pintarBanderas(null)
      // La vela: un rectángulo que se achica hacia el borde libre (la forma de
      // pluma de estas banderas) y apenas curvado, como tomando viento.
      const ANCHO_B = 3.2, ALTO_B = 12, MASTIL = 16.5
      const geoVela = new THREE.PlaneGeometry(ANCHO_B, ALTO_B, 8, 16)
      geoVela.translate(ANCHO_B / 2, ALTO_B / 2, 0)
      {
        const p = geoVela.attributes.position
        for (let i = 0; i < p.count; i++) {
          const t = p.getX(i) / ANCHO_B
          p.setY(i, p.getY(i) * (1 - 0.3 * t * t) + 0.9 * t * t)
          p.setZ(i, Math.sin(t * Math.PI) * 0.35)
        }
        geoVela.computeVertexNormals()
      }
      const matVela = new THREE.MeshStandardMaterial({ map: texBandera, roughness: 0.8, side: THREE.DoubleSide })
      const matMastil = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4, metalness: 0.6 })
      const banderas = []
      // Detrás del fondo, entre el cartel del centro y los de los costados:
      // cartel, bandera, cartel, bandera, cartel. La altura está medida para que
      // la punta entre en el cuadro del arranque.
      ;[[-Math.PI / 2 - 0.2, 72], [-Math.PI / 2 + 0.2, 72], [-Math.PI / 2 - 0.55, 76], [-Math.PI / 2 + 0.55, 76]]
        .forEach(([ang, rad], i) => {
          const x = Math.cos(ang) * rad, z = RED_Z + Math.sin(ang) * rad
          const grupo = new THREE.Group()
          const mastil = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, MASTIL, 8), matMastil)
          mastil.position.y = MASTIL / 2
          const vela = new THREE.Mesh(geoVela, matVela)
          vela.position.set(0.15, MASTIL - ALTO_B - 0.8, 0)
          const pie = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.45, 12), matMastil)
          pie.position.y = 0.22
          grupo.add(mastil, vela, pie)
          grupo.position.set(x, SUELO_Y, z)
          // de cara a la cancha, con un poco de ángulo para que la vela se lea
          const base = Math.atan2(-x, RED_Z - z) + (i % 2 ? 0.5 : -0.5)
          grupo.rotation.y = base
          grupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
          afuera.add(grupo)
          banderas.push({ grupo, base, fase: i * 1.9 })
        })

      // Las canchas vecinas, insinuadas: dan idea de club y no de cancha suelta.
      // Salen de la misma lista y con la MISMA medida que la principal — antes
      // era un rectángulo de 58 x 26 puesto a mano, que a esta escala no era
      // una cancha de pádel sino un rectángulo cualquiera.
      // (El piso de las vecinas lo dibuja hacerVecina, más abajo. Acá había un
      // segundo piso encimado que titilaba contra el primero.)
      scene.add(afuera)

      const explanada = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 420),
        new THREE.MeshStandardMaterial({ map: texCesped, roughness: 1 })
      )
      explanada.rotation.x = -Math.PI / 2
      explanada.position.y = -3.06
      scene.add(explanada)

      // ── EL PISO: césped sintético de pádel ──
      // Dos capas que se multiplican:
      //  1. DETALLE, que se repite: fibras que caen en direcciones distintas y
      //     los granos de arena del relleno, que en una cancha de verdad asoman
      //     entre las fibras y le dan ese moteado claro. También da el relieve.
      //  2. VARIACIÓN, que NO se repite y cubre la cancha entera: las juntas de
      //     los rollos de césped a lo largo, manchones de tono y el desgaste
      //     donde se para la gente (junto a la red y en la línea de saque).
      // Sin la segunda capa el detalle se nota repetido y el piso se lee como
      // una alfombra estampada; sin la primera, como un plástico liso.
      const TEX_PISO = 1024
      const REP_PISO = [6, 12]                 // cada baldosa ~10,8 unidades (1,7 m)
      const cesCnv2 = document.createElement('canvas')
      cesCnv2.width = cesCnv2.height = TEX_PISO
      const cx2 = cesCnv2.getContext('2d')
      cx2.fillStyle = '#78addf'
      cx2.fillRect(0, 0, TEX_PISO, TEX_PISO)
      // Todo lo que se dibuja cerca de un borde se repite del otro lado, así la
      // baldosa empalma sin costura al repetirse.
      const enLosCuatro = (x, y, margen, dibujar) => {
        for (const dx of [0, -TEX_PISO, TEX_PISO]) {
          for (const dy of [0, -TEX_PISO, TEX_PISO]) {
            const px = x + dx, py = y + dy
            if (px < -margen || px > TEX_PISO + margen || py < -margen || py > TEX_PISO + margen) continue
            dibujar(px, py)
          }
        }
      }
      // Fibras finas y parejas, casi todas peinadas para el mismo lado (el
      // césped sintético tiene "pelo"), con algunas sueltas. Se probó con matas
      // de fibras que caían juntas y el piso se veía manchado como camuflaje:
      // de cerca, el césped de verdad es un grano fino y uniforme.
      cx2.lineWidth = 1
      for (let i = 0; i < 90000; i++) {
        const x = Math.random() * TEX_PISO, y = Math.random() * TEX_PISO
        const a = Math.random() < 0.8 ? Math.PI / 2 + (Math.random() - 0.5) * 0.6 : Math.random() * Math.PI * 2
        const largo = 2.5 + Math.random() * 4
        cx2.strokeStyle = Math.random() > 0.5
          ? `rgba(225,240,255,${0.07 + Math.random() * 0.07})`
          : `rgba(30,78,130,${0.07 + Math.random() * 0.07})`
        enLosCuatro(x, y, 8, (px, py) => {
          cx2.beginPath()
          cx2.moveTo(px, py)
          cx2.lineTo(px + Math.cos(a) * largo, py + Math.sin(a) * largo)
          cx2.stroke()
        })
      }
      // arena del relleno: un polvillo claro, apenas amarillento, muy fino
      for (let i = 0; i < 22000; i++) {
        const x = Math.random() * TEX_PISO, y = Math.random() * TEX_PISO
        cx2.fillStyle = Math.random() > 0.25
          ? `rgba(236,228,205,${0.10 + Math.random() * 0.14})`
          : `rgba(20,55,95,${0.08 + Math.random() * 0.08})`
        cx2.fillRect(x, y, 1, 1)
      }
      const texPiso = new THREE.CanvasTexture(cesCnv2)
      // Sin esto Three la toma como lineal y la muestra lavada: el piso se veía
      // blanco. Era la única textura del archivo a la que le faltaba.
      texPiso.colorSpace = THREE.SRGBColorSpace
      texPiso.wrapS = texPiso.wrapT = THREE.RepeatWrapping
      texPiso.repeat.set(...REP_PISO)
      // el máximo que dé la placa: es lo que mantiene nítido el piso visto de costado
      texPiso.anisotropy = renderer.capabilities.getMaxAnisotropy()
      // El relieve sale de la misma imagen (sin espacio de color: es un dato,
      // no un color). Las fibras claras sobresalen y las oscuras se hunden.
      const texRelieve = new THREE.CanvasTexture(cesCnv2)
      texRelieve.wrapS = texRelieve.wrapT = THREE.RepeatWrapping
      texRelieve.repeat.set(...REP_PISO)
      texRelieve.anisotropy = texPiso.anisotropy

      // Capa de variación: gris medio (128 = no cambia nada), más claro o más
      // oscuro donde corresponde. Proporción 1:2, la de la cancha.
      const varCnv = document.createElement('canvas')
      varCnv.width = 256; varCnv.height = 512
      {
        const c = varCnv.getContext('2d')
        c.fillStyle = 'rgb(128,128,128)'
        c.fillRect(0, 0, 256, 512)
        // juntas de los rollos: el césped viene en rollos de ~4 m a lo largo,
        // y cada uno tiene un tono apenas distinto
        const ROLLO = 256 * (4 / 0.155) / CANCHA_ANCHO
        for (let k = 0, x = 0; x < 256; k++, x += ROLLO) {
          c.fillStyle = k % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.035)'
          c.fillRect(x, 0, ROLLO, 512)
          c.fillStyle = 'rgba(0,0,0,0.06)'
          c.fillRect(x, 0, 1, 512)
        }
        // manchones de tono sueltos
        for (let i = 0; i < 70; i++) {
          const x = Math.random() * 256, y = Math.random() * 512, r = 12 + Math.random() * 40
          const g = c.createRadialGradient(x, y, 0, x, y, r)
          const claro = Math.random() > 0.5
          g.addColorStop(0, claro ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)')
          g.addColorStop(1, 'rgba(128,128,128,0)')
          c.fillStyle = g
          c.fillRect(x - r, y - r, r * 2, r * 2)
        }
        // desgaste: donde más se pisa, la fibra se aplasta y asoma la arena
        const desgaste = (x, y, rx, ry, a) => {
          c.save()
          c.translate(x, y); c.scale(rx / ry, 1)
          const g = c.createRadialGradient(0, 0, 0, 0, 0, ry)
          g.addColorStop(0, `rgba(255,248,230,${a})`)
          g.addColorStop(1, 'rgba(255,248,230,0)')
          c.fillStyle = g
          c.fillRect(-ry, -ry, ry * 2, ry * 2)
          c.restore()
        }
        const saque = 512 * (6.95 / 0.155) / CANCHA_LARGO   // línea de saque a 6,95 m
        ;[-1, 1].forEach(lado => {
          desgaste(128, 256 + lado * 26, 90, 22, 0.10)           // junto a la red
          desgaste(128, 256 + lado * saque, 110, 30, 0.08)       // la línea de saque
          desgaste(128, 256 + lado * (saque + 60), 100, 40, 0.06) // detrás, donde se defiende
        })
      }
      const texVariacion = new THREE.CanvasTexture(varCnv)
      texVariacion.colorSpace = THREE.NoColorSpace

      const matPiso = new THREE.MeshStandardMaterial({
        map: texPiso, roughness: 0.96, metalness: 0, color: '#d3e3f0',
        bumpMap: texRelieve, bumpScale: 0.7,
      })
      // La variación se multiplica en el shader, con su propia escala: cubre la
      // cancha entera una sola vez aunque el detalle se repita 6 x 12 veces.
      matPiso.onBeforeCompile = (sh) => {
        sh.uniforms.tVariacion = { value: texVariacion }
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D tVariacion;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            vec3 variacion = texture2D(tVariacion, vMapUv / vec2(${REP_PISO[0].toFixed(1)}, ${REP_PISO[1].toFixed(1)})).rgb;
            diffuseColor.rgb *= variacion * 2.0;`)
      }
      const piso = new THREE.Mesh(new THREE.PlaneGeometry(CANCHA_ANCHO, CANCHA_LARGO), matPiso)
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
        transparent: true, opacity: 0.09, side: THREE.DoubleSide,   // apenas se nota: deja ver el afuera
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
      rx.strokeStyle = '#000000'      // negro sólido, como pediste
      rx.lineWidth = 5
      rx.strokeRect(0, 0, 32, 32)
      const texReja = new THREE.CanvasTexture(rejCnv)
      texReja.wrapS = texReja.wrapT = THREE.RepeatWrapping
      const matReja = new THREE.MeshStandardMaterial({
        map: texReja, alphaMap: texReja, transparent: true,
        roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide, depthWrite: false, opacity: 1,
      })
      const hacerReja = (ancho, alto, repX) => {
        // Cada paño lleva su propia textura dibujada de cero. Clonar una
        // CanvasTexture no copia su imagen, así que los paños salían vacíos: por
        // eso el alambrado había desaparecido.
        // El alphaMap se guía por el BRILLO: blanco = opaco, negro = invisible.
        // El hilo se dibuja en BLANCO (para que sea sólido) y el color negro lo
        // pone el material. Antes lo dibujaba en negro, así que su alpha era 0 y
        // la reja entera desaparecía — y cuanto más oscura, más invisible.
        // Lienzo más grande con la misma línea = hilo proporcionalmente más
        // fino. Antes el hilo ocupaba el 16% del cuadro; ahora el 5%.
        const c = document.createElement('canvas')
        c.width = c.height = 64
        const g2 = c.getContext('2d')
        g2.fillStyle = '#000000'
        g2.fillRect(0, 0, 64, 64)          // fondo negro = hueco del tejido
        g2.strokeStyle = '#ffffff'
        g2.lineWidth = 3
        g2.strokeRect(0, 0, 64, 64)        // hilo blanco = opaco
        const t = new THREE.CanvasTexture(c)
        t.wrapS = t.wrapT = THREE.RepeatWrapping
        t.repeat.set(Math.max(1, repX), Math.max(1, alto / 0.7))   // cuadros más chicos
        t.anisotropy = 4
        // Gris pizarra y no negro, y apenas translúcida: la reja negra sólida
        // enjaulaba la cancha y tapaba el afuera.
        const m = new THREE.MeshStandardMaterial({
          alphaMap: t, transparent: true, color: '#243142', opacity: 0.75,
          roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide, depthWrite: false,
        })
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
          const r = hacerReja(ancho, REJA_H, ancho / 0.85)
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
            const r = hacerReja(VIDRIO_PUNTA, REJA_H, VIDRIO_PUNTA / 0.85)
            r.position.set(lado * (ancho / 2 - VIDRIO_PUNTA / 2), SUELO_Y + VIDRIO_H + REJA_H / 2, 0)
            g.add(r)
          })
          // el tramo de reja del centro, partido por la puerta
          const pano = (medio - PUERTA_A) / 2
          ;[-1, 1].forEach(lado => {
            const r = hacerReja(pano, VIDRIO_H + REJA_H, pano / 0.85)
            r.position.set(lado * (PUERTA_A / 2 + pano / 2), SUELO_Y + (VIDRIO_H + REJA_H) / 2, 0)
            g.add(r)
          })
          // encima de la puerta
          const arriba = hacerReja(PUERTA_A, VIDRIO_H + REJA_H - PUERTA_H, PUERTA_A / 0.85)
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

      // ── LA CANCHA DE AL LADO ──
      // Un club no tiene una cancha suelta en un campo: tiene varias en fila.
      // Esta va justo donde la cámara termina mirando, que hasta ahora era el
      // sector más vacío del recorrido. Versión simplificada — piso, vereda y
      // cerramiento — porque se ve de lejos y de costado.
      const hacerVecina = (x, z) => {
        const g = new THREE.Group()
        const piso2 = new THREE.Mesh(
          new THREE.PlaneGeometry(CANCHA_ANCHO, CANCHA_LARGO),
          new THREE.MeshStandardMaterial({ color: '#7fb3e3', roughness: 1 })
        )
        piso2.rotation.x = -Math.PI / 2
        piso2.position.y = 0.02
        piso2.receiveShadow = true
        g.add(piso2)
        const vereda2 = new THREE.Mesh(
          new THREE.PlaneGeometry(CANCHA_ANCHO + 16, CANCHA_LARGO + 16),
          new THREE.MeshStandardMaterial({ color: '#c9d4dd', roughness: 1 })
        )
        vereda2.rotation.x = -Math.PI / 2
        g.add(vereda2)
        // cerramiento simplificado: vidrio abajo, reja arriba, sin puertas
        const alto = VIDRIO_H + REJA_H
        ;[[CANCHA_ANCHO, 0, -CANCHA_LARGO / 2, 0], [CANCHA_ANCHO, 0, CANCHA_LARGO / 2, 0],
          [CANCHA_LARGO, -CANCHA_ANCHO / 2, 0, Math.PI / 2], [CANCHA_LARGO, CANCHA_ANCHO / 2, 0, Math.PI / 2]
        ].forEach(([ancho, px, pz, giro]) => {
          const par = new THREE.Group()
          const v = new THREE.Mesh(new THREE.PlaneGeometry(ancho, VIDRIO_H), matVidrio)
          v.position.y = VIDRIO_H / 2
          par.add(v)
          const r = hacerReja(ancho, REJA_H, ancho / 0.85)
          r.position.y = VIDRIO_H + REJA_H / 2
          par.add(r)
          const piezas = Math.round(ancho / (1.996 / 0.155))
          for (let k = 0; k <= piezas; k++) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, alto, 0.22), matMarco)
            m.position.set(-ancho / 2 + (ancho / piezas) * k, alto / 2, 0)
            par.add(m)
          }
          const rem = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.26, 0.26), matMarco)
          rem.position.y = alto
          par.add(rem)
          par.position.set(px, 0, pz)
          par.rotation.y = giro
          g.add(par)
        })
        g.position.set(x, SUELO_Y, z)
        afuera.add(g)
      }
      // dos canchas más, en la fila que mira la cámara al final
      hacerVecina(-(CANCHA_ANCHO + 26), RED_Z)
      // (Había una tercera cancha más allá. Quedaba en parte fuera de la cúpula
      // del cielo y sólo la niebla la escondía: sin niebla se veía cortada.)


      // (Había un techo de vigas cruzadas sobre la cancha. Se sacó: cerraba la
      // escena por arriba y el pedido fue que se vea más el entorno.)

      // ── LA RED ──
      // La malla usa una rejilla dibujada al vuelo, así se ve el tejido en lugar
      // de un panel gris uniforme.
      const red = new THREE.Group()
      const cnv = document.createElement('canvas')
      cnv.width = cnv.height = 64
      const ctx = cnv.getContext('2d')
      // Tejido más cerrado y oscuro: antes se veía como un velo transparente
      // Mismo criterio que la reja: el hilo va en blanco para que el alphaMap lo
      // tome como opaco, y el tono lo da el color del material.
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, 64, 64)
      ctx.strokeStyle = '#ffffff'
      // Hilo fino y cuadro chico, como una red de pádel de verdad (cuadros de
      // unos 4,5 cm). Antes eran cuadros de 10 cm con hilo grueso y en primer
      // plano se leía como un alambrado.
      ctx.lineWidth = 4
      ctx.strokeRect(0, 0, 64, 64)
      const texRed = new THREE.CanvasTexture(cnv)
      texRed.wrapS = texRed.wrapT = THREE.RepeatWrapping
      texRed.repeat.set(MEDIA * 2 / 0.29, RED_ALTO / 0.29)   // 0,29 unidades = 4,5 cm
      texRed.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const matMalla = new THREE.MeshStandardMaterial({
        alphaMap: texRed, transparent: true, opacity: 0.9, color: '#1f2937',
        roughness: 0.95, side: THREE.DoubleSide, depthWrite: false,
      })
      const malla = new THREE.Mesh(new THREE.PlaneGeometry(MEDIA * 2, RED_ALTO), matMalla)
      malla.position.y = SUELO_Y + RED_ALTO / 2
      // Faja blanca de arriba: es lo primero que el ojo reconoce de una red.
      const cinta = new THREE.Mesh(
        new THREE.BoxGeometry(MEDIA * 2, 0.4, 0.1),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55 })
      )
      cinta.position.y = SUELO_Y + RED_ALTO - 0.2
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
      // Con luz y sombra, y apenas transparentes: en una cancha de verdad la
      // línea es césped blanco, así que se tiene que ver la fibra de abajo. Con
      // MeshBasic además la sombra de la paleta y de la caja se cortaba justo
      // al pasar sobre una línea.
      const matLinea = new THREE.MeshStandardMaterial({ color: '#f4f7fa', roughness: 0.95, transparent: true, opacity: 0.86 })
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
      lineas.traverse(o => { if (o.isMesh) o.receiveShadow = true })
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
        setListo(true)
      }, undefined, () => { if (!disposed) setListo(true) /* si falla, queda la silueta simple */ })

      // Pelota de pádel: fieltro (nada de brillo) y las costuras blancas curvas.
      // Ya no se deforma en caja a la vista: el paso intermedio parecía una
      // pelota desinflada. Ahora un destello la tapa y, cuando se apaga, lo que
      // queda es una caja de verdad (ver "EL ENVÍO", más abajo).
      const R_BOLA = 0.29
      const geoBola = new THREE.SphereGeometry(R_BOLA, 40, 30)

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

      // (Hubo un cesto de pelotas como elemento de primer plano. Se sacó: en
      // cualquier lugar terminaba detrás del texto, detrás de la paleta en el
      // golpe o cruzándose con la cámara en el cierre. La profundidad ahora la
      // dan las banderas, los árboles y la pantalla del fondo.)


      // ── EL ENVÍO ──
      // Una caja de cartón con cara de envío: bordes rectos apenas redondeados,
      // cinta de la marca cruzando la tapa y etiqueta con el logo en el frente.
      // La anterior salía de deformar la esfera y quedaba con los bordes
      // ondulados: parecía un terrón de azúcar, no un paquete.
      const L_CAJA = 1.5                     // ~23 cm de lado
      const caja = new THREE.Group()
      // Cartón kraft dibujado al vuelo: fibras finas y un borde apenas más
      // oscuro por cara, que es lo que hace leer "cartón" y no "plástico marrón".
      const kraftCnv = document.createElement('canvas')
      kraftCnv.width = kraftCnv.height = 256
      {
        const c = kraftCnv.getContext('2d')
        c.fillStyle = '#c69c6d'
        c.fillRect(0, 0, 256, 256)
        for (let i = 0; i < 2600; i++) {
          // fibras apenas marcadas: más contraste y se leía como veta de madera
          c.strokeStyle = Math.random() > 0.5 ? 'rgba(255,236,205,0.06)' : 'rgba(92,60,28,0.06)'
          const x = Math.random() * 256, y = Math.random() * 256
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3 + Math.random() * 7, y + (Math.random() - 0.5) * 1.5); c.stroke()
        }
        const borde = c.createRadialGradient(128, 128, 90, 128, 128, 186)
        borde.addColorStop(0, 'rgba(90,58,26,0)')
        borde.addColorStop(1, 'rgba(90,58,26,0.22)')
        c.fillStyle = borde
        c.fillRect(0, 0, 256, 256)
      }
      const texKraft = new THREE.CanvasTexture(kraftCnv)
      texKraft.colorSpace = THREE.SRGBColorSpace
      texKraft.anisotropy = 4
      const cuerpoCaja = new THREE.Mesh(
        new RoundedBoxGeometry(L_CAJA, L_CAJA, L_CAJA, 3, L_CAJA * 0.035),
        new THREE.MeshStandardMaterial({ map: texKraft, roughness: 0.92, metalness: 0 })
      )
      cuerpoCaja.castShadow = true
      cuerpoCaja.receiveShadow = true
      caja.add(cuerpoCaja)
      // la unión de las solapas de la tapa, de lado a lado
      const union = new THREE.Mesh(
        new THREE.BoxGeometry(L_CAJA * 0.98, 0.004, 0.012),
        new THREE.MeshBasicMaterial({ color: '#6b4a2a' })
      )
      union.position.y = L_CAJA / 2 + 0.002
      caja.add(union)
      // Cinta azul con el logo en blanco. Tapa la unión y baja por los costados,
      // así el frente queda libre para la etiqueta (una cinta vertical por el
      // frente tapaba el logo — pasó con la caja anterior). El logo se pinta
      // cuando carga la imagen (ver imgLogo.onload).
      const cintaCnv = document.createElement('canvas')
      cintaCnv.width = 512; cintaCnv.height = 64
      const cintaCtx = cintaCnv.getContext('2d')
      cintaCtx.fillStyle = '#2563EB'
      cintaCtx.fillRect(0, 0, 512, 64)
      const texCinta = new THREE.CanvasTexture(cintaCnv)
      texCinta.colorSpace = THREE.SRGBColorSpace
      const matCintaCaja = new THREE.MeshStandardMaterial({ map: texCinta, roughness: 0.35, metalness: 0.05 })
      const ANCHO_CINTA = L_CAJA * 0.24
      const cintaTapa = new THREE.Mesh(new THREE.PlaneGeometry(L_CAJA * 1.001, ANCHO_CINTA), matCintaCaja)
      cintaTapa.rotation.x = -Math.PI / 2
      cintaTapa.position.y = L_CAJA / 2 + 0.006
      caja.add(cintaTapa)
      ;[-1, 1].forEach(lado => {
        const baja = L_CAJA * 0.34
        const c2 = new THREE.Mesh(new THREE.PlaneGeometry(baja, ANCHO_CINTA), matCintaCaja)
        c2.rotation.set(0, lado * Math.PI / 2, Math.PI / 2)
        c2.position.set(lado * (L_CAJA / 2 + 0.006), L_CAJA / 2 - baja / 2, 0)
        caja.add(c2)
      })
      // Etiqueta blanca en el frente con el logo. Se compone en un canvas para
      // que el logo quede con aire y una línea azul abajo, como una etiqueta
      // de envío impresa.
      const etqCnv = document.createElement('canvas')
      etqCnv.width = 512; etqCnv.height = 256
      const etqCtx = etqCnv.getContext('2d')
      const texEtiqueta = new THREE.CanvasTexture(etqCnv)
      texEtiqueta.colorSpace = THREE.SRGBColorSpace
      texEtiqueta.anisotropy = 4
      const pintarEtiqueta = (logo) => {
        etqCtx.fillStyle = '#fbfaf6'
        etqCtx.fillRect(0, 0, 512, 256)
        etqCtx.fillStyle = '#2563EB'
        etqCtx.fillRect(0, 226, 512, 30)
        if (logo) {
          const an = 400, al = an * (logo.height / logo.width)
          etqCtx.drawImage(logo, 256 - an / 2, 112 - al / 2, an, al)
        }
        etqCtx.fillStyle = '#64748b'
        etqCtx.font = '600 22px Inter, system-ui, sans-serif'
        etqCtx.textAlign = 'center'
        etqCtx.fillText('PÁDEL · FÁBRICA ARGENTINA', 256, 196)
        texEtiqueta.needsUpdate = true
      }
      pintarEtiqueta(null)
      const imgLogoCaja = new Image()
      imgLogoCaja.onload = () => { if (!disposed) pintarEtiqueta(imgLogoCaja) }
      imgLogoCaja.src = '/assets/logo-caja.png'
      const etiqueta = new THREE.Mesh(
        new THREE.PlaneGeometry(L_CAJA * 0.7, L_CAJA * 0.35),
        new THREE.MeshStandardMaterial({ map: texEtiqueta, roughness: 0.85 })
      )
      etiqueta.position.set(0, -L_CAJA * 0.04, L_CAJA / 2 + 0.006)
      caja.add(etiqueta)
      caja.visible = false

      // ── EL DESTELLO ──
      // Tapa el cambio de pelota a caja. Un halo (núcleo blanco opaco que se
      // difumina hacia afuera) más un anillo que se expande cuando se apaga,
      // como una onda. Van sin niebla, sin tonemapping y por encima de todo:
      // es luz, no un objeto de la escena.
      const hacerSprite = (pintar) => {
        const cnv2 = document.createElement('canvas')
        cnv2.width = cnv2.height = 256
        pintar(cnv2.getContext('2d'))
        const tx = new THREE.CanvasTexture(cnv2)
        tx.colorSpace = THREE.SRGBColorSpace
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: tx, transparent: true, depthWrite: false, depthTest: false,
          toneMapped: false, fog: false, opacity: 0,
        }))
        sp.renderOrder = 10
        sp.visible = false
        escenaFx.add(sp)
        return sp
      }
      const destello = hacerSprite(c => {
        const g = c.createRadialGradient(128, 128, 0, 128, 128, 128)
        g.addColorStop(0, 'rgba(255,255,255,1)')
        g.addColorStop(0.34, 'rgba(255,255,255,1)')      // núcleo opaco: esconde el cambio
        g.addColorStop(0.55, 'rgba(255,248,226,0.55)')
        g.addColorStop(1, 'rgba(255,240,200,0)')
        c.fillStyle = g
        c.fillRect(0, 0, 256, 256)
      })
      const anillo = hacerSprite(c => {
        const g = c.createRadialGradient(128, 128, 70, 128, 128, 126)
        g.addColorStop(0, 'rgba(255,255,255,0)')
        g.addColorStop(0.55, 'rgba(255,255,255,0.9)')
        g.addColorStop(1, 'rgba(255,255,255,0)')
        c.fillStyle = g
        c.fillRect(0, 0, 256, 256)
      })

      // Sombra de contacto de la caja: una mancha difusa debajo, que se
      // concentra al apoyarse. La sombra del sol sola la dejaba despegada.
      const sombraCnv = document.createElement('canvas')
      sombraCnv.width = sombraCnv.height = 128
      {
        const c = sombraCnv.getContext('2d')
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64)
        g.addColorStop(0, 'rgba(20,40,70,0.55)')
        g.addColorStop(0.6, 'rgba(20,40,70,0.22)')
        g.addColorStop(1, 'rgba(20,40,70,0)')
        c.fillStyle = g
        c.fillRect(0, 0, 128, 128)
      }
      const matSombra = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(sombraCnv), transparent: true, opacity: 0, depthWrite: false,
      })
      const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), matSombra)
      sombra.rotation.x = -Math.PI / 2
      scene.add(sombra)

      scene.add(codo, pelota, caja)

      // ── LANZADOR DE PELOTAS (el 0% del scroll) ──
      // Antes de que arranque el guion, la paleta se puede jugar: cada clic manda
      // una pelota desde donde está el cursor, la paleta la devuelve y sale de
      // cuadro. Es la misma idea del hero que ya está en la página pública.
      const JUEGO_HASTA = 0.055          // a partir de acá manda el guion
      const ESPERA = 0.42                // segundos mínimos entre pelota y pelota
      // Las del lanzador son las MISMAS que la del guion: misma esfera, mismo
      // fieltro y la misma costura. Antes eran una esfera lisa aparte y se
      // notaba que eran otra pelota.
      const geoJuego = geoBola
      const matJuego = matFieltro
      const banco = []
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Group()
        const cuerpo = new THREE.Mesh(geoJuego, matJuego)
        cuerpo.castShadow = true
        m.add(cuerpo, new THREE.Mesh(geoCostura, matCostura))
        m.visible = false
        scene.add(m)
        banco.push({ malla: m, viva: false, t: 0, dur: 1, zGolpe: CONTACTO.z, o: new THREE.Vector3(), v: new THREE.Vector3() })
      }
      const juego = { ultimo: -99, activo: true }
      // Reloj propio del golpe por clic, igual que en el hero público: avanza con
      // el tiempo y se apaga solo al completarse. Nunca se mezcla con el del
      // scroll — mezclarlos era lo que cortaba y repetía el golpe.
      const clic = { activo: false, t: 0, dur: 0.6, lado: 1, tiro: SHOTS.drive }
      let golpesDesdeReves = 0
      let proximoReves = 4 + Math.floor(Math.random() * 3)
      const puntero = new THREE.Vector2(0, 0)

      const lanzar = () => {
        if (!juego.activo || progRef.current.t > JUEGO_HASTA) return
        const ahora = performance.now() / 1000
        if (ahora - juego.ultimo < ESPERA) return      // no se acumulan clics
        const b = banco.find(x => !x.viva)
        if (!b) return
        // cuanto más rápido se clickea, más rápido va y más corto es el swing
        const ritmo = Math.min(1, (ahora - juego.ultimo) / 1.6)
        juego.ultimo = ahora

        // origen: el punto del mundo que está bajo el cursor
        b.o.set(puntero.x, puntero.y, 0.5).unproject(camera)
        // que venga de un costado, no de la nariz de la cámara
        if (Math.abs(b.o.x - CONTACTO.x) < 3) b.o.x = CONTACTO.x + (b.o.x < CONTACTO.x ? -3.4 : 3.4)
        b.malla.position.copy(b.o)
        b.malla.visible = true
        b.viva = true
        b.t = 0
        // b.dur lo fija el tipo de golpe, unas líneas más abajo
        // sale hacia una dirección cualquiera, siempre alejándose de la paleta
        const ang = Math.random() * Math.PI * 2
        const vel = 13 + (1 - ritmo) * 7
        b.v.set(Math.cos(ang) * 0.72, Math.sin(ang) * 0.72, 0.62).normalize().multiplyScalar(vel)

        // El tipo de golpe sale de hacia dónde se va la pelota, con un revés cada
        // 4 a 6: el mismo criterio del hero público. Sube -> globo, baja ->
        // remate, clics rápidos -> volea.
        golpesDesdeReves++
        const saleArriba = Math.sin(ang) > 0.45
        const saleAbajo = Math.sin(ang) < -0.4
        let dur = 0.34 + ritmo * 0.66
        if (golpesDesdeReves >= proximoReves) {
          clic.tiro = SHOTS.reves
          golpesDesdeReves = 0
          proximoReves = 4 + Math.floor(Math.random() * 3)
          dur = Math.max(dur, 1.15)         // el revés va más lento, para verlo
        } else {
          clic.tiro = saleAbajo ? SHOTS.remate
            : saleArriba ? SHOTS.globo
            : (ritmo < 0.3 ? SHOTS.volea
              : [SHOTS.drive, SHOTS.volea, SHOTS.globo][Math.floor(Math.random() * 3)])
        }
        clic.activo = true
        clic.t = 0
        clic.dur = dur
        clic.lado = b.o.x <= CONTACTO.x ? 1 : -1     // de qué lado entra la pelota
        // La pelota tiene que llegar EN el golpe (P_GOLPE del swing), no al
        // final: si viaja el swing entero, la paleta ya volvió al reposo.
        b.dur = dur * P_GOLPE
        b.zGolpe = CONTACTO.z + empujeDe(P_GOLPE, clic.tiro.thrust || 0)
      }

      renderer.domElement.style.cursor = 'pointer'
      const alClic = (e) => {
        const r = renderer.domElement.getBoundingClientRect()
        puntero.x = ((e.clientX - r.left) / r.width) * 2 - 1
        puntero.y = -((e.clientY - r.top) / r.height) * 2 + 1
        lanzar()
      }
      const alMover = (e) => {
        const r = renderer.domElement.getBoundingClientRect()
        puntero.x = ((e.clientX - r.left) / r.width) * 2 - 1
        puntero.y = -((e.clientY - r.top) / r.height) * 2 + 1
      }
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        renderer.domElement.addEventListener('pointerdown', alClic)
        renderer.domElement.addEventListener('pointermove', alMover)
      }

      // Avanza las pelotas del juego. Van del cursor a la cara de la paleta y de
      // ahí salen de cuadro; el swing se dispara con el mismo reloj.
      const moverJuego = (dt, jugando) => {
        for (const b of banco) {
          if (!b.viva) continue
          b.t += dt
          const k = b.t / b.dur
          if (k < 1) {
            // viaje hacia la cara: en arco, no en línea recta
            const f = k * k * (3 - 2 * k)
            b.malla.position.set(
              b.o.x + (CONTACTO.x - b.o.x) * f,
              b.o.y + (CONTACTO.y - b.o.y) * f + Math.sin(f * Math.PI) * 1.2,
              b.o.z + (b.zGolpe - b.o.z) * f
            )
          } else {
            // devuelta: recta y con gravedad suave hasta salir de cuadro
            const s = b.t - b.dur
            b.malla.position.set(
              CONTACTO.x + b.v.x * s,
              CONTACTO.y + b.v.y * s - 4 * s * s,
              b.zGolpe + b.v.z * s
            )
            if (s > 1.5 || b.malla.position.y < SUELO_Y) { b.viva = false; b.malla.visible = false }
          }
          b.malla.rotation.x += dt * 9
          if (!jugando) { b.viva = false; b.malla.visible = false }
        }
      }

      const onResize = () => {
        renderer.setSize(W(), H())
        composer.setSize(W(), H())
        gtao.setSize(W(), H())
        bloom.setSize(W() / 2, H() / 2)   // igual que al crearlo: media resolución
        camera.aspect = W() / H()
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(mount)

      let raf = 0
      /* eslint-disable no-use-before-define -- `dibujar` se declara unas lineas
         mas abajo, pero acá sólo se la nombra dentro de funciones (window.__lab
         y frame) que recién corren después. Si alguna vez se la llama suelta
         acá arriba, sacá este disable: la página se va a ver en blanco. */
      // Permite pedir un cuadro concreto del guion sin depender del scroll ni de
      // requestAnimationFrame. Sirve para inspeccionar la escena cuadro a cuadro.
      if (typeof window !== 'undefined') {
        window.__lab = {
          escena: scene, camara: camera,
          codo, pelota, THREE,   // para medir choques de verdad, no por aproximación
          // Igual que probarGolpe pero para el GUION (el golpe que dispara el
          // scroll, no el clic). Son dos caminos distintos y hasta ahora sólo
          // se medía el del clic: por eso el del guion se desincronizó sin que
          // nadie lo notara. Recorre el tramo del golpe y devuelve el punto de
          // MÁXIMO acercamiento entre la pelota y la cara de la paleta.
          probarGuion() {
            let sep = Infinity, cuando = 0, dentro = 0
            for (let t = 0.16; t <= 0.46; t += 0.0025) {
              dibujar(t)
              const prog = seg(t, 0.12, 0.48)
              const caraZ = IMPACTO.z + empujeDe(prog, SHOTS.guion.thrust) + 0.42
              const d = pelota.position.z - caraZ
              if (Math.abs(d) < Math.abs(sep)) { sep = d; cuando = t }
              if (d < -0.02) dentro++          // cuadros con la pelota DETRÁS de la cara
            }
            return { separacion: +sep.toFixed(3), radioPelota: 0.45,
                     enT: +cuando.toFixed(3), cuadrosAtravesando: dentro,
                     veredicto: dentro > 0 ? 'LA ATRAVIESA'
                       : Math.abs(sep - 0.45) < 0.10 ? 'toca la cara' : 'pasa de largo' }
          },
          bloom, vineta,   // para comparar valores sin recompilar
          ao: gtao,   // para prender/apagar la oclusión y comparar el costo
          // Cuánto cuesta dibujar un cuadro, en milisegundos. No usa
          // requestAnimationFrame a propósito: con la pestaña en segundo plano
          // el navegador lo pausa y la medición nunca termina.
          // OJO: encadena renders sin esperar al monitor, así que satura la
          // placa y da un número peor que el real. Sirve para COMPARAR dos
          // variantes entre sí, no para decir a cuántos cuadros va la página.
          medirCuadro(veces = 40, t = 0.5) {
            progRef.current.t = t
            dibujar(t); composer.render()              // el primero calienta
            const t0 = performance.now()
            for (let i = 0; i < veces; i++) { dibujar(t); composer.render() }
            const ms = (performance.now() - t0) / veces
            return { msPorCuadro: +ms.toFixed(2), fpsTecho: Math.round(1000 / ms),
                     tam: [renderer.domElement.width, renderer.domElement.height] }
          },
          // Vista desde arriba de todo el club. Es la forma directa de ver si
          // quedó algo plantado adentro de una cancha: se miran los rectángulos
          // y lo que tienen encima, sin depender de contar objetos a mano.
          desdeArriba(alto = 420) {
            progRef.current.t = 0.5
            dibujar(0.5)
            const p = camera.position.clone(), q = camera.quaternion.clone(), f = camera.fov
            const cx = -(CANCHA_ANCHO + SEPARACION) / 2
            camera.position.set(cx, alto, RED_Z - CANCHA_LARGO / 2)
            camera.fov = 55
            camera.updateProjectionMatrix()
            camera.lookAt(cx, SUELO_Y, RED_Z - CANCHA_LARGO / 2)
            composer.render()
            const img = renderer.domElement.toDataURL('image/webp', 0.75)
            camera.position.copy(p); camera.quaternion.copy(q)
            camera.fov = f; camera.updateProjectionMatrix()
            return img
          },
          // Mide de verdad si la pelota y la paleta se encuentran: simula un
          // golpe cuadro a cuadro y devuelve la separación MÍNIMA entre la
          // pelota y la cara. Si da más que el radio de la pelota, pasó de
          // largo; si da muy negativo, la atravesó.
          probarGolpe(tipo = 'drive') {
            progRef.current.t = 0
            puntero.set(-0.35, 0.1)
            juego.ultimo = -99
            lanzar()
            if (!clic.activo) return 'no salio ninguna pelota'
            clic.tiro = SHOTS[tipo] || SHOTS.drive
            const b = banco.find(x => x.viva)
            b.zGolpe = CONTACTO.z + empujeDe(P_GOLPE, clic.tiro.thrust || 0)
            let sep = Infinity, cuando = 0
            const PASO = 1 / 240
            for (let i = 0; i < 480 && b.viva; i++) {
              moverJuego(PASO, true)
              clic.t += PASO / clic.dur
              if (clic.t >= 1) clic.activo = false
              const caraZ = IMPACTO.z + empujeDe(Math.min(1, clic.t), clic.tiro.thrust || 0) + 0.42
              const d = b.malla.position.z - caraZ      // separación al plano de la cara
              if (Math.abs(d) < Math.abs(sep)) { sep = d; cuando = clic.t }
            }
            b.viva = false; b.malla.visible = false; clic.activo = false
            return { tipo, separacion: +sep.toFixed(3), radioPelota: 0.45,
                     enProg: +cuando.toFixed(3),
                     veredicto: Math.abs(sep - 0.45) < 0.08 ? 'toca la cara'
                       : sep < 0 ? 'LA ATRAVIESA' : 'pasa de largo' }
          },
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
            composer.render()
            return { mallas, centro: c.toArray().map(n => +n.toFixed(1)), img: renderer.domElement.toDataURL('image/webp', 0.7) }
          },
        }
      }
      const pistaJuego = document.querySelector('.pista-juego')
      const pistaScroll = document.querySelector('.pista-scroll')
      const pistaCaja = document.querySelector('.pista-caja')
      let ultimoCuadro = performance.now() / 1000
      const frame = () => {
        raf = requestAnimationFrame(frame)
        const ahora = performance.now() / 1000
        const dt = Math.min(0.05, ahora - ultimoCuadro)   // topado: si la pestaña
        ultimoCuadro = ahora                              // vuelve de fondo, no salta
        const jugando = progRef.current.t <= JUEGO_HASTA
        if (pistaJuego) pistaJuego.style.opacity = jugando ? '1' : '0'
        if (pistaScroll) pistaScroll.style.opacity = progRef.current.t < 0.08 ? '1' : '0'
        if (pistaCaja) pistaCaja.style.opacity = progRef.current.t < 0.08 ? '1' : '0'
        juego.activo = jugando
        // El clic corre su propio reloj y se apaga solo al completarse: eso es lo
        // que evita que el swing se corte a mitad o se repita.
        if (clic.activo) { clic.t += dt / clic.dur; if (clic.t >= 1) clic.activo = false }
        if (!jugando) clic.activo = false
        moverJuego(dt, jugando)
        // Cosas que se mueven solas, como en un club de verdad: la pantalla LED
        // corre sus mensajes y las banderas se mecen con el viento. Van con el
        // reloj y no con el scroll: son ambiente, no guion.
        texLona.offset.x = (texLona.offset.x + dt * 0.022) % 1
        for (const b of banderas) b.grupo.rotation.y = b.base + Math.sin(ahora * 1.25 + b.fase) * 0.16
        // Con la pestaña de fondo el navegador ya frena requestAnimationFrame
        // solo, así que no hace falta nada más para no gastar batería. La versión
        // anterior usaba un IntersectionObserver y, si marcaba "no visible", el
        // bucle se cortaba y la pantalla quedaba en blanco.
        dibujar(progRef.current.t)
      }
      /* eslint-enable no-use-before-define */
      // ── Física del tiro ──
      // Van afuera de `dibujar` porque la usa también el tramo de la caja: la
      // caja nace donde estaba la pelota en el destello.
      const G = 15, REBOTE = 0.62
      // Salida más fuerte quiere decir más RÁPIDA, no más alta: sube la
      // velocidad de avance y se baja la vertical, si no queda un globo.
      // Verificado: pasa la red con 2.64 de aire, pica en z=18.3 y rebota
      // 3.2 unidades, un solo pique.
      const VZ = 15, VX = 2.1, V0Y = 8.5
      const T_PIQUE = 1.62                     // cuándo toca el piso (calculado)
      const PISO_BOLA = SUELO_Y + R_BOLA
      const posicionBola = (tt, v) => {
        if (tt < T_IMPACTO) {
          // ENTRADA por el costado, no de frente a la cámara: antes venía casi
          // pegada al lente y no se leía la trayectoria.
          // Acelera al llegar, no desacelera. `suave` (smoothstep) frena la
          // pelota justo antes del impacto, y ahí se quedaba flotando en la
          // zona que barre la paleta: por eso la alcanzaba. Una pelota en
          // vuelo no frena, así que al cuadrado además de real es lo que
          // resuelve el cruce.
          const te = Math.pow(seg(tt, 0.02, T_IMPACTO), 2)
          // Y en Z entra todavía un poco más tarde: durante el swing la paleta
          // rota en Y, queda de canto y su borde barre hacia adelante casi un
          // ancho de paleta.
          const tz = te * te
          return v.set(
            mix(-17, CONTACTO_GUION.x, te),
            mix(8.2, CONTACTO_GUION.y, te) - Math.sin(te * Math.PI) * 1.4,
            mix(3.5, CONTACTO_GUION.z, tz)
          )
        }
        // El tiempo de vuelo avanza LINEAL con el scroll (sin suavizado): si
        // no, la pelota parece frenar y acelerar sola.
        const tv = (tt - T_IMPACTO) * RITMO_VUELO
        const rz = tv < T_PIQUE ? tv : T_PIQUE + (tv - T_PIQUE) * 0.42
        return v.set(
          CONTACTO_GUION.x + VX * rz,
          Math.max(PISO_BOLA, balistica(tv, CONTACTO_GUION.y, V0Y, G, PISO_BOLA, REBOTE)),
          CONTACTO_GUION.z + VZ * rz          // cruza la red y pica del otro lado
        )
      }
      // easeOutBack: llega pasándose un poco y vuelve. La caja "se infla" al
      // salir del destello en vez de aparecer de golpe.
      const conRebote = k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2)
      const vInicioCaja = new THREE.Vector3()
      posicionBola(T_DESTELLO, vInicioCaja)
      const foco = new THREE.Vector3()
      const RADIO_INICIO = 8.55
      const FILM_TAN = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const anchoLg = window.matchMedia('(min-width: 1024px)')

      const dibujar = (t) => {

        // ── El guion, escrito en función del progreso ──
        // 0.00–0.055 · se puede jugar: cada clic manda una pelota
        // 0.02–0.34  · la pelota del guion entra desde el costado
        // 0.12–0.48  · el swing; el golpe cae en T_IMPACTO (≈0.336)
        // 0.34–0.70  · vuelo: cruza la red, pica y rebota
        // 0.67–0.745 · destello en lo alto del rebote: la pelota pasa a ser caja
        // 0.70–0.84  · la caja cae, rebota apenas y se asienta
        // 0.40–0.80  · la cámara gira 90° siguiendo la pelota, sin cortes
        // 0.74–0.92  · la cámara se acerca a la caja; al final, los botones
        const aEntra = suave(seg(t, 0.18, 0.30))

        // ── EL SWING ──
        // Portado tal cual de Paleta3D: mismas tres fases, mismos coeficientes y
        // los mismos cinco tipos de golpe. Lo que faltaba acá era la PRIORIDAD y
        // el REPOSO explícito: antes se mezclaba el reloj del clic con el del
        // scroll, y al terminar el clic saltaba de una pose a otra — de ahí los
        // cortes y el golpe repetido.
        //   1º el guion (scroll)   2º el clic   3º reposo
        let prog = 0, lado = 1, tiro = SHOTS.guion
        if (t > JUEGO_HASTA) {
          prog = seg(t, 0.12, 0.48)
        } else if (clic.activo) {
          prog = clic.t
          lado = clic.lado
          tiro = clic.tiro
        }

        const w   = suave(seg(prog, 0, 0.35))     // carga
        const sw  = suave(seg(prog, 0.35, 0.60))  // golpe
        const rec = suave(seg(prog, 0.60, 1))     // vuelta
        const pico = sw * (1 - rec)

        codo.rotation.z = (0.42 * w - 1.10 * sw + 0.70 * rec) * lado * tiro.zAmp
        codo.rotation.x = -0.30 * w * (1 - sw) + tiro.xBias * (0.35 * w + pico)
        codo.rotation.y = tiro.yAmp * lado * suave(seg(prog, 0, 0.3)) * (1 - suave(seg(prog, 0.62, 1)))
        const empuje = empujeDe(prog, tiro.thrust || 0)
        // el revés muestra la otra cara y vuelve
        if (tiro.flip) codo.rotation.y += Math.PI * 2 * lado * suave(seg(prog, 0.1, 0.9))

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
        const enCaja = t >= T_DESTELLO
        posicionBola(Math.min(t, T_DESTELLO), pelota.position)
        pelota.visible = aEntra > 0.01 && !enCaja
        // Gira mientras vuela y, justo antes del destello, se acelera y crece un
        // poco: anticipa que algo va a pasar.
        const sube = seg(t, T_DESTELLO - 0.03, T_DESTELLO)
        const vueltas = seg(t, 0.30, 0.72) * 9 + suave(sube) * 6
        pelota.rotation.set(vueltas, vueltas * 0.3, vueltas * 0.4)
        pelota.scale.setScalar(1 + 0.18 * suave(sube))

        // ── Cámara: un giro continuo de 90° alrededor de la acción ──
        // Se resuelve ANTES que la caja, porque la caja tiene que terminar
        // enfrentando a la cámara para que el logo se lea.
        const sigue = suave(seg(t, 0.24, 0.46))          // suelta la paleta, toma la pelota
        const giro = suave(seg(t, 0.40, 0.80)) * (Math.PI / 2)

        // ── LA CAJA ──
        // Nace en el pico del destello donde estaba la pelota, sale "inflándose"
        // y cae con la misma gravedad, con un rebote corto (e = 0.3: el cartón
        // casi no rebota) y un aplaste mínimo al tocar el piso.
        const tc = Math.max(0, t - T_DESTELLO) * RITMO_VUELO     // segundos desde el destello
        const pop = seg(t, T_DESTELLO, T_DESTELLO + 0.035)
        const escCaja = enCaja ? mix(0.35, 1, conRebote(pop)) : 0.35
        const asienta = suave(seg(t, T_DESTELLO, T_APOYO + 0.02))
        // Mientras gira en el aire apoya sobre una arista, no sobre la cara: se
        // le da margen para que no se hunda (un cubo rotado llega a 1,73 x R).
        const pisoCaja = SUELO_Y + (L_CAJA * escCaja) / 2 * (1 + 0.5 * (1 - asienta))
        const V0_CAJA = 1.2
        const yCaja = balistica(tc, vInicioCaja.y, V0_CAJA, G, pisoCaja, 0.3)
        // cuándo toca el piso por primera vez (para el aplaste)
        const caida = vInicioCaja.y - (SUELO_Y + L_CAJA / 2)
        const tToca = (V0_CAJA + Math.sqrt(V0_CAJA * V0_CAJA + 2 * G * Math.max(0, caida))) / G
        const aplaste = tc > tToca - 0.03 ? Math.exp(-Math.pow((tc - tToca) / 0.06, 2)) * 0.07 : 0
        // sigue avanzando un poco al caer (traía la inercia de la pelota)
        const avance = 1 - Math.exp(-tc * 3)
        caja.visible = enCaja
        caja.position.set(
          vInicioCaja.x + 0.35 * avance,
          yCaja - aplaste * L_CAJA * 0.5,
          vInicioCaja.z + 2.4 * avance
        )
        caja.scale.set(escCaja * (1 + aplaste * 0.5), escCaja * (1 - aplaste), escCaja * (1 + aplaste * 0.5))
        // Da vueltas al caer y se endereza al apoyarse, en tres cuartos respecto
        // de la cámara: de frente puro se veía plana; así se lee la etiqueta, la
        // tapa y la cinta del costado.
        const TRES_CUARTOS = -0.42
        caja.rotation.set(
          (1 - asienta) * 1.1 * Math.sin(tc * 5),
          giro + TRES_CUARTOS + (1 - asienta) * 2.2,
          (1 - asienta) * 0.5 * Math.cos(tc * 4)
        )

        // Sombra de contacto: se achica y se oscurece a medida que baja
        const alturaCaja = Math.max(0, caja.position.y - (SUELO_Y + (L_CAJA * escCaja) / 2))
        sombra.visible = enCaja
        sombra.position.set(caja.position.x, SUELO_Y + 0.015, caja.position.z)
        const sc = L_CAJA * escCaja * (1.7 + alturaCaja * 0.35)
        sombra.scale.set(sc, sc, 1)
        matSombra.opacity = Math.max(0, 0.9 - alturaCaja * 0.28)

        // ── EL DESTELLO ──
        const baja = seg(t, T_DESTELLO, T_DESTELLO + 0.045)
        const brillo = suave(sube) * (1 - suave(baja))
        destello.visible = brillo > 0.01
        destello.material.opacity = brillo
        destello.scale.setScalar(mix(0.5, 2.8, suave(sube)) * (1 + 0.3 * suave(baja)))
        destello.position.copy(enCaja ? vInicioCaja : pelota.position)
        const onda = seg(t, T_DESTELLO, T_DESTELLO + 0.06)
        anillo.visible = onda > 0 && onda < 1
        anillo.material.opacity = (1 - onda) * 0.75
        anillo.scale.setScalar(mix(1.2, 6.5, 1 - Math.pow(1 - onda, 2)))
        anillo.position.copy(vInicioCaja)

        // ── Cámara ──
        // Sigue a la pelota y después a la caja. Arranca cerca para que la
        // paleta se lea como protagonista; sube cuando la pelota cruza la red
        // (a la altura de la faja, la red cortaba media pantalla); y al final
        // baja y se acerca a la caja, mirándola apenas desde arriba.
        // La cámara ORBITA alrededor del foco, así que el tamaño de la paleta
        // en pantalla lo fija este radio: en el hero público mide 5.2 con la
        // cámara a 11.5 (0.452 por unidad); acá mide 3.9, o sea 8.55 de radio.
        foco.set(IMPACTO.x, IMPACTO.y, IMPACTO.z).lerp(enCaja ? caja.position : pelota.position, sigue)
        const acerca = suave(seg(t, 0.74, 0.92))
        // Pantalla angosta (celular vertical): con el FOV vertical fijo, la
        // paleta llenaba el alto entero. En el ARRANQUE la cámara se aleja más:
        // con el factor del hero público (0.58) la paleta ocupaba casi todo el
        // ancho de un iPhone 15. Con 0.9 ocupa cerca de la mitad y se ve el
        // entorno. A medida que la pelota sale vuelve al factor de siempre, que
        // es el que deja bien encuadrada la caja del cierre.
        const aspecto = camera.aspect || 1
        const angosto = mix(
          Math.max(1, 0.9 / aspecto),
          Math.max(1, 0.58 / aspecto),
          suave(seg(t, 0.36, 0.56))
        )
        // Cierre a 6.8 y 5.3 de alto: más cerca la caja pisaba los botones, y
        // más baja la línea central de la cancha le quedaba tangente al borde
        // de arriba, que visualmente la cortaba (con 4.2 todavía la rozaba).
        // Desde arriba además se ve la cinta de la tapa.
        // A mitad del vuelo la cámara se abre y sube (`abre` va de 0 a 1 y
        // vuelve): es el plano general que muestra el club, justo cuando el
        // texto dice "Envíos a todo el país". Vuelve antes del destello.
        // Se aleja casi sin subir y la mira apunta por encima de la pelota: si
        // la cámara sube, mira para abajo y lo que se ve es piso, no el club.
        const abre = Math.sin(Math.PI * seg(t, 0.44, 0.69))
        const dist = (mix(mix(RADIO_INICIO, 7.6, suave(seg(t, 0.40, 0.72))), 6.8, acerca) + 16 * abre) * angosto
        const alto = mix(mix(1.2, 3.8, suave(seg(t, 0.36, 0.52))), 5.3, acerca) + 1.5 * abre
        camera.position.set(
          foco.x + Math.sin(giro) * dist,
          foco.y + alto,
          foco.z + Math.cos(giro) * dist
        )
        // En pantalla vertical el texto va en una tarjeta abajo que tapa cerca
        // de un tercio de la pantalla. Se apunta un poco por debajo del foco
        // para que la paleta, y al final la caja, queden centradas en lo que se
        // ve por ENCIMA de la tarjeta. Es proporcional a la distancia, así sube
        // lo mismo en pantalla esté la cámara cerca o lejos.
        const bajaMira = aspecto < 1 ? dist * (0.08 + 0.07 * acerca) : 0
        camera.lookAt(foco.x, foco.y - bajaMira + 5 * abre, foco.z)

        // ── Encuadre ──
        // En pantallas anchas el protagonista se corre al lado CONTRARIO del
        // texto, como en un plano de cine: con la paleta al centro, "Paletas de
        // pádel" le quedaba encima. Se hace corriendo el sensor de la cámara
        // (filmOffset), no moviendo la cámara, así la perspectiva no cambia.
        // En el celular no hace falta: el texto va en una tarjeta abajo.
        let corrimiento = 0
        // Mismo corte que el CSS (lg: = 1024 px), si no el texto ya está al
        // costado y la paleta todavía al centro.
        if (camera.aspect > 1.2 && anchoLg.matches) {
          ACTOS.forEach((a, i) => {
            const entra = i === 0 ? 1 : suave(seg(t, a.at - 0.03, a.at + 0.02))
            const sale = a.fin ? 0 : suave(seg(t, a.at + DURA_ACTO - 0.02, a.at + DURA_ACTO + 0.03))
            corrimiento += (a.lado === 'izq' ? 1 : -1) * entra * (1 - sale)
          })
          corrimiento = Math.max(-1, Math.min(1, corrimiento))
        }
        const CORRE = 0.13                     // fracción del ancho de pantalla
        camera.filmOffset = -corrimiento * CORRE * camera.getFilmWidth() * camera.aspect * FILM_TAN
        camera.updateProjectionMatrix()

        // El sol gira despacio con el guion: con la luz clavada, el tramo largo
        // del vuelo quedaba plano porque nada cambiaba de tono.
        sol.position.set(4 + 9 * suave(t), 8 + 3 * suave(t), 6 - 11 * suave(t))
        sol.intensity = mix(2.0, 1.7, suave(seg(t, 0.3, 0.95)))

        // Los carteles de producto basculan apenas, cada uno con su desfase: da
        // sensación de carrusel sin que ninguno llegue a darse vuelta.
        if (cartelesRef.lista) {
          for (const c of cartelesRef.lista) {
            c.grupo.rotation.y = c.base + Math.sin(t * 5 + c.fase) * 0.20
          }
        }

        composer.render()
      }
      frame()

      // La escena ya ocupa su lugar: recién ahora ScrollTrigger puede medir bien
      ScrollTrigger.refresh()

      cleanup = () => {
        cancelAnimationFrame(raf)
        renderer.domElement.removeEventListener('pointerdown', alClic)
        renderer.domElement.removeEventListener('pointermove', alMover)
        // geoJuego/matJuego son los de la pelota del guion: los libera aquel bloque
        ro.disconnect()
        ;[scene, escenaFx].forEach(esc => esc.traverse(o => {
          o.geometry?.dispose()
          if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
          else o.material?.dispose()
        }))
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
      // La escena queda en el cuadro final (la caja apoyada) y no se crea el
      // pin: antes quedaban siete pantallas de scroll vacío.
      progRef.current.t = 1
      return
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stageRef.current,
        start: 'top top',
        // Cuánto hay que scrollear para recorrer el guion. Eran 6 pantallas:
        // en el celular es mucho y la gente se va antes de llegar al final.
        end: '+=400%',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
      defaults: { ease: 'none' },   // con scrub nunca se usa easing
    })

    // El guion completo dura 1 unidad: así el `at` de cada texto es directo.
    tl.to(progRef.current, { t: 1, duration: 1 }, 0)

    // El titular se ve apenas carga la página: un hero no puede arrancar mudo.
    gsap.set('.acto', { autoAlpha: 0, y: 26 })
    gsap.set('.acto-0', { autoAlpha: 1, y: 0 })
    gsap.set('.scrim-izq', { autoAlpha: 1 })
    gsap.set('.scrim-der', { autoAlpha: 0 })
    gsap.set('.cta-final', { autoAlpha: 0, y: 12 })
    ACTOS.forEach((a, i) => {
      // el velo del lado del texto entra y sale con él
      const velo = a.lado === 'izq' ? '.scrim-izq' : '.scrim-der'
      if (i > 0) {
        tl.to(`.acto-${i}`, { autoAlpha: 1, y: 0, duration: 0.04 }, a.at)
        tl.to(velo, { autoAlpha: 1, duration: 0.04 }, a.at)
      }
      if (!a.fin) {
        tl.to(`.acto-${i}`, { autoAlpha: 0, y: -22, duration: 0.04 }, a.at + DURA_ACTO)
        tl.to(velo, { autoAlpha: 0, duration: 0.04 }, a.at + DURA_ACTO)
      }
    })
    // Los botones, cuando la caja ya está apoyada y la cámara se acercó
    tl.to('.cta-final', { autoAlpha: 1, y: 0, duration: 0.04 }, 0.9)
  }, { scope: rootRef })

  const textoWhatsApp = encodeURIComponent('¡Hola SARO! Quiero hacer un pedido.')

  return (
    <div ref={rootRef} className="bg-[#eef2f8]">
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-saro-dark/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full backdrop-blur">
        MAQUETA · hero de scroll, todavía no publicado
      </div>

      <section
        ref={stageRef}
        className={`lab-stage relative w-full overflow-hidden ${
          sinMovimiento ? 'min-h-screen py-16' : 'h-screen'
        }`}
      >
        <div ref={mountRef} className="absolute inset-0" />

        {/* Pantalla de carga: tapa la escena hasta que llega la paleta. Sin
            esto se veía un fondo celeste vacío mientras bajaba el modelo. */}
        {!sinMovimiento && (
          <div
            aria-hidden={listo}
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#eef2f8] transition-opacity duration-700 ${
              listo ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <img src="/assets/logo-icon.png" alt="" className="w-14 h-14 animate-pulse" />
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[.3em] text-slate-400">
              Cargando
            </p>
          </div>
        )}

        {/* Velos detrás del texto, sólo en pantallas anchas: sin ellos la bajada
            gris quedaba sobre la cancha y no se leía. En el celular el texto ya
            va sobre una tarjeta. */}
        {!sinMovimiento && (
          <>
            <div className="scrim scrim-izq pointer-events-none absolute inset-y-0 left-0 w-[46%] hidden lg:block bg-gradient-to-r from-white/75 via-white/35 to-transparent" />
            <div className="scrim scrim-der pointer-events-none absolute inset-y-0 right-0 w-[46%] hidden lg:block bg-gradient-to-l from-white/75 via-white/35 to-transparent" />
          </>
        )}

        {ACTOS.map((a, i) => (
          <div
            key={i}
            className={
              sinMovimiento
                // en columna y sobre un fondo propio: los cinco textos comparten
                // el mismo punto absoluto y, sin la animación que los turna,
                // quedarían encimados e ilegibles
                ? 'relative mx-auto w-[min(90vw,560px)] text-left bg-white/85 backdrop-blur rounded-2xl px-5 py-4 mb-3 shadow-card'
                // En el celular y la tablet NO van al costado: la pantalla es
                // angosta y quedaban encima de la paleta. Van abajo, a lo ancho
                // y sobre un panel claro. Recién en lg: vuelven a los costados,
                // con el protagonista corrido al otro lado (ver "Encuadre").
                // El posicionamiento va en este contenedor y la animación en el
                // de adentro: si GSAP anima `y` sobre el mismo elemento, pisa
                // el -translate-y-1/2 que lo centra.
                : `absolute w-[calc(100%-2rem)] left-4 right-4 bottom-8
                   lg:w-[min(40vw,440px)] lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 ${
                    a.lado === 'izq' ? 'lg:left-[6vw] lg:right-auto' : 'lg:right-[6vw] lg:left-auto'
                  }`
            }
          >
            <div
              className={
                sinMovimiento
                  ? ''
                  : `acto acto-${i} text-left bg-white/85 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-card
                     lg:bg-transparent lg:backdrop-blur-none lg:rounded-none lg:px-0 lg:py-0 lg:shadow-none ${
                      a.lado === 'izq' ? 'lg:text-left' : 'lg:text-right'
                    }`
              }
            >
              <p className="text-[11px] font-bold uppercase tracking-[.32em] text-saro-blue mb-2">{a.k}</p>
              <h2 className="text-3xl lg:text-5xl font-extrabold text-saro-dark tracking-tight leading-[1.05]">
                {a.t}
              </h2>
              <p className="text-sm lg:text-lg text-slate-600 lg:text-slate-700 mt-3 leading-relaxed">{a.d}</p>
              {a.fin && (
                <div className={`cta-final mt-5 flex flex-col sm:flex-row gap-2.5 ${
                  a.lado === 'der' ? 'lg:justify-end' : ''
                }`}>
                  <Link
                    href="/paletas"
                    className="inline-flex items-center justify-center gap-2 bg-saro-dark hover:bg-saro-blue text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-saro-dark/20 btn-press"
                  >
                    Ver paletas
                    <span aria-hidden="true">→</span>
                  </Link>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=${textoWhatsApp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-500/25 btn-press"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                    </svg>
                    Escribinos por WhatsApp
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Dos pistas al pie: que se puede jugar y que se puede scrollear. Se
            desvanecen en cuanto arranca el guion: en el celular quedaban
            debajo de la tarjeta de texto. */}
        {!sinMovimiento && (
          <div className="absolute top-20 lg:top-auto lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest bg-white/75 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm pista-caja transition-opacity duration-300">
            <span className="pista-juego text-saro-blue transition-opacity duration-300">
              Tocá para jugar
            </span>
            <span className="pista-scroll text-slate-400 transition-opacity duration-300">Scrolleá</span>
          </div>
        )}
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
