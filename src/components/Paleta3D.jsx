'use client'

import { useEffect, useRef } from 'react'
import { PALETAS_3D } from '../data/paletas3d'

/**
 * Paleta3D — carga un modelo 3D de paleta (uno al azar de PALETAS_3D en cada
 * carga de la página) y lo anima según el progreso de scroll (progressRef), el
 * mouse y los clicks.
 *
 * Los modelos salen de las fotos reales, a medida real (src/data/paletas3d.js).
 * Acá se recentra, se escala y se orienta para el hero.
 */

// Ajustes de encuadre (tuneables tras ver el modelo)
const TARGET_HEIGHT = 5.2   // alto deseado en unidades de escena
const ROT_X = 0             // corrección de inclinación inicial
const ROT_Y = 0             // corrección de giro inicial
const ROT_Z = 0
const MODEL_DROP = 0.7      // baja la paleta un poco para que no tape el título
const IMPACTO = 0.6         // en qué parte del golpe (0..1) la cara llega a la pelota: el pico de setSwing
const R_PELOTA = 0.42

// Al abrir o recargar la página se elige una paleta al azar y sólo se baja esa
// (~500 KB). El resto de los modelos los carga el visor de /paletas a pedido.
// El encuadre se autoajusta: la escena escala el modelo a TARGET_HEIGHT.
// La MASTER Carbono 12K (Meshy) es la paleta que tuvo siempre el hero: su textura se ajustó
// mirándola con ACES, así que conserva ese tono. Las nuevas salen de fotos y van con Neutral.
const MODELOS_HERO = [
  ...PALETAS_3D.map(p => ({ url: `/models/paletas/${p.slug}.glb`, aces: false })),
  { url: '/models/paleta-opt.glb', aces: true },
]
const MODELO_ELEGIDO = MODELOS_HERO[Math.floor(Math.random() * MODELOS_HERO.length)]

export default function Paleta3D({ progressRef, onReady }) {
  const mountRef = useRef(null)

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    Promise.all([
      import('three'),
      import('three/examples/jsm/environments/RoomEnvironment.js'),
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ]).then(([THREE, { RoomEnvironment }, { GLTFLoader }, { MeshoptDecoder }]) => {
      if (disposed || !mountRef.current) return
      const mount = mountRef.current
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // En el celular se dibuja con menos píxeles y una sombra más chica: la
      // sombra es muy difusa (radius 9) y a 1,5x la paleta se ve igual de nítida,
      // pero la placa trabaja bastante menos y el scroll va más suelto.
      const celular = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
      const W = () => mount.clientWidth || 1
      const H = () => mount.clientHeight || 1

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, celular ? 1.5 : 2))
      renderer.setSize(W(), H())
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      // Neutral (Khronos PBR Neutral) respeta el color de la foto; ACES corría los rojos a
      // naranja y lavaba los claros.
      renderer.toneMapping = MODELO_ELEGIDO.aces ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping
      renderer.toneMappingExposure = MODELO_ELEGIDO.aces ? 1.0 : 0.7   // medido: con 0,7 el brillo queda como en la foto
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, W() / H(), 0.1, 100)
      camera.position.set(0, 0, 11.5)
      camera.lookAt(0, 0, 0)

      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

      const key = new THREE.DirectionalLight(0xffffff, 1.6)
      key.position.set(5, 9, 7)
      key.castShadow = true
      key.shadow.mapSize.set(celular ? 1024 : 2048, celular ? 1024 : 2048)
      key.shadow.camera.near = 1
      key.shadow.camera.far = 30
      Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 })
      key.shadow.bias = -0.0004
      key.shadow.radius = 9
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xdfeaff, 0.5)
      fill.position.set(-6, 2, 4)
      scene.add(fill)

      // Grupo exterior que gira; el modelo se cuelga adentro ya centrado
      const paleta = new THREE.Group()
      scene.add(paleta)

      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 18),
        new THREE.ShadowMaterial({ opacity: 0.16 })
      )
      shadowPlane.rotation.x = -Math.PI / 2
      shadowPlane.position.y = -3.8   // más abajo: acompaña la bajada del modelo, evita que la paleta flotando la toque
      shadowPlane.receiveShadow = true
      scene.add(shadowPlane)

      // Pelota de padel/tenis (para el remate al final del scroll)
      const ballGeo = new THREE.SphereGeometry(R_PELOTA, 28, 28)
      const ballMat = new THREE.MeshStandardMaterial({ color: 0xc7f23a, roughness: 0.85, metalness: 0.0 })
      const ball = new THREE.Mesh(ballGeo, ballMat)
      ball.castShadow = true
      ball.visible = false
      scene.add(ball)

      // Pool de pelotas para el modo interactivo (click en la escena 1)
      const pool = []
      for (let i = 0; i < 5; i++) {
        const m = new THREE.Mesh(ballGeo, ballMat)
        m.castShadow = true
        m.visible = false
        scene.add(m)
        pool.push({ mesh: m, active: false, t: 0, dur: 0.8, dir: 1 })
      }

      let model = null
      let swing = null   // grupo que pivotea (swing del golpe)
      let cara = null    // dónde está la cara de golpe del modelo (en el espacio de `holder`)
      const HALF = TARGET_HEIGHT / 2
      const ELBOW = 1.4  // el pivote baja por debajo del mango (como el codo)
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
      loader.load(MODELO_ELEGIDO.url, (gltf) => {
        if (disposed) return
        model = gltf.scene
        // La correa cuelga quieta: en los golpes y giros del hero se vería rígida.
        const correas = []
        model.traverse(o => { if (o.isMesh && o.material?.name?.endsWith('-correa')) correas.push(o) })
        correas.forEach(o => { o.removeFromParent(); o.geometry.dispose(); o.material.dispose() })
        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true
            o.receiveShadow = true
            if (o.material) o.material.envMapIntensity = 0.9
          }
        })
        // Recentrar y escalar
        const box = new THREE.Box3().setFromObject(model)
        const size = new THREE.Vector3(); box.getSize(size)
        const center = new THREE.Vector3(); box.getCenter(center)
        const scale = TARGET_HEIGHT / size.y
        model.position.sub(center)              // centra en origen
        // La cara de golpe: la caja de las caras (materiales "-cara"/"-dorso"), medida en el
        // espacio del modelo ya centrado. Cada modelo tiene la suya (la Kids es más chica).
        model.updateMatrixWorld(true)
        const caja = new THREE.Box3()
        model.traverse(o => { if (o.isMesh && /-(cara|dorso)$/.test(o.material?.name || '')) caja.expandByObject(o) })
        if (caja.isEmpty()) caja.copy(new THREE.Box3().setFromObject(model))
        const alto = caja.max.y - caja.min.y
        cara = {
          x: (caja.min.x + caja.max.x) / 2, ancho: (caja.max.x - caja.min.x) / 2,
          y: caja.max.y - 0.33 * alto, altoZona: 0.1 * alto,   // centro de la cabeza, no del cuello
          yMin: caja.max.y - 0.62 * alto, yMax: caja.max.y,     // la cabeza (donde puede tocar la pelota)
          zF: caja.max.z, zD: caja.min.z,
        }
        const holder = new THREE.Group()
        holder.add(model)
        holder.scale.setScalar(scale)
        holder.rotation.set(ROT_X, ROT_Y, ROT_Z)
        holder.position.y = HALF + ELBOW        // sube el modelo: pivote (codo) por debajo del mango
        // Grupo swing: su origen = punto del codo. Rotarlo hace pivotear como brazo/raqueta.
        swing = new THREE.Group()
        swing.position.y = -(HALF + ELBOW)      // recoloca el conjunto centrado
        swing.add(holder)
        paleta.add(swing)
        cara.holder = holder
        if (!disposed && onReady) onReady()   // avisa al hero que ya se puede sacar el placeholder
      }, undefined, (err) => console.error('Error cargando glb:', err))

      const onResize = () => {
        renderer.setSize(W(), H())
        camera.aspect = W() / H()
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(onResize)
      ro.observe(mount)

      // Seguimiento del mouse (escena 1: flotar + inclinar hacia el cursor)
      const mouse = { x: 0, y: 0 }
      const onPointer = (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1
        mouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
      }
      window.addEventListener('pointermove', onPointer, { passive: true })

      const CAM_Z = 13.5
      const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k) }
      const TRIGGER = 0.65  // p que dispara el remate
      const RESET = 0.5     // p por debajo del cual se re-arma
      const HIT_DUR = 1.4   // duración del remate (seg)
      let raf = 0
      let baseY = 0, baseX = 0, camPull = 0
      let hitState = 'idle' // idle | playing | done
      let hitT = 0
      const t0 = performance.now()
      let last = t0

      // Interactivo: click en la escena 1 lanza una pelota y la paleta la devuelve.
      const remate = { u: 0, v: 0.3, lado: 1, fase: 'in', mesh: ball }
      let clickT = 0, clickActive = false, clickDur = 0.7, clickDir = 1, clickShot
      let lastLaunch = -999
      let hitsSinceFlip = 0, nextFlip = 4 + Math.floor(Math.random() * 3)  // cada 4–6 golpes, uno al revés
      // e = lado de entrada de la pelota (+1 = viene por la izquierda, -1 = por la derecha)
      // Tipos de golpe: cambian la amplitud del swing lateral (zAmp), un sesgo en X
      // (arriba/abajo, para insinuar remate vs globo) y cuánto gira la cara (yAmp).
      // Cada golpe define: amplitud del swing lateral (zAmp), sesgo arriba/abajo (xBias),
      // giro de cara (yAmp), empuje en profundidad (thrust), y si muestra la otra cara (flip).
      const SHOTS = {
        drive:  { zAmp: 0.9,  xBias:  0.0,  yAmp: -0.95, thrust: 1.4 },  // derecha: swing + punch
        volea:  { zAmp: 0.42, xBias:  0.18, yAmp: -0.45, thrust: 1.9 },  // volea: casi todo hacia adelante
        globo:  { zAmp: 0.55, xBias: -0.32, yAmp: -0.5,  thrust: 0.8 },  // globo: cuchareo hacia arriba
        remate: { zAmp: 0.6,  xBias:  0.34, yAmp: -0.32, thrust: 1.4 },  // remate/bandeja: arriba→abajo
        reves:  { zAmp: 0.6,  xBias:  0.05, yAmp: -0.5,  thrust: 1.2, flip: true }, // giro mostrando la otra cara
      }
      const setSwing = (prog, e, sc, shot = SHOTS.drive) => {
        if (!swing) return
        const w = smoothstep(0, 0.35, prog), s = smoothstep(0.35, 0.6, prog), r = smoothstep(0.6, 1, prog)
        const hitEnv = s * (1 - r)   // pico alrededor del impacto
        // Menos lateral que antes; el golpe suma profundidad (adelante/atrás) para más "punch"
        swing.rotation.z = (0.42 * w - 1.1 * s + 0.7 * r) * e * sc * shot.zAmp
        swing.rotation.x = -0.3 * w * (1 - s) + shot.xBias * (0.35 * w + hitEnv)
        swing.rotation.y = shot.yAmp * e * smoothstep(0, 0.3, prog) * (1 - smoothstep(0.62, 1, prog))
        // Profundidad: carga hacia atrás en el windup y empuja hacia adelante en el impacto
        swing.position.z = (shot.thrust || 0) * (-0.4 * w * (1 - s) + hitEnv)
        // Golpe al revés: giro de 360° (se ve la otra cara y vuelve al frente)
        // al impacto lleva medio giro (pega con el dorso, nunca de canto) y completa la vuelta después
        if (shot.flip) swing.rotation.y += Math.PI * e * (smoothstep(0.1, IMPACTO, prog) + smoothstep(IMPACTO, 0.95, prog))
      }
      // Punto de contacto en el mundo, en este cuadro: el punto (u, v) de la cara, del lado que
      // mira a la pelota, separado un radio de pelota. Se recalcula cada cuadro porque la paleta
      // se mueve: así la pelota llega justo a la cara y nunca la atraviesa.
      const vNormal = new THREE.Vector3(), vCentro = new THREE.Vector3(), vPunto = new THREE.Vector3()
      const vDesde = new THREE.Vector3(), qCara = new THREE.Quaternion()
      const contacto = (b, desde) => {
        cara.holder.getWorldQuaternion(qCara)
        vNormal.set(0, 0, 1).applyQuaternion(qCara)
        vCentro.set(cara.x, cara.y, 0); cara.holder.localToWorld(vCentro)
        const lado = b.lado ?? (vNormal.dot(vPunto.copy(desde).sub(vCentro)) >= 0 ? 1 : -1)
        vPunto.set(cara.x + b.u * cara.ancho, cara.y + b.v * cara.altoZona, lado > 0 ? cara.zF : cara.zD)
        cara.holder.localToWorld(vPunto)
        vNormal.multiplyScalar(lado)
        return vPunto.addScaledVector(vNormal, R_PELOTA)
      }
      // Si la cara alcanza a la pelota (en el seguimiento del golpe la paleta sigue avanzando),
      // la empuja hasta apoyarla en la superficie: nunca la atraviesa.
      const vLocal = new THREE.Vector3(), vEscala = new THREE.Vector3()
      const empujar = (pos, lado) => {
        vLocal.copy(pos); cara.holder.worldToLocal(vLocal)
        if (Math.abs(vLocal.x - cara.x) > cara.ancho || vLocal.y < cara.yMin || vLocal.y > cara.yMax) return false
        const r = R_PELOTA / cara.holder.getWorldScale(vEscala).x
        const medio = (cara.zF + cara.zD) / 2, grosor = (cara.zF - cara.zD) / 2
        if (Math.abs(vLocal.z - medio) >= grosor + r) return false
        vLocal.z = medio + lado * (grosor + r)
        pos.copy(cara.holder.localToWorld(vLocal))
        return true
      }
      // Salida: en la dirección pedida pero siempre alejándose de la cara que pegó (vNormal)
      const salir = (b, dx, dy, spd) => {
        const v = new THREE.Vector3(dx, dy, 0).normalize().multiplyScalar(0.8).addScaledVector(vNormal, 0.6).normalize()
        b.vx = v.x * spd; b.vy = v.y * spd; b.vz = v.z * spd
        b.px = b.mesh.position.x; b.py = b.mesh.position.y; b.pz = b.mesh.position.z
        b.phase = 'out'; b.outT = 0
      }
      const MIN_GAP = 0.45  // tiempo mínimo entre pelota y pelota (seg)
      const launch = () => {
        if (!swing || reduce) return
        const nowS = performance.now() / 1000
        if (nowS - lastLaunch < MIN_GAP) return        // throttle: no se acumulan
        if (clickActive && clickT < IMPACTO) return    // la pelota anterior todavía no llegó a la cara
        const b = pool.find(x => !x.active)
        if (!b) return
        const interval = Math.min(2.5, nowS - lastLaunch)
        const speedK = smoothstep(MIN_GAP, 2.0, interval) // 0 rápido → 1 lento
        let dur = 0.34 + speedK * 0.66                 // 0.34s (rápido) .. 1.0s (lento)
        lastLaunch = nowS
        // Origen desde donde está el mouse (el usuario elige de dónde sale la pelota)
        const aspect = camera.aspect || 1
        const halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z)
        const halfW = halfH * aspect
        let ox = mouse.x * halfW * 1.15
        if (Math.abs(ox) < 2.5) ox = (mouse.x < 0 ? -1 : 1) * 2.5  // asegurar que venga de un costado
        b.e = ox <= 0 ? 1 : -1
        b.sx = ox; b.sy = mouse.y * halfH * 1.05; b.sz = 2.2   // siempre delante de la paleta
        // Destino aleatorio en cualquier dirección (arriba, abajo, diagonales), fuera de cuadro
        const ang = Math.random() * Math.PI * 2
        // Velocidad de salida constante: rebota hacia adelante (no atraviesa la paleta) y vuela
        // en línea recta hasta salir de la pantalla. Algo más rápida si el golpe fue rápido.
        b.dx = Math.cos(ang); b.dy = Math.sin(ang); b.spd = 6 + (1 - speedK) * 4
        b.halfW = halfW; b.halfH = halfH
        // Punto de impacto: al azar en la zona central de la cara (en fracciones de la cara)
        b.u = (Math.random() - 0.5) * 0.6
        b.v = (Math.random() - 0.5) * 2
        // Cada 4–6 golpes, uno es "al revés" (giro). Si no, según hacia dónde sale la pelota
        // (sube→globo, baja→remate, clicks rápidos→volea) con algo de azar.
        hitsSinceFlip++
        const upOut = Math.sin(ang) > 0.45, downOut = Math.sin(ang) < -0.4
        let shotName
        if (hitsSinceFlip >= nextFlip) {
          shotName = 'reves'
          hitsSinceFlip = 0
          nextFlip = 4 + Math.floor(Math.random() * 3)
          dur = Math.max(dur, 1.15)   // el golpe al revés va más lento, para apreciar la vuelta
        } else {
          shotName = downOut ? 'remate' : upOut ? 'globo'
            : (speedK < 0.3 ? 'volea' : ['drive', 'volea', 'globo'][Math.floor(Math.random() * 3)])
        }
        b.shot = SHOTS[shotName]
        b.lado = shotName === 'reves' ? -1 : 1   // el revés pega con el dorso (llega con medio giro)
        clickShot = b.shot
        b.phase = 'in'; b.outT = 0
        b.active = true
        clickActive = true; clickT = 0; clickDur = dur; clickDir = b.e
      }
      const onDown = (e) => {
        const pp = progressRef?.current ?? 0
        if (pp > 0.2) return                           // solo en la escena 1 (arriba)
        if (e.target?.closest?.('a,button,input,select,textarea')) return
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1   // captura de dónde sale (también en touch)
        mouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
        launch()
      }
      window.addEventListener('pointerdown', onDown, { passive: true })

      let enPantalla = true
      const animate = () => {
        if (!enPantalla) { raf = 0; return }
        raf = requestAnimationFrame(animate)
        const now = performance.now()
        const t = (now - t0) / 1000
        const dt = Math.min(0.05, (now - last) / 1000); last = now
        const p = progressRef?.current ?? 0

        // Base: escena 1 (flota + mouse) → zoom al scrollear
        const mInf = reduce ? 0 : Math.max(0, 1 - p / 0.3)
        const targetY = mouse.x * 0.5 * mInf + p * 0.4
        // -mouse.y: si el cursor está arriba, la cara mira hacia arriba (antes estaba invertido)
        const targetX = -mouse.y * 0.33 * mInf + (reduce ? 0 : Math.sin(t * 0.6) * 0.02)
        baseY += (targetY - baseY) * 0.08
        baseX += (targetX - baseX) * 0.08
        const float = reduce ? 0 : Math.sin(t * 1.1) * 0.14 * (0.4 + 0.6 * mInf)

        // Remate one-shot: una vez que arranca, se completa solo (no queda a medias)
        if (hitState === 'idle' && !reduce && p >= TRIGGER) hitState = 'playing'
        if (hitState === 'playing') { hitT += dt / HIT_DUR; if (hitT >= 1) { hitT = 1; hitState = 'done' } }
        if (hitState === 'done' && p < RESET) { hitState = 'idle'; hitT = 0 }
        if (hitState === 'idle') hitT = 0

        // Base de la paleta (sin trasladar el mango): giro por scroll + flote de escena 1
        paleta.rotation.y = baseY
        paleta.rotation.x = baseX
        paleta.position.y = float - MODEL_DROP
        // Factor para pantallas angostas (mobile portrait): cámara/arco/pelota más contenidos
        const sc = Math.min(1, (camera.aspect || 1) / 0.78)
        // El canvas ahora ocupa toda la pantalla. Escalamos la cámara con el alto para que la
        // paleta conserve EL MISMO tamaño que tenía antes: la referencia es el alto que tenía el
        // canvas viejo (80vh con tope de 720px), no un valor fijo.
        const chNow = mount.clientHeight || 720
        const hRatio = chNow / Math.min(0.8 * chNow, 720)
        camera.position.z = CAM_Z * hRatio * Math.max(1, 0.58 / (camera.aspect || 1)) - p * 2.0 * hRatio

        // Swing tipo raqueta (pivote en el codo). Prioridad: remate por scroll; si no, click.
        if (clickActive) { clickT += dt / clickDur; if (clickT >= 1) clickActive = false }
        if (hitT > 0.001) setSwing(hitT, 1, sc, SHOTS.remate)          // remate por scroll (bandeja)
        else if (clickActive) setSwing(clickT, clickDir, sc, clickShot) // golpe por click (tipo variable)
        else setSwing(0, 1, sc)                                        // reposo

        // Al golpear, la cabeza de la paleta se sale del cuadro de la cámara. Alejamos la
        // cámara SOLO durante el swing (no toca la animación) para que el golpe entre entero;
        // en reposo la cámara vuelve sola a su lugar, así el encuadre normal no cambia.
        if (swing) {
          const swingExt = Math.min(1, Math.abs(swing.rotation.z) / 1.5)
          camPull += (swingExt - camPull) * 0.15
          camera.position.z += camPull * 3.6 * hRatio
        }
        // La sombra se atenúa durante el golpe (cuando la cámara se aleja) para que no se note
        // su recorte contra el borde del piso.
        shadowPlane.material.opacity = 0.16 * (1 - Math.min(1, camPull) * 0.6)

        paleta.updateMatrixWorld(true)

        // Pelota del remate por scroll: entra desde arriba a la izquierda (delante de la paleta),
        // llega a la cara justo en el impacto y sale a la derecha
        if (cara && hitT > 0.001 && hitT < 0.999) {
          ball.visible = true
          if (hitT < IMPACTO) {
            remate.fase = 'in'
            vDesde.set(-9 * sc, 4.2, 2.5)
            ball.position.copy(vDesde).lerp(contacto(remate, vDesde), hitT / IMPACTO)
            empujar(ball.position, remate.lado)
          } else {
            if (remate.fase === 'in') { contacto(remate, ball.position); salir(remate, 1, 0.25, 9) }
            remate.fase = 'out'
            remate.px += remate.vx * dt; remate.py += remate.vy * dt; remate.pz += remate.vz * dt
            ball.position.set(remate.px, remate.py, remate.pz)
            if (empujar(ball.position, remate.lado)) { remate.px = ball.position.x; remate.py = ball.position.y; remate.pz = ball.position.z }
          }
          const pop = 1 + 0.4 * smoothstep(IMPACTO - 0.05, IMPACTO, hitT) * (1 - smoothstep(IMPACTO, IMPACTO + 0.06, hitT))
          ball.scale.set(pop, 2 - pop, pop)
          ball.rotation.x += 0.4; ball.rotation.y += 0.25
        } else {
          ball.visible = false; remate.fase = 'in'
        }

        // Pelotas interactivas (click): salen desde el mouse → contacto → la paleta las manda a otro lado
        for (const b of pool) {
          if (!b.active) continue
          b.mesh.visible = true
          if (b.phase === 'in') {
            // Llegada: del punto donde clickeaste/tocaste a la cara, atada al golpe: llega cuando
            // el swing está en IMPACTO (antes tenía su propio reloj y se desfasaba)
            if (!cara) { b.active = false; b.mesh.visible = false; continue }
            vDesde.set(b.sx, b.sy, b.sz)
            const k = Math.min(1, clickActive ? clickT / IMPACTO : 1)
            b.mesh.position.copy(vDesde).lerp(contacto(b, vDesde), k)
            empujar(b.mesh.position, b.lado)
            const pop = 1 + 0.4 * smoothstep(0.82, 1, k)   // squash al impactar
            b.mesh.scale.set(pop, 2 - pop, pop)
            if (k >= 1) salir(b, b.dx, b.dy, b.spd)
          } else {
            // Salida: velocidad constante en línea recta hasta salir de la pantalla
            b.outT += dt
            b.px += b.vx * dt; b.py += b.vy * dt; b.pz += b.vz * dt
            b.mesh.position.set(b.px, b.py, b.pz)
            if (empujar(b.mesh.position, b.lado)) { b.px = b.mesh.position.x; b.py = b.mesh.position.y; b.pz = b.mesh.position.z }
            const pop = 1 + 0.3 * Math.max(0, 1 - b.outT / 0.09)  // pop breve al salir
            b.mesh.scale.set(pop, 2 - pop, pop)
            if (Math.abs(b.px) > b.halfW * 1.3 || Math.abs(b.py) > b.halfH * 1.3 || b.pz > camera.position.z - 2 || b.outT > 3) {
              b.active = false; b.mesh.visible = false
            }
          }
          b.mesh.rotation.x += 0.4; b.mesh.rotation.y += 0.25
        }

        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }
      animate()

      // Cuando el hero sale de pantalla (bajando a los catálogos o al FAQ) se deja
      // de dibujar; antes seguía a 60 cuadros por segundo sin que nadie lo viera.
      // Al volver retoma donde estaba (el remate a medias se completa).
      const io = new IntersectionObserver(([e]) => {
        enPantalla = e.isIntersecting
        if (enPantalla && !raf) { last = performance.now(); animate() }
      })
      io.observe(mount)

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        io.disconnect()
        window.removeEventListener('pointermove', onPointer)
        window.removeEventListener('pointerdown', onDown)
        pool.forEach(b => scene.remove(b.mesh))
        shadowPlane.geometry.dispose(); shadowPlane.material.dispose()
        ballGeo.dispose(); ballMat.dispose()
        if (model) model.traverse(o => {
          if (o.isMesh) {
            o.geometry?.dispose()
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            mats.forEach(m => {
              m?.map?.dispose?.(); m?.normalMap?.dispose?.()
              m?.aoMap?.dispose?.(); m?.roughnessMap?.dispose?.(); m?.dispose?.()
            })
          }
        })
        pmrem.dispose(); scene.environment?.dispose?.()
        renderer.dispose()
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      }
    }).catch(err => console.error('Error cargando three:', err))

    return () => { disposed = true; cleanup() }
  }, [progressRef])

  return <div ref={mountRef} className="w-full h-full" aria-hidden="true" />
}
