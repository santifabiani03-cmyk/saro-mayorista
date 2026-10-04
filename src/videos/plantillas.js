import { PLANTILLAS_META } from './catalogo'
import { Coleccion, duracionColeccion } from './Coleccion'
import { Comparativa, duracionComparativa } from './Comparativa'
import { Ficha, duracionFicha } from './Ficha'
import { Revendedores, duracionRevendedores } from './Revendedores'
import { Ritmo, duracionRitmo } from './Ritmo'
import { Web, duracionWeb } from './Web'

// Componente y duración (en cuadros, según las props) de cada plantilla.
// Los datos de cada una (formatos, cuántos productos, música) están en catalogo.js.
const COMPONENTES = {
  SaroColeccion: { componente: Coleccion, duracion: duracionColeccion },
  SaroFicha: { componente: Ficha, duracion: duracionFicha },
  SaroRitmo: { componente: Ritmo, duracion: duracionRitmo },
  SaroComparativa: { componente: Comparativa, duracion: duracionComparativa },
  SaroRevendedores: { componente: Revendedores, duracion: duracionRevendedores },
  SaroWeb: { componente: Web, duracion: duracionWeb },
}

export const PLANTILLAS = PLANTILLAS_META.map(meta => ({ ...meta, ...COMPONENTES[meta.id] }))

export const plantillaPorId = id => PLANTILLAS.find(p => p.id === id) ?? null
