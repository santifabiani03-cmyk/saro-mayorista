import { COLOR_LOGO, LOGO_ICONO, LOGO_HORIZONTAL } from './logoSaro'

// Cada pieza del logo (la S, la R, cada letra de SARO, los huecos) es un
// subpath que arranca con "M". El trazo va una línea por pieza: si fuera un
// solo path, el navegador reinicia el punteado en cada pieza y el contorno
// aparece entero de golpe en vez de dibujarse.
const piezas = d => d.split(/(?=M)/)

const LOGOS = {
  icono: { ...LOGO_ICONO, piezas: piezas(LOGO_ICONO.d) },
  horizontal: { ...LOGO_HORIZONTAL, piezas: piezas(LOGO_HORIZONTAL.d) },
}

/**
 * Logo de SARO en vector, animado con un trazo fino (estilo "hairline").
 *
 * modo='carga'  → el contorno se dibuja, se rellena y vuelve a empezar
 *                 (mientras baja la paleta 3D del hero).
 * modo='repaso' → el logo se ve lleno; al pasar el mouse por el contenedor
 *                 `.group` un trazo lo recorre una vez (header).
 *
 * `grosor` va en unidades del viewBox (icono 500 de ancho, horizontal 1200):
 * hay que elegirlo según el tamaño en pantalla para que el trazo mida ~1,5 px.
 * La animación vive en globals.css (sección "Logo con trazo").
 */
export default function LogoTrazo({ variante = 'icono', modo = 'repaso', grosor = 4, className = '' }) {
  const logo = LOGOS[variante]
  return (
    <svg viewBox={logo.viewBox} className={`logo-trazo logo-${modo} ${className}`} aria-hidden="true">
      <path className="logo-relleno" d={logo.d} fillRule="evenodd" fill={COLOR_LOGO} />
      {logo.piezas.map((d, i) => (
        <path key={i} className="logo-linea" d={d} pathLength="1" fill="none" strokeWidth={grosor} style={{ '--i': i }} />
      ))}
    </svg>
  )
}
