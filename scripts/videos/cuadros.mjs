// Saca cuadros sueltos (PNG) de varias plantillas con UN solo bundle y UN solo
// navegador, con la guía de zona segura prendida. Sirve para revisar el diseño
// sin renderizar videos enteros. Los productos salen del catálogo en vivo.
//
// Uso: node scripts/videos/preparar-public.mjs
//      node scripts/videos/cuadros.mjs carpeta-salida '[["SaroColeccion","vertical",[8,140,-60]],["SaroFicha","feed",[0]]]'
// Un cuadro negativo cuenta desde el final (-60 = 2 s antes de terminar).
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition, openBrowser } from '@remotion/renderer'
import path from 'node:path'

const OUT = process.argv[2]
const pedidos = JSON.parse(process.argv[3])
const serveUrl = await bundle({
  entryPoint: path.resolve('src/videos/remotion/index.jsx'),
  publicDir: path.resolve('.remotion-public'),
  webpackOverride: c => ({ ...c, module: { ...c.module, rules: [...(c.module?.rules ?? []), { test: /\.m?jsx?$/, resolve: { fullySpecified: false } }] } }),
})
const browser = await openBrowser('chrome', { chromiumOptions: { gl: 'angle' } })
for (const [id, formato, cuadros] of pedidos) {
  const inputProps = { guia: true, formato }
  const comp = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, chromiumOptions: { gl: 'angle' } })
  console.log(id, formato, comp.width + 'x' + comp.height, comp.durationInFrames, 'cuadros')
  for (const f of cuadros) {
    const frame = f < 0 ? comp.durationInFrames + f : f
    await renderStill({ composition: comp, serveUrl, frame, output: `${OUT}/${id}-${formato}-${frame}.png`, inputProps: comp.props, scale: 0.4, puppeteerInstance: browser, chromiumOptions: { gl: 'angle' } })
  }
}
await browser.close({ silent: true })
