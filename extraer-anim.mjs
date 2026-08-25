// FBXLoader espera un entorno de navegador: se le dan los mínimos que usa
globalThis.window = globalThis
globalThis.self = globalThis
const elemento = () => ({
  style: {}, getContext: () => null, setAttribute(){}, appendChild(){},
  addEventListener(){}, removeEventListener(){}, remove(){},
  set src(_v) {}, get src() { return '' },
})
globalThis.document = { createElementNS: elemento, createElement: elemento }
globalThis.URL.createObjectURL = () => ''
globalThis.Image = function () { return elemento() }
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { readFileSync } from 'fs'


import { writeFileSync } from 'fs'
const loader = new FBXLoader()

// Extrae SOLO las pistas de rotación de cada animación de Mixamo. El resultado
// es un JSON de pocos KB que se aplica sobre el jugador ya optimizado, en vez de
// arrastrar otra malla de 10 MB. Se descartan las pistas de posición para que el
// jugador no se desplace: queremos que golpee plantado en su lugar.
const salida = {}
for (const nombre of ['Goalie Throw']) {
  const buf = readFileSync(`C:/Users/smfab/Downloads/${nombre}.fbx`)
  const obj = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '')
  const clip = obj.animations.reduce((a, b) => (b.duration > a.duration ? b : a))
  const tracks = clip.tracks
    .filter(t => t.name.endsWith('.quaternion'))
    .map(t => {
      const t2 = t.clone()
      t2.name = t.name.replace(/^mixamorig:?/i, '')   // nombres iguales a los del modelo
      return t2
    })
  const limpio = new THREE.AnimationClip(nombre, clip.duration, tracks)
  const clave = nombre.toLowerCase().replace(/ /g, '-')
  const j = THREE.AnimationClip.toJSON(limpio)
  // recortar decimales: a 4 cifras el movimiento es idéntico y el archivo cae a la mitad
  for (const tr of j.tracks) {
    tr.times = tr.times.map(v => +v.toFixed(4))
    tr.values = tr.values.map(v => +v.toFixed(4))
  }
  salida[clave] = j
  console.log(`${nombre}: ${tracks.length} huesos, ${clip.duration.toFixed(2)}s`)
}
const txt = JSON.stringify(salida)
writeFileSync('public/models/golpes.json', txt)

console.log('GUARDADO public/models/golpes.json', Math.round(txt.length / 1024), 'KB')