/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar ESLint en build (usamos nuestro propio config)
  eslint: { ignoreDuringBuilds: true },
  // Las páginas que se generan a pedido (fichas de producto) leen estos JSON del
  // disco en el servidor. Sin esto Vercel no los incluye en la función y la
  // ficha da error 500 (ENOENT public/config.json).
  outputFileTracingIncludes: {
    '/**': ['./public/config.json', './catalog/products.json'],
  },
}

export default nextConfig

