// Primer paso del workflow render-video.yml: revisa el pedido con las MISMAS
// reglas que la API (src/videos/catalogo.js) y deja las props en props.json.
// Las entradas llegan por variables de entorno, nunca pegadas en el script.
import { writeFileSync } from 'node:fs'
import { REQUEST_ID_VALIDO, plantillaMeta, problemaDelPedido, videosDelPedido } from '../../src/videos/catalogo.js'

const { PLANTILLA, PROPS, REQUEST_ID } = process.env
const fallar = motivo => {
  console.error(`Pedido inválido: ${motivo}`)
  process.exit(1)
}

if (!REQUEST_ID_VALIDO.test(REQUEST_ID ?? '')) fallar(`request_id "${REQUEST_ID}"`)
let props
try {
  props = JSON.parse(PROPS ?? '')
} catch {
  fallar('las props no son JSON')
}
const problema = problemaDelPedido(plantillaMeta(PLANTILLA), props)
if (problema) fallar(problema)

writeFileSync('props.json', JSON.stringify(props))
const videos = videosDelPedido(props)
console.log(`${PLANTILLA}: ${videos.length} video(s)`)
for (const v of videos) {
  console.log(`- ${v.formato ?? 'formato de fábrica'}, efectos ${v.efectos ?? 'de fábrica'}: ${v.productos.map(p => p.nombre).join(', ')}`)
}
