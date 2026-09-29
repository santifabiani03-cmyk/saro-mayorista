import { useEffect, useMemo, useState } from 'react'
import { ThreeCanvas } from '@remotion/three'
import { useThree } from '@react-three/fiber'
import { cancelRender, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// El mismo modelo del hero de saro.com.ar (public/models/paleta-opt.glb).
// Viene comprimido con meshopt, por eso el decoder.

const ALTO = 5.2 // mismo TARGET_HEIGHT que components/Paleta3D.jsx

const Iluminacion = () => {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    return () => pmrem.dispose()
  }, [gl, scene])
  return (
    <>
      <directionalLight position={[4, 6, 8]} intensity={1.6} />
      <directionalLight position={[-6, 2, -4]} intensity={2.2} color="#60A5FA" />
      <ambientLight intensity={0.25} />
    </>
  )
}

const Modelo = ({ giro, inclinacion }) => {
  const [gltf, setGltf] = useState(null)
  const [handle] = useState(() => delayRender('Cargando paleta-opt.glb'))

  useEffect(() => {
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    loader.load(staticFile('models/paleta-opt.glb'), g => setGltf(g), undefined, err => cancelRender(err))
  }, [handle])

  // Centrar y escalar una sola vez
  const ajuste = useMemo(() => {
    if (!gltf) return null
    const caja = new THREE.Box3().setFromObject(gltf.scene)
    const tam = new THREE.Vector3()
    const centro = new THREE.Vector3()
    caja.getSize(tam)
    caja.getCenter(centro)
    gltf.scene.traverse(o => {
      if (o.isMesh && o.material) o.material.envMapIntensity = 1.1
    })
    return { escala: ALTO / tam.y, centro }
  }, [gltf])

  // ThreeCanvas no tiene loop propio: sólo dibuja cuando cambia el cuadro.
  // Cuando la paleta ya está montada se dibuja a mano y recién ahí se libera
  // el render; si no, Remotion captura el canvas sin la paleta.
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    if (!ajuste) return
    requestAnimationFrame(() => {
      gl.render(scene, camera)
      continueRender(handle)
    })
  }, [ajuste, gl, scene, camera, handle])

  if (!gltf || !ajuste) return null
  return (
    <group rotation={[inclinacion, giro, 0]}>
      <group scale={ajuste.escala}>
        <primitive object={gltf.scene} position={[-ajuste.centro.x, -ajuste.centro.y, -ajuste.centro.z]} />
      </group>
    </group>
  )
}

/** Paleta 3D girando. `giro` en radianes (lo maneja el que la usa, cuadro a cuadro). */
export const Paleta3D = ({ width, height, giro, inclinacion = -0.12, distancia = 11 }) => {
  // useCurrentFrame asegura que el canvas se vuelva a dibujar en cada cuadro
  useCurrentFrame()
  return (
    <ThreeCanvas
      width={width}
      height={height}
      camera={{ fov: 34, position: [0, 0, distancia] }}
      gl={{ antialias: true, alpha: true }}
    >
      <Iluminacion />
      <Modelo giro={giro} inclinacion={inclinacion} />
    </ThreeCanvas>
  )
}
