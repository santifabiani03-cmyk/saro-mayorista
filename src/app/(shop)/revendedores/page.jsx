import Link from 'next/link'
import Foto from '../../../components/Foto'
import { Formulario } from '../../../components/HistoriaTrabaja'
import { leerCatalogo, leerAjustes } from '../../../utils/datos'

// Página para clubes y tiendas que quieran revender SARO: es el link que se
// manda en la prospección mayorista. Sin precios (los mayoristas están en
// /ropa-y-accesorios/mayorista y las paletas por mayor se arreglan por
// WhatsApp). Todo lo que dice sale de datos reales de la marca: no sumar
// márgenes, plazos ni números que SARO no haya confirmado.

export const revalidate = 60

const PAGINA = 'https://saro.com.ar/revendedores'
const TITULO = 'Revendé SARO | Paletas y ropa de pádel para clubes y tiendas'
const DESCRIPCION =
  'Sumá SARO a tu club o tienda: marca argentina con 15 años en el pádel, paletas, accesorios e indumentaria, diseños personalizados y envíos a todo el país. Dejá tus datos y armamos el acuerdo por WhatsApp.'

export const metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: PAGINA },
  openGraph: {
    type: 'website',
    title: 'Revendé SARO en tu club o tienda',
    description: DESCRIPCION,
    url: PAGINA,
    siteName: 'SARO',
    locale: 'es_AR',
    images: ['https://saro.com.ar/assets/logo-horizontal.png'],
  },
}

const BENEFICIOS = [
  {
    titulo: 'Marca propia, 15 años',
    texto: 'SARO la fundó Leonardo Fabiani después de casi 20 años como vendedor mayorista en el pádel.',
    icono: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  {
    titulo: 'Línea completa',
    texto: 'Paletas, grips, cubre grips, pelotas, bolsos, mochilas e indumentaria deportiva.',
    icono: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Zm0 9.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  },
  {
    titulo: 'Personalizados para clubes',
    texto: 'Ropa y paletas con el diseño, los colores y la marca de tu club o evento.',
    icono: 'M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42',
  },
  {
    titulo: 'Trato directo',
    texto: 'Calidad-precio y un vínculo cercano: todo se coordina por WhatsApp. Enviamos a todo el país.',
    icono: 'M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z',
  },
]

const PASOS = [
  { titulo: 'Dejá tus datos', texto: 'Completá el formulario de abajo: se manda directo a nuestro WhatsApp.' },
  { titulo: 'Te contactamos', texto: 'Conocemos tu club o tienda y armamos juntos el acuerdo.' },
  { titulo: 'Recibís el pedido', texto: 'Lo preparamos y te lo enviamos a cualquier punto del país.' },
]

const fotoDe = p => (p.imagenes?.length ? p.imagenes[0] : p.imagen) || null

/** Hasta 4 paletas publicadas y 4 productos más, con foto, en el orden del catálogo. */
function vidriera(productos) {
  const visibles = productos.filter(p => p.visible !== false && fotoDe(p))
  const paletas = visibles.filter(p => p.categoria === 'paleta' && Number(p.precioMinorista) > 0)
  const otros = visibles.filter(p => p.categoria !== 'paleta')
  return [...paletas.slice(0, 4), ...otros.slice(0, 8 - Math.min(4, paletas.length))]
}

function Icono({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

export default async function RevendedoresPage() {
  const [productos, config] = await Promise.all([leerCatalogo(), leerAjustes()])
  const muestra = vidriera(productos)

  return (
    <>
      {/* ── Portada ── */}
      <section className="relative overflow-hidden bg-saro-dark">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[70rem] h-[40rem] rounded-full bg-saro-blue/25 blur-[140px]" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[.32em] text-saro-accent mb-4">
            Para clubes y tiendas
          </p>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.05]">
            Revendé SARO en tu club o tienda
          </h1>
          <p className="text-base sm:text-lg text-white/70 mt-6 max-w-2xl mx-auto leading-relaxed">
            Marca argentina con 15 años en el pádel. Paletas, accesorios e indumentaria con buena
            relación calidad-precio y trato directo por WhatsApp.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#sumate"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-7 py-4 rounded-xl shadow-lg shadow-emerald-500/25 transition duration-200 btn-press"
            >
              Quiero revender SARO
            </a>
            <Link
              href="/ropa-y-accesorios/mayorista"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm px-7 py-4 rounded-xl transition duration-200 btn-press"
            >
              Ver catálogo mayorista →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Por qué SARO ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-saro-dark tracking-tight text-center">
          Por qué sumar SARO
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {BENEFICIOS.map(b => (
            <div key={b.titulo} className="bg-white rounded-2xl border border-gray-100/80 shadow-card p-6">
              <div className="w-11 h-11 rounded-xl bg-saro-light text-saro-blue flex items-center justify-center">
                <Icono d={b.icono} />
              </div>
              <h3 className="mt-4 font-bold text-saro-dark tracking-tight">{b.titulo}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Vidriera (sin precios) ── */}
      {muestra.length > 0 && (
        <section className="bg-white border-y border-gray-100/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.28em] text-saro-blue mb-2">La línea</p>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-saro-dark tracking-tight">
                  Algunos de nuestros productos
                </h2>
              </div>
              <Link href="/ropa-y-accesorios/mayorista" className="text-sm font-semibold text-saro-blue hover:text-saro-mid">
                Ver precios por mayor →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
              {muestra.map(p => (
                <li key={p.id} className="rounded-2xl border border-gray-100/80 bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-hidden">
                  <div className="aspect-square">
                    <Foto
                      src={fotoDe(p)}
                      sizes="(min-width: 1152px) 270px, (min-width: 640px) 25vw, 50vw"
                      alt={p.nombre}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <p className="px-3 py-2.5 text-xs sm:text-sm font-semibold text-saro-dark leading-tight line-clamp-2 bg-white">
                    {p.nombre}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ── Personalizados ── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24">
        <div className="rounded-3xl bg-gradient-to-br from-saro-light to-blue-50 border border-blue-100/60 p-8 sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[.28em] text-saro-blue mb-2">Para clubes y eventos</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-saro-dark tracking-tight">Diseños personalizados</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-3 leading-relaxed">
            Hacemos <strong className="text-saro-dark font-semibold">ropa y paletas personalizadas</strong> con
            el diseño, los colores y la marca de tu club o evento. Lo coordinamos juntos por WhatsApp.
          </p>
        </div>
      </section>

      {/* ── Cómo empezar ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-saro-dark tracking-tight text-center">
          Cómo empezar
        </h2>
        <ol className="mt-10 grid sm:grid-cols-3 gap-4 sm:gap-5">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="bg-white rounded-2xl border border-gray-100/80 shadow-card p-6">
              <span className="w-9 h-9 rounded-full bg-saro-dark text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <h3 className="mt-4 font-bold text-saro-dark tracking-tight">{p.titulo}</h3>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{p.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Formulario ── */}
      <section id="sumate" className="max-w-4xl mx-auto px-4 sm:px-6 pb-20 sm:pb-28 scroll-mt-24">
        <div className="bg-white rounded-2xl border border-gray-100/80 shadow-card p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-saro-dark tracking-tight text-center mb-2">
            Armemos el acuerdo
          </h2>
          <Formulario whatsappNumber={config.whatsappNumber} />
        </div>
      </section>
    </>
  )
}
