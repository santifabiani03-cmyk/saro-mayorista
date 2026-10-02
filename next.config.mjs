/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar ESLint en build (usamos nuestro propio config)
  eslint: { ignoreDuringBuilds: true },
  // El catálogo y los ajustes ya no se leen del disco en Vercel: vienen de la
  // rama "datos" de GitHub (src/utils/datos.js).

  // El sitemap se arma solo desde el catálogo (src/app/api/sitemap/route.js).
  // /sitemap.xml es la dirección que Google busca por defecto.
  async rewrites() {
    return [{ source: '/sitemap.xml', destination: '/api/sitemap' }]
  },
}

export default nextConfig
