'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const Paleta3D = dynamic(() => import('./Paleta3D'), { ssr: false })

// Curvas de aparición/desaparición de cada bloque de texto según el progreso.
// Devuelven opacidad (0..1) y desplazamiento vertical en px.

// Aparece y desaparece (bloque intermedio)
function stage(p, start, peak, end) {
  if (p <= start || p >= end) return { opacity: 0, y: p <= start ? 30 : -24 }
  if (p < peak) {
    const t = (p - start) / (peak - start)
    return { opacity: t, y: 30 * (1 - t) }
  }
  const t = (p - peak) / (end - peak)
  return { opacity: 1 - t, y: -24 * t }
}

// Visible desde el inicio, se desvanece al bajar (primer bloque)
function holdStage(p, holdEnd, fadeEnd) {
  if (p <= holdEnd) return { opacity: 1, y: 0 }
  if (p >= fadeEnd) return { opacity: 0, y: -24 }
  const t = (p - holdEnd) / (fadeEnd - holdEnd)
  return { opacity: 1 - t, y: -24 * t }
}

// Aparece y queda fijo hasta el final (último bloque + CTA)
function riseStage(p, start, peak) {
  if (p <= start) return { opacity: 0, y: 30 }
  if (p >= peak) return { opacity: 1, y: 0 }
  const t = (p - start) / (peak - start)
  return { opacity: t, y: 30 * (1 - t) }
}

export default function IntroHero({ productCount = 0, onExplore }) {
  const [paletaReady, setPaletaReady] = useState(false)
  const sectionRef = useRef(null)
  const stageRef   = useRef(null)
  const progressRef = useRef(0)
  const glowRef    = useRef(null)
  const t1Ref      = useRef(null)
  const t2Ref      = useRef(null)
  const t3Ref      = useRef(null)
  const cueRef     = useRef(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    let raf = 0
    const update = () => {
      raf = 0
      const section = sectionRef.current
      if (!section) return
      const vh = window.innerHeight
      const rect = section.getBoundingClientRect()
      const total = section.offsetHeight - vh
      // progreso 0..1 a lo largo de la sección
      const p = Math.min(1, Math.max(0, -rect.top / (total || 1)))
      progressRef.current = p

      // Glow sigue sutilmente el scroll
      if (glowRef.current) {
        glowRef.current.style.transform = `translateY(${p * 60}px) scale(${1 + p * 0.15})`
      }

      const apply = (ref, s) => {
        if (!ref.current) return
        ref.current.style.opacity = String(s.opacity)
        ref.current.style.transform = `translateY(${s.y}px)`
      }
      apply(t1Ref, holdStage(p, 0.12, 0.30))
      apply(t2Ref, stage(p, 0.34, 0.46, 0.64))
      apply(t3Ref, riseStage(p, 0.68, 0.85))

      if (cueRef.current) {
        cueRef.current.style.opacity = String(Math.max(0, 1 - p * 8))
      }
    }

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const particles = [
    { l: '12%', d: '9s',  delay: '0s',   s: 6 },
    { l: '28%', d: '12s', delay: '2s',   s: 4 },
    { l: '44%', d: '10s', delay: '4s',   s: 5 },
    { l: '63%', d: '13s', delay: '1s',   s: 4 },
    { l: '78%', d: '11s', delay: '3s',   s: 6 },
    { l: '90%', d: '14s', delay: '5s',   s: 3 },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative h-[320vh] md:h-[340vh] bg-gradient-to-b from-white via-[#f4f7fb] to-[#eef2f8]"
      aria-label="Presentación SARO"
    >
      {/* Escenario fijo */}
      <div
        ref={stageRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ perspective: '1400px' }}
      >
        {/* Fondo: cancha de pádel + velo blanco (legibilidad del texto y que la paleta siga siendo protagonista) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Image
            src="/assets/fondo-cancha.webp"
            alt=""
            fill
            priority
            quality={90}
            sizes="100vw"
            className="object-cover scale-105"
          />
          {/* Velo solo en esquinas/bordes (viñeta): el centro queda nítido */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 115% at 50% 42%, transparent 42%, rgba(255,255,255,.5) 76%, rgba(255,255,255,.92) 100%)' }}
          />
          {/* Fade del borde inferior para que se lea el texto/CTA */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(255,255,255,.92) 0%, rgba(255,255,255,.45) 20%, transparent 46%)' }}
          />
          {/* Velo concentrado en las esquinas superiores (logo izq / botones der), no en el centro */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(46% 40% at 0% 0%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.35) 48%, transparent 74%), radial-gradient(56% 42% at 100% 0%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.35) 48%, transparent 74%)' }}
          />
        </div>

        {/* Glows ambientales */}
        <div ref={glowRef} className="absolute inset-0 pointer-events-none">
          <div className="intro-glow absolute top-[8%] left-1/2 -translate-x-1/2 w-[70vw] h-[70vw] max-w-[720px] max-h-[720px] rounded-full bg-saro-blue/20 blur-[120px]" />
          <div className="intro-glow2 absolute bottom-[2%] right-[6%] w-[46vw] h-[46vw] max-w-[440px] max-h-[440px] rounded-full bg-saro-accent/15 blur-[110px]" />
        </div>

        {/* Líneas de cancha muy sutiles */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[.04] pointer-events-none"
          viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
        >
          <rect x="80" y="60" width="640" height="380" fill="none" stroke="#0F172A" strokeWidth="2" />
          <line x1="400" y1="60" x2="400" y2="440" stroke="#0F172A" strokeWidth="2" />
          <line x1="80" y1="250" x2="720" y2="250" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="7 10" />
        </svg>

        {/* Partículas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((pt, i) => (
            <span
              key={i}
              className="intro-particle absolute bottom-[20%] rounded-full bg-saro-blue/30"
              style={{
                left: pt.l,
                width: pt.s, height: pt.s,
                animationDuration: pt.d,
                animationDelay: pt.delay,
              }}
            />
          ))}
        </div>

        {/* Texto superior */}
        <div className="absolute inset-x-0 top-[13%] sm:top-[15%] px-6 text-center z-20">
          <div ref={t1Ref} className="will-change-[opacity,transform]">
            <p className="intro-rise intro-rise-1 text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-blue mb-3">
              Venta mayorista · Argentina
            </p>
            <p className="intro-rise intro-rise-2 text-4xl sm:text-6xl font-extrabold text-saro-dark leading-[1.05] tracking-tight max-w-4xl mx-auto">
              El padel arranca<br className="hidden sm:block" /> en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-saro-blue to-saro-mid">SARO</span>
            </p>
          </div>

          {/* Bloque 2 */}
          <div
            ref={t2Ref}
            className="absolute inset-x-0 top-0 px-6 opacity-0 will-change-[opacity,transform]"
          >
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-accent mb-3">
              Tecnología carbono
            </p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark leading-[1.08] tracking-tight max-w-3xl mx-auto">
              Paletas profesionales<br className="hidden sm:block" /> para todos los niveles
            </h2>
          </div>
        </div>

        {/* Paleta 3D real (Three.js) */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="intro-floaty relative w-full h-full">
            {/* Placeholder mientras baja/decodifica el modelo 3D */}
            <div
              className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-700 ${
                paletaReady ? 'opacity-0' : 'opacity-100'
              }`}
              aria-hidden="true"
            >
              <img
                src="/assets/logo-icon.png"
                alt=""
                className="h-14 sm:h-16 w-auto opacity-40 animate-pulse"
              />
            </div>
            <Paleta3D progressRef={progressRef} onReady={() => setPaletaReady(true)} />
          </div>
        </div>

        {/* Texto inferior + CTA (bloque 3) */}
        <div
          ref={t3Ref}
          className="absolute inset-x-0 bottom-[12%] sm:bottom-[14%] px-6 text-center z-20 opacity-0 will-change-[opacity,transform]"
        >
          <h2 className="text-2xl sm:text-4xl font-extrabold text-saro-dark leading-tight tracking-tight max-w-2xl mx-auto">
            {productCount > 0 ? `${productCount} productos` : 'Catálogo completo'} con precios mayoristas
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-3 max-w-lg mx-auto">
            Promos por cantidad, envíos a todo el país y la calidad SARO en cada pieza.
          </p>
          <button
            onClick={onExplore}
            className="mt-7 inline-flex items-center gap-2 bg-saro-dark hover:bg-saro-blue text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-saro-dark/20 transition-all duration-200 btn-press"
          >
            Ver catálogo
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>

        {/* Indicador de scroll + hint de juego */}
        <div
          ref={cueRef}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 text-slate-400"
        >
          <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-saro-blue mb-1">
            <span className="text-sm">🎾</span> Tocá la paleta para jugar
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Scrolleá</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 intro-bob">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  )
}
