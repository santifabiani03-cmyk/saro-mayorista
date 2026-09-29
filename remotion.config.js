// Configuración del CLI de Remotion (videos del admin, ver CLAUDE.md §8).
// El bundle de Remotion NO usa Tailwind: las plantillas llevan estilos en línea.
import { Config } from '@remotion/cli/config'

Config.setEntryPoint('src/videos/remotion/index.jsx')
// Carpeta pública mínima (videos, logo y el modelo 3D), la arma
// scripts/videos/preparar-public.mjs. La carpeta public/ entera pesa cientos de
// MB y Remotion la copia en cada render.
Config.setPublicDir('.remotion-public')
Config.setVideoImageFormat('jpeg')
Config.setOverwriteOutput(true)
// El repo es "type": "module" y webpack exigiría la extensión en cada import
// ('./comun.jsx'). Next no la pide: se relaja para que el mismo código sirva a los dos.
Config.overrideWebpackConfig(config => ({
  ...config,
  module: {
    ...config.module,
    rules: [...(config.module?.rules ?? []), { test: /\.m?jsx?$/, resolve: { fullySpecified: false } }],
  },
}))
