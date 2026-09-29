// Mide el pico de audio de un MP4 (paso "Revisar audio" del workflow).
// Usa el ffmpeg que trae Remotion: el runner de GitHub no tiene ffmpeg instalado,
// y el de Remotion sólo sabe escribir WAV (no audio crudo).
// Uso: node scripts/videos/revisar-audio.mjs out/video.mp4
import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const archivo = process.argv[2]
const wav = join(tmpdir(), `audio-${Date.now()}.wav`)
execFileSync(process.execPath, ['node_modules/@remotion/cli/remotion-cli.js', 'ffmpeg', '-v', 'error', '-y', '-i', archivo, '-vn', '-acodec', 'pcm_s16le', wav], {
  stdio: 'inherit',
})
const datos = readFileSync(wav)
rmSync(wav)

// El audio arranca después del bloque "data" del encabezado WAV
const inicio = datos.indexOf('data') + 8
let pico = 0
for (let i = inicio; i + 1 < datos.length; i += 2) pico = Math.max(pico, Math.abs(datos.readInt16LE(i)) / 32768)
const db = 20 * Math.log10(Math.max(pico, 1e-9))
console.log(`Pico de audio: ${pico.toFixed(3)} (${db.toFixed(1)} dBFS) ${pico < 0.95 ? '— sin saturar' : '— SATURA'}`)
