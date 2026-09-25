import fs from 'node:fs'
import path from 'node:path'
import ScrollLab from './ScrollLab'

// Maqueta interna para validar el guion del scroll antes de producir los assets 3D.
// No se indexa ni se enlaza desde el sitio.
export const metadata = {
  title: 'Lab · Maqueta de scroll',
  robots: { index: false, follow: false },
}

export default function LabScrollPage() {
  // El botón de WhatsApp del cierre usa el mismo número que el resto del sitio.
  const config = JSON.parse(fs.readFileSync(path.resolve('public/config.json'), 'utf-8'))
  return (
    <>
      {/* Precarga de los modelos más pesados: empiezan a bajar apenas llega la
          página, en paralelo con el código, en vez de esperar a que arranque la
          escena (la paleta sola pesa 1,3 MB). */}
      <link rel="preload" href="/models/paleta-opt.glb" as="fetch" crossOrigin="anonymous" />
      <link rel="preload" href="/models/arbol.glb" as="fetch" crossOrigin="anonymous" />
      <ScrollLab whatsappNumber={config.whatsappNumber} />
    </>
  )
}
