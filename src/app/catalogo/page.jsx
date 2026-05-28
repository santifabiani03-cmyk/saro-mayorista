import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Catálogo SARO Mayorista — PDF',
  description: 'Descargá el catálogo completo de productos SARO Mayorista en PDF.',
}

export default function CatalogoPage() {
  redirect('/catalogo.pdf')
}
