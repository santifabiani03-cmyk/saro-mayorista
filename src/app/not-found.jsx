import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Logo */}
        <img
          src="/assets/logo-icon.png"
          alt="SARO"
          className="h-16 w-auto mx-auto opacity-30"
        />

        {/* Error */}
        <div className="space-y-2">
          <h1 className="text-6xl font-extrabold text-saro-blue">404</h1>
          <p className="text-xl font-semibold text-gray-800">
            Pagina no encontrada
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            La pagina que buscas no existe o fue movida.
            Pero nuestro catalogo mayorista te esta esperando.
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-saro-blue hover:bg-saro-dark text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            <span>Ver catalogo</span>
          </Link>
          <a
            href="https://wa.me/5491100000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-600 hover:border-saro-blue hover:text-saro-blue font-semibold rounded-xl transition-colors"
          >
            Contactar por WhatsApp
          </a>
        </div>

        {/* Texto SEO */}
        <p className="text-[10px] text-gray-300 pt-4">
          SARO Mayorista &middot; Ropa deportiva y accesorios de padel al por mayor
        </p>
      </div>
    </div>
  )
}
