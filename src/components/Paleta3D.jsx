'use client'

import { useEffect, useRef } from 'react'

/**
 * Paleta3D — carga el modelo 3D escaneado real (fotogrametría) de la paleta
 * SARO MASTER Carbono 12K (public/models/paleta.glb) y lo hace girar según el
 * progreso de scroll (progressRef) + spin idle suave.
 *
 * El .glb trae malla + texturas PBR (color, normal, AO, metal/rough) del escaneo.
 * Acá se recentra, se escala y se orienta para el hero.
 */

// Ajustes de encuadre (tuneables tras ver el modelo)
const TARGET_HEIGHT = 5.2   // alto deseado en unidades de escena
const ROT_X = 0             // corrección de inclinación inicial
const ROT_Y = 0             // corrección de giro inicial
const ROT_Z = 0
const MODEL_DROP = 0.7      // baja la paleta un poco para que no tape el título
const HIT_Y = 0.6          // altura de impacto de la pelota: centro de la cara (bajó al bajar el modelo)

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
      const W = () => mount.clientWidth || 1
      const H = () => mount.clientHeight || 1

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(W(), H())
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.0
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
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.camera.near = 1
      key.shadow.camera.far = 30
      Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12 })
      key.shadow.bias = -0.0004
      key.shadow.radius = 4
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xdfeaff, 0.5)
      fill.position.set(-6, 2, 4)
      scene.add(fill)

      // Grupo exterior que gira; el modelo se cuelga adentro ya centrado
      const paleta = new THREE.Group()
      scene.add(paleta)

      const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 18),
        new THREE.ShadowMaterial({ opacity: 0.22 })
      )
      shadowPlane.rotation.x = -Math.PI / 2
      shadowPlane.position.y = -3.8   // más abajo: acompaña la bajada del modelo, evita que la paleta flotando la toque
      shadowPlane.receiveShadow = true
      scene.add(shadowPlane)

      // Pelota de padel/tenis (para el remate al final del scroll)
      const ballGeo = new THREE.SphereGeometry(0.42, 28, 28)
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
      const HALF = TARGET_HEIGHT / 2
      const ELBOW = 1.4  // el pivote baja por debajo del mango (como el codo)
      const loader = new GLTFLoader()
      loader.setMeshoptDecoder(MeshoptDecoder)
      loader.load('/models/paleta-opt.glb', (gltf) => {
        if (disposed) return
        model = gltf.scene
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
      let clickT = 0, clickActive = false, clickDur = 0.7, clickDir = 1, clickShot
      let lastLaunch = -999
      // e = lado de entrada de la pelota (+1 = viene por la izquierda, -1 = por la derecha)
      // Tipos de golpe: cambian la amplitud del swing lateral (zAmp), un sesgo en X
      // (arriba/abajo, para insinuar remate vs globo) y cuánto gira la cara (yAmp).
      const SHOTS = {
        drive:  { zAmp: 1.0,  xBias:  0.0,  yAmp: -0.95 },  // derecha plana: swing largo lateral
        volea:  { zAmp: 0.52, xBias:  0.18, yAmp: -0.45 },  // volea: corta y firme
        globo:  { zAmp: 0.6,  xBias: -0.32, yAmp: -0.5  },  // globo: cuchareo suave hacia arriba
        remate: { zAmp: 0.72, xBias:  0.34, yAmp: -0.32 },  // remate/bandeja: de arriba hacia abajo
      }
      const setSwing = (prog, e, sc, shot = SHOTS.drive) => {
        if (!swing) return
        const w = smoothstep(0, 0.35, prog), s = smoothstep(0.35, 0.6, prog), r = smoothstep(0.6, 1, prog)
        const hitEnv = s * (1 - r)   // pico alrededor del impacto
        // windup hacia el lado de entrada, golpe hacia el lado opuesto (salida)
        swing.rotation.z = (0.55 * w - 1.5 * s + 0.95 * r) * e * sc * shot.zAmp
        swing.rotation.x = -0.3 * w * (1 - s) + shot.xBias * (0.35 * w + hitEnv)
        // la cara mira hacia la pelota (lado de entrada), un poco más marcado
        swing.rotation.y = shot.yAmp * e * smoothstep(0, 0.3, prog) * (1 - smoothstep(0.62, 1, prog))
      }
      const MIN_GAP = 0.45  // tiempo mínimo entre pelota y pelota (seg)
      const launch = () => {
        if (!swing || reduce) return
        const nowS = performance.now() / 1000
        if (nowS - lastLaunch < MIN_GAP) return        // throttle: no se acumulan
        const b = pool.find(x => !x.active)
        if (!b) return
        const interval = Math.min(2.5, nowS - lastLaunch)
        const speedK = smoothstep(MIN_GAP, 2.0, interval) // 0 rápido → 1 lento
        const dur = 0.34 + speedK * 0.66               // 0.34s (rápido) .. 1.0s (lento)
        lastLaunch = nowS
        // Origen desde donde está el mouse (el usuario elige de dónde sale la pelota)
        const aspect = camera.aspect || 1
        const halfH = Math.tan((camera.fov * Math.PI / 180) / 2) * Math.abs(camera.position.z)
        const halfW = halfH * aspect
        let ox = mouse.x * halfW * 1.15
        if (Math.abs(ox) < 2.5) ox = (mouse.x < 0 ? -1 : 1) * 2.5  // asegurar que venga de un costado
        b.e = ox <= 0 ? 1 : -1
        b.sx = ox; b.sy = mouse.y * halfH * 1.05; b.sz = 1.0
        // Destino aleatorio en cualquier dirección (arriba, abajo, diagonales), fuera de cuadro
        const ang = Math.random() * Math.PI * 2
        const rad = 1.3 + Math.random() * 0.5
        b.ex = Math.cos(ang) * halfW * rad
        b.ey = Math.sin(ang) * halfH * rad
        b.ez = -1.5 - Math.random() * 2.5
        // Punto de impacto: aleatorio dentro de la zona central de la cara de la paleta
        b.cx = (Math.random() - 0.5) * 1.4
        b.cy = HIT_Y + (Math.random() - 0.5) * 1.1
        b.cz = 0.8
        // Tipo de golpe según hacia dónde sale la pelota (con algo de azar): sube→globo,
        // baja→remate, clicks rápidos→volea, si no drive/volea/globo al azar.
        const upOut = b.ey > halfH * 0.55, downOut = b.ey < -halfH * 0.4
        const shotName = downOut ? 'remate' : upOut ? 'globo'
          : (speedK < 0.3 ? 'volea' : ['drive', 'volea', 'globo'][Math.floor(Math.random() * 3)])
        b.shot = SHOTS[shotName]
        clickShot = b.shot
        b.active = true; b.t = 0; b.dur = dur
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

      const animate = () => {
        raf = requestAnimationFrame(animate)
        const now = performance.now()
        const t = (now - t0) / 1000
        const dt = Math.min(0.05, (now - last) / 1000); last = now
        const p = progressRef?.current ?? 0

        // Base: escena 1 (flota + mouse) → zoom al scrollear
        const mInf = reduce ? 0 : Math.max(0, 1 - p / 0.3)
        const targetY = mouse.x * 0.5 * mInf + p * 0.4
        const targetX = mouse.y * 0.33 * mInf + (reduce ? 0 : Math.sin(t * 0.6) * 0.02)
        baseY += (targetY - baseY) * 0.08
        baseX += (targetX - baseX) * 0.08
        const float = reduce ? 0 : Math.sin(t * 1.1) * 0.22 * (0.4 + 0.6 * mInf)

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
        camera.position.z = CAM_Z * Math.max(1, 0.78 / (camera.aspect || 1)) - p * 2.0

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
          camera.position.z += camPull * 3.6
        }
        // La sombra se atenúa durante el golpe (cuando la cámara se aleja) para que no se note
        // su recorte contra el borde del piso.
        shadowPlane.material.opacity = 0.22 * (1 - Math.min(1, camPull) * 0.6)

        // Pelota del remate por scroll: entra desde izq-arriba → contacto → sale a la derecha
        if (hitT > 0.001 && hitT < 0.999) {
          ball.visible = true
          const cT = 0.47
          if (hitT < cT) {
            const k = hitT / cT
            ball.position.set(-9 * sc * (1 - k), 4.2 - (4.2 - HIT_Y) * k, -2.5 + 3.3 * k)  // → (0, HIT_Y, 0.8)
          } else {
            const k = (hitT - cT) / (1 - cT)
            ball.position.set(10.5 * sc * k, HIT_Y + 1.4 * k, 0.8 - 3.3 * k)        // sale a la derecha
          }
          const pop = 1 + 0.4 * smoothstep(cT - 0.05, cT, hitT) * (1 - smoothstep(cT, cT + 0.06, hitT))
          ball.scale.set(pop, 2 - pop, pop)
          ball.rotation.x += 0.4; ball.rotation.y += 0.25
        } else {
          ball.visible = false
        }

        // Pelotas interactivas (click): salen desde el mouse → contacto → la paleta las manda a otro lado
        for (const b of pool) {
          if (!b.active) continue
          b.t += dt / b.dur
          if (b.t >= 1) { b.active = false; b.mesh.visible = false; continue }
          b.mesh.visible = true
          const cT = 0.47
          if (b.t < cT) {
            const k = b.t / cT
            b.mesh.position.set(b.sx + (b.cx - b.sx) * k, b.sy + (b.cy - b.sy) * k, b.sz + (b.cz - b.sz) * k)
          } else {
            const k = (b.t - cT) / (1 - cT)
            b.mesh.position.set(b.cx + (b.ex - b.cx) * k, b.cy + (b.ey - b.cy) * k, b.cz + (b.ez - b.cz) * k)
          }
          const pop = 1 + 0.4 * smoothstep(cT - 0.05, cT, b.t) * (1 - smoothstep(cT, cT + 0.06, b.t))
          b.mesh.scale.set(pop, 2 - pop, pop)
          b.mesh.rotation.x += 0.4; b.mesh.rotation.y += 0.25
        }

        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
      }
      animate()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
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
