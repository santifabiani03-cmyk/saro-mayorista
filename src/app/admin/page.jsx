'use client'

import dynamic from 'next/dynamic'

// Cargar AdminPage sin SSR (usa APIs del browser como DOMMatrix, canvas, etc.)
const AdminPage = dynamic(() => import('../../views/AdminPage'), { ssr: false })

export default function AdminRoute() {
  return <AdminPage />
}
