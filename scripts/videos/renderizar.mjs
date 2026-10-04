// Paso "Renderizar video" del workflow render-video.yml. Lee props.json (lo
// deja validar-pedido.mjs) y renderiza un MP4 por video del pedido:
//   - un video suelto  -> out/<REQUEST_ID>.mp4
//   - un lote de fichas -> out/<REQUEST_ID>-1.mp4, -2.mp4…
// El bundle de webpack queda en caché entre uno y otro: los siguientes arrancan rápido.
// Uso: PLANTILLA=SaroFicha REQUEST_ID=… node scripts/videos/renderizar.mjs [--gl=swangle]
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { videosDelPedido } from '../../src/videos/catalogo.js'

const { PLANTILLA, REQUEST_ID } = process.env
const extra = process.argv.slice(2)
const videos = videosDelPedido(JSON.parse(readFileSync('props.json', 'utf8')))

execFileSync(process.execPath, ['scripts/videos/preparar-public.mjs'], { stdio: 'inherit' })
mkdirSync('out', { recursive: true })

videos.forEach((props, i) => {
  const nombre = videos.length === 1 ? REQUEST_ID : `${REQUEST_ID}-${i + 1}`
  const archivoProps = `props-${i + 1}.json`
  writeFileSync(archivoProps, JSON.stringify(props))
  console.log(`\n▶ Video ${i + 1} de ${videos.length}: ${props.productos.map(p => p.nombre).join(', ')}`)
  execFileSync(
    process.execPath,
    ['node_modules/@remotion/cli/remotion-cli.js', 'render', PLANTILLA, `out/${nombre}.mp4`, `--props=${archivoProps}`, ...extra],
    { stdio: 'inherit' },
  )
})
