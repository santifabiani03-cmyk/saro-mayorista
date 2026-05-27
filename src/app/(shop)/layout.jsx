import fs from 'node:fs'
import path from 'node:path'
import ShopShell from './ShopShell'

export default function ShopLayout({ children }) {
  const config = JSON.parse(
    fs.readFileSync(path.resolve('public/config.json'), 'utf-8')
  )
  return <ShopShell config={config}>{children}</ShopShell>
}
