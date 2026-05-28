'use client'

import { useEffect, useState } from 'react'

export default function CatalogoPage() {
  const [status, setStatus] = useState('loading') // loading | found | notfound

  useEffect(() => {
    fetch('/catalogo.pdf', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          // El PDF existe → redirigir
          window.location.href = '/catalogo.pdf'
        } else {
          setStatus('notfound')
        }
      })
      .catch(() => setStatus('notfound'))
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-white/20 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-white/60 text-sm">Cargando catálogo…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <img
          src="/assets/logo.png"
          alt="SARO Mayorista"
          className="h-16 w-auto mx-auto mb-6 opacity-80"
          onError={e => { e.target.style.display = 'none' }}
        />
        <h1 className="text-white text-xl font-bold mb-2">Catálogo en preparación</h1>
        <p className="text-white/50 text-sm mb-6">
          El catálogo PDF se está generando. Volvé a intentar en unos minutos.
        </p>
      </div>
    </div>
  )
}
