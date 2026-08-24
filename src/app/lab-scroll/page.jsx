import ScrollLab from './ScrollLab'

// Maqueta interna para validar el guion del scroll antes de producir los assets 3D.
// No se indexa ni se enlaza desde el sitio.
export const metadata = {
  title: 'Lab · Maqueta de scroll',
  robots: { index: false, follow: false },
}

export default function LabScrollPage() {
  return <ScrollLab />
}
