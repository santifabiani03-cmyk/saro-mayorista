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
      {/* Precarga de lo que se ve en el primer cuadro: empieza a bajar apenas
          llega la página, en paralelo con el código, en vez de esperar a que
          arranque la escena. Los árboles y el farol sólo se ven en pantallas
          horizontales; en el celular se piden después (ver "Carga por partes"
          en ScrollLab). La imagen de portada no necesita precarga: ya está en
          el HTML con prioridad alta. */}
      <link rel="preload" href="/models/paleta-lab.glb" as="fetch" crossOrigin="anonymous" />
      <link rel="preload" href="/models/arbol-lod.glb" as="fetch" crossOrigin="anonymous" media="(orientation: landscape)" />
      <link rel="preload" href="/models/farola-lod.glb" as="fetch" crossOrigin="anonymous" media="(orientation: landscape)" />
      <ScrollLab whatsappNumber={config.whatsappNumber} />
    </>
  )
}
