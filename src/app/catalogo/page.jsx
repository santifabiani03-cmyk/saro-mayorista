import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Catálogo SARO',
  robots: 'noindex, nofollow',
}

export default function CatalogoPage() {
  redirect('https://catalogo.saro.com.ar')
}
