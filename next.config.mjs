/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desactivar ESLint en build (usamos nuestro propio config)
  eslint: { ignoreDuringBuilds: true },
}

export default nextConfig

