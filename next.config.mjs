/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar ESLint en build (usamos nuestro propio config)
  eslint: { ignoreDuringBuilds: true },
  // El catálogo y los ajustes ya no se leen del disco en Vercel: vienen de la
  // rama "datos" de GitHub (src/utils/datos.js).

  // Fotos de producto achicadas al tamaño en que se muestran (src/components/Foto.jsx).
  // Vienen del repo en GitHub (ramas master y datos) o de public/assets. Los
  // nombres llevan la fecha, así que una URL nunca cambia de foto: se guardan
  // 31 días ya convertidas.
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: 'raw.githubusercontent.com',
      pathname: '/santifabiani03-cmyk/saro-mayorista/**',
    }],
    minimumCacheTTL: 2678400,
  },

  // El sitemap se arma solo desde el catálogo (src/app/api/sitemap/route.js).
  // /sitemap.xml es la dirección que Google busca por defecto.
  async rewrites() {
    return [{ source: '/sitemap.xml', destination: '/api/sitemap' }]
  },
}

export default nextConfig
