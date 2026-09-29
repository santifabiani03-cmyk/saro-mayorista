// Arma .remotion-public/ con sólo lo que usan los videos, en las MISMAS rutas
// que en public/ (así staticFile() apunta a lo mismo en el admin y en el render).
// Lo corren `npm run videos:studio`, `npm run videos:render` y el workflow.
import { cpSync, mkdirSync, rmSync } from 'node:fs'

const DESTINO = '.remotion-public'
const ARCHIVOS = ['videos', 'models/paleta-opt.glb', 'assets/logo.png']

rmSync(DESTINO, { recursive: true, force: true })
for (const ruta of ARCHIVOS) {
  mkdirSync(`${DESTINO}/${ruta.split('/').slice(0, -1).join('/')}`, { recursive: true })
  cpSync(`public/${ruta}`, `${DESTINO}/${ruta}`, { recursive: true })
}
