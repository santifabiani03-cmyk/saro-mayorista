/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar ESLint en build (usamos nuestro propio config)
  eslint: { ignoreDuringBuilds: true },
  // El catálogo y los ajustes ya no se leen del disco en Vercel: vienen de la
  // rama "datos" de GitHub (src/utils/datos.js).
}

export default nextConfig
