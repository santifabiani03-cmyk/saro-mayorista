'use client'

import { useEffect, useRef } from 'react'
import { COLOR_LOGO, LOGO_ICONO } from './logoSaro'

const COLA = [0, 0.012, 0.024] // separación de los puntos de la estela (fracción del contorno)
const lim = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x))

/**
 * Logo SR que se dibuja con el scroll: el contorno avanza a medida que la
 * sección sube por la pantalla, con un punto de luz y su estela en la punta
 * del trazo. Al completarse se rellena y "sella" una vez.
 *
 * Arranca cuando el centro del logo entra por abajo (95 % del alto de la
 * pantalla) y termina cuando llega al 50 %. Sólo escucha el scroll mientras
 * está a la vista, y escribe directo en el SVG (sin re-render de React).
 */
export default function LogoSello({ className = '' }) {
  const caja = useRef(null)
  const trazo = useRef(null)
  const cola = useRef([])

  useEffect(() => {
    const svg = caja.current
    const path = trazo.current
    if (!svg || !path) return

    const largo = path.getTotalLength()
    const dibujar = p => {
      path.style.strokeDashoffset = String(1 - p)
      path.style.fillOpacity = String(lim((p - 0.85) / 0.15))
      svg.classList.toggle('logo-sellado', p >= 1)
      cola.current.forEach((c, i) => {
        const q = p - COLA[i]
        const visible = p > 0.005 && p < 0.995 && q > 0
        c.style.opacity = visible ? String(1 - i * 0.35) : '0'
        if (!visible) return
        const { x, y } = path.getPointAtLength(q * largo)
        c.setAttribute('cx', x)
        c.setAttribute('cy', y)
      })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { dibujar(1); return }

    let raf = 0
    const medir = () => {
      raf = 0
      const r = svg.getBoundingClientRect()
      const vh = window.innerHeight
      const centro = r.top + r.height / 2
      dibujar(lim((vh * 0.95 - centro) / (vh * 0.45)))
    }
    const alScroll = () => { if (!raf) raf = requestAnimationFrame(medir) }

    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { window.addEventListener('scroll', alScroll, { passive: true }); medir() }
      else window.removeEventListener('scroll', alScroll)
    })
    io.observe(svg)
    medir()

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', alScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const { viewBox, d } = LOGO_ICONO
  return (
    <svg ref={caja} viewBox={viewBox} className={`logo-sello overflow-visible ${className}`} aria-hidden="true">
      <path
        ref={trazo}
        d={d}
        pathLength="1"
        fillRule="evenodd"
        fill={COLOR_LOGO}
        fillOpacity="0"
        stroke="#BFD5F7"
        strokeWidth="4.5"
        strokeDasharray="1"
        strokeDashoffset="1"
        strokeLinejoin="round"
      />
      {COLA.map((_, i) => (
        <circle
          key={i}
          ref={el => { cola.current[i] = el }}
          r={9 - i * 3}
          fill="#FFFFFF"
          opacity="0"
          className="logo-sello-punta"
        />
      ))}
    </svg>
  )
}
