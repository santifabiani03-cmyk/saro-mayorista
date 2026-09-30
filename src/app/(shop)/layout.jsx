import ShopShell from './ShopShell'
import { leerAjustes } from '../../utils/datos'

export default async function ShopLayout({ children }) {
  const config = await leerAjustes()
  return <ShopShell config={config}>{children}</ShopShell>
}
