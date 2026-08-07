'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import IntroHero from '../../components/IntroHero'
import FaqSection from '../../components/FaqSection'
import HistoriaTrabaja from '../../components/HistoriaTrabaja'

export default function Landing({ stats, whatsappNumber, minPurchase, mostrarCompraMinima }) {
  const router = useRouter()
  const rootRef = useRef(null)

  // El botón del hero 3D baja a la sección donde se elige el catálogo.
  const goToCatalog = () =>
    document.getElementById('catalogos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // Prefetch de los dos catálogos para que la transición sea instantánea.
  useEffect(() => {
    router.prefetch('/paletas')
    router.prefetch('/ropa-y-accesorios')
  }, [router])

  // Efectos de scroll (reveals + contadores + parallax) con IntersectionObserver nativo.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Reveals: cada [data-reveal] aparece al entrar en viewport.
    const revealEls = root.querySelectorAll('[data-reveal]')
    if (reduce) {
      revealEls.forEach(el => el.classList.add('in'))
    } else {
      const io = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io.unobserve(e.target)
            }
          })
        },
        { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
      )
      revealEls.forEach(el => io.observe(el))

      // Contadores: animan de 0 al valor de data-count al entrar en viewport.
      const counters = root.querySelectorAll('[data-count]')
      const cio = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (!e.isIntersecting) return
            const el = e.target
            cio.unobserve(el)
            const target = Number(el.dataset.count) || 0
            const dur = 1200
            const t0 = performance.now()
            const step = now => {
              const t = Math.min(1, (now - t0) / dur)
              const eased = 1 - Math.pow(1 - t, 3)
              el.textContent = Math.round(target * eased).toLocaleString('es-AR')
              if (t < 1) requestAnimationFrame(step)
            }
            requestAnimationFrame(step)
          })
        },
        { threshold: 0.6 }
      )
      counters.forEach(el => cio.observe(el))

      // Parallax sutil de los blobs decorativos [data-parallax].
      const blobs = root.querySelectorAll('[data-parallax]')
      let raf = 0
      const onScroll = () => {
        if (raf) return
        raf = requestAnimationFrame(() => {
          raf = 0
          blobs.forEach(el => {
            const rect = el.getBoundingClientRect()
            const factor = Number(el.dataset.parallax) || 0.1
            const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -factor
            el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`
          })
        })
      }
      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)

      return () => {
        io.disconnect()
        cio.disconnect()
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
        if (raf) cancelAnimationFrame(raf)
      }
    }
  }, [])

  // Dos catálogos separados: Paletas y Ropa+Accesorios.
  const catalogos = [
    stats.paletas > 0 && {
      key: 'paletas',
      href: '/paletas',
      titulo: 'Paletas de pádel',
      count: stats.paletas,
      unidad: stats.paletas === 1 ? 'modelo' : 'modelos',
      desc: 'Control, potencia y polivalentes. Tecnología carbono para todos los niveles.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a6 6 0 0 0-6 6c0 2.4 1.4 4.5 3.5 5.5L9 21h6l-.5-6.5A6 6 0 0 0 18 9a6 6 0 0 0-6-6Z" />
      ),
    },
    stats.ropaAcc > 0 && {
      key: 'ropa',
      href: '/ropa-y-accesorios',
      titulo: 'Ropa y accesorios',
      count: stats.ropaAcc,
      unidad: stats.ropaAcc === 1 ? 'producto' : 'productos',
      desc: 'Remeras, buzos, calzas, camperas, grips, pelotas, bolsos y mochilas.',
      icon: (
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3 4 6l2 3 2-1v10h8V8l2 1 2-3-4-3-2 2a3 3 0 0 1-4 0L8 3Z" />
      ),
    },
  ].filter(Boolean)

  const pasos = [
    { n: 1, titulo: 'Elegí tus productos', desc: 'Entrá a paletas o a ropa y accesorios y sumá lo que necesitás.' },
    { n: 2, titulo: 'Armá tu pedido', desc: 'Elegí colores, talles y cantidades. Las promos por cantidad se aplican solas.' },
    { n: 3, titulo: 'Cerrá por WhatsApp', desc: 'Finalizás y te llega el pedido redactado a WhatsApp para coordinar todo.' },
  ]

  return (
    <div ref={rootRef}>
      {/* Hero 3D cinematográfico (se mudó del catálogo, intacto) */}
      <IntroHero productCount={stats.total} onExplore={goToCatalog} />

      {/* ── Catálogos (elegí Paletas o Ropa y accesorios) ── */}
      <section id="catalogos" className="relative overflow-hidden bg-[#FAFBFC] py-20 sm:py-28 scroll-mt-4">
        <div
          data-parallax="0.12"
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 w-[42vw] max-w-[460px] h-[42vw] max-h-[460px] rounded-full bg-saro-blue/10 blur-[110px]"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <div data-reveal className="reveal text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-blue mb-3">
              Dos catálogos, una sola marca
            </p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark tracking-tight leading-[1.08]">
              Elegí tu catálogo
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-4 leading-relaxed">
              Elegí lo que buscás y armá tu pedido. La calidad SARO, directo de fábrica y con envíos a todo el país.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {catalogos.map((c, i) => (
              <Link
                key={c.key}
                href={c.href}
                data-reveal
                className="reveal group relative bg-white rounded-2xl border border-gray-100/80 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 p-7 flex flex-col"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-saro-light text-saro-blue mb-5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                    {c.icon}
                  </svg>
                </span>
                <h3 className="text-lg font-bold text-saro-dark tracking-tight">{c.titulo}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed flex-1">{c.desc}</p>
                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100/80">
                  <span className="text-sm font-semibold text-gray-400">
                    <span className="text-saro-blue font-extrabold">{c.count}</span> {c.unidad}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-saro-blue group-hover:gap-2 transition-all">
                    Ver catálogo
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo comprar (mayorista por WhatsApp) ────── */}
      <section className="relative bg-white py-20 sm:py-28 border-y border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div data-reveal className="reveal text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-accent mb-3">
              Simple y sin vueltas
            </p>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-saro-dark tracking-tight leading-[1.08]">
              Cómo comprar
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-4 leading-relaxed">
              No cobramos online: armás tu pedido en la web y lo cerramos juntos por WhatsApp.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {pasos.map((p, i) => (
              <div
                key={p.n}
                data-reveal
                className="reveal relative bg-[#FAFBFC] rounded-2xl border border-gray-100/80 p-7"
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-saro-dark text-white font-extrabold text-lg mb-5">
                  {p.n}
                </span>
                <h3 className="text-lg font-bold text-saro-dark tracking-tight">{p.titulo}</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>

          {mostrarCompraMinima && (
            <div data-reveal className="reveal mt-10 flex justify-center">
              <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-saro-light to-blue-50 text-saro-dark px-5 py-3 rounded-full border border-blue-100/60">
                <span className="text-saro-blue font-bold text-sm tracking-tight">Compra mín. sugerida:</span>
                <span className="font-extrabold text-saro-dark">
                  ${minPurchase.toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Por qué SARO (números + valor) ──────────── */}
      <section className="relative overflow-hidden bg-[#FAFBFC] py-20 sm:py-24">
        <div
          data-parallax="0.1"
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -right-20 w-[40vw] max-w-[420px] h-[40vw] max-h-[420px] rounded-full bg-saro-accent/10 blur-[110px]"
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            {/* Productos */}
            <div data-reveal className="reveal flex flex-col items-center">
              <div className="h-14 sm:h-20 flex items-center justify-center text-saro-blue">
                <span className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none">
                  <span data-count={stats.total}>0</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-2 uppercase tracking-wider">
                Productos
              </p>
            </div>

            {/* 15 años en el mercado */}
            <div data-reveal className="reveal flex flex-col items-center" style={{ transitionDelay: '90ms' }}>
              <div className="h-14 sm:h-20 flex items-center justify-center text-saro-blue">
                <span className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-none">
                  <span data-count="15">0</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-2 uppercase tracking-wider">
                Años en el mercado
              </p>
            </div>

            {/* Envíos a todo el país */}
            <div data-reveal className="reveal flex flex-col items-center" style={{ transitionDelay: '180ms' }}>
              <div className="h-14 sm:h-20 flex items-center justify-center text-saro-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="w-12 h-12 sm:w-16 sm:h-16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.055 2.055 0 0 0-1.581-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-semibold text-gray-500 mt-2 uppercase tracking-wider">
                Envíos a todo el país
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Diseños personalizados (clubes y eventos) ── */}
      <section className="relative bg-[#FAFBFC] py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div data-reveal className="reveal relative rounded-3xl bg-gradient-to-br from-saro-light to-blue-50 border border-blue-100/60 p-8 sm:p-12 overflow-hidden">
            <div className="relative sm:flex sm:items-center sm:justify-between sm:gap-8">
              <div className="max-w-lg">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-blue mb-3">
                  Para clubes y eventos
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-saro-dark tracking-tight leading-[1.08]">
                  Diseños personalizados
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mt-4 leading-relaxed">
                  ¿Tenés un club o estás organizando un evento? Hacemos <strong className="text-saro-dark font-semibold">ropa y paletas
                  personalizadas</strong> con tu diseño, colores y marca. Lo coordinamos y lo armamos juntos por WhatsApp.
                </p>
              </div>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola SARO! Quiero consultar por productos personalizados (ropa y/o paletas) para un club o evento.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 sm:mt-0 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-7 py-4 rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 btn-press flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Consultar personalizados
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-saro-dark py-20 sm:py-28">
        <div
          data-parallax="0.14"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] max-w-[640px] h-[70vw] max-h-[640px] rounded-full bg-saro-blue/25 blur-[130px]"
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div data-reveal className="reveal">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.08]">
              Entrá al catálogo y armá tu pedido
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-lg mx-auto leading-relaxed">
              {stats.total > 0 ? `${stats.total} productos` : 'Catálogo completo'} con la calidad SARO, directo de fábrica y envíos a todo el país.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/paletas"
                className="inline-flex items-center gap-2 bg-white text-saro-dark hover:bg-saro-blue hover:text-white font-bold text-sm px-8 py-4 rounded-xl shadow-lg shadow-black/20 transition-all duration-200 btn-press"
              >
                Ver paletas
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                </svg>
              </Link>
              <Link
                href="/ropa-y-accesorios"
                className="inline-flex items-center gap-2 bg-saro-blue text-white hover:bg-saro-mid font-bold text-sm px-8 py-4 rounded-xl shadow-lg shadow-saro-blue/25 transition-all duration-200 btn-press"
              >
                Ropa y accesorios
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
                </svg>
              </Link>
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-8 py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 btn-press"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.853L.054 23.446a.5.5 0 0 0 .612.612l5.598-1.479A11.947 11.947 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.212-1.43l-.374-.22-3.878 1.023 1.023-3.877-.22-.374A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                Escribinos
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Nuestra historia + Trabajá con nosotros (desplegables) ── */}
      <HistoriaTrabaja whatsappNumber={whatsappNumber} />

      {/* ── Preguntas frecuentes (al final de todo) ──── */}
      <section className="bg-[#FAFBFC] py-16 sm:py-20">
        <div data-reveal className="reveal max-w-3xl mx-auto px-4 sm:px-6">
          <FaqSection />
        </div>
      </section>
    </div>
  )
}
