# SARO Mayorista — Documentación del proyecto

> **Leé esto primero.** Este archivo es el mapa completo del proyecto. Está escrito para
> que cualquier persona (o una sesión nueva de Claude) arranque de cero sin tener que releer
> chats viejos ni preguntar nada. Prioriza ser exhaustivo. Si algo cambia, actualizá este
> archivo y `docs/ESTETICA.md`.

Última actualización: 2026-10-04.

> ⚠️ **Cambio importante (agosto 2026): el sitio pasó de MAYORISTA a MINORISTA.**
> La tienda principal es minorista (`/paletas` y `/ropa-y-accesorios`, precio `precioMinorista`).
> La venta por mayor quedó como canal secundario: el catálogo **`/ropa-y-accesorios/mayorista`**
> (precio `precio`, con compra mínima) y el formulario **"Trabajá con nosotros"**. Las paletas
> **no** se venden por mayor en la web y sólo se publican si tienen precio minorista.
> Desde el 28/09/2026 el **SEO/metadata también es minorista** ("SARO Tienda Oficial"). El repo
> y el dominio siguen llamándose `saro-mayorista`.

---

## 0. Datos rápidos (para tener a mano)

| Cosa | Valor |
|---|---|
| Nombre | SARO Mayorista |
| Sitio en vivo | https://saro.com.ar |
| Panel admin | https://saro.com.ar/admin (protegido con PIN) |
| Repositorio | https://github.com/santifabiani03-cmyk/saro-mayorista (rama `master`) |
| Carpeta local | `C:\Users\smfab\Desktop\Pagina saro` |
| Hosting | Vercel (deploy automático al pushear a `master`) |
| Datos vivos | Rama **`datos`** del mismo repo (catálogo, ajustes, pedidos, fotos). No dispara deploys. Ver §2.2 |
| Dueño | smfab (Santiago Fabiani) |

---

## 1. ¿Qué es el proyecto?

SARO es una **marca argentina de paletas de pádel, accesorios de pádel y ropa deportiva**, con
**15 años en el mercado**. Fundada por **Leonardo Fabiani** (SARO = **Sa**ntiago + **Ro**cío, sus
hijos). Esta web es su **catálogo online**.

**Para quién es (desde agosto 2026): el consumidor final (minorista).** Antes era mayorista.
Quien quiera comprar por mayor o revender entra por **"Trabajá con nosotros"** en la landing:
completa un formulario (nombre, apellido, provincia, localidad, mensaje) que se manda por
WhatsApp. La marca también hace **productos personalizados** para clubes y eventos (se coordina
por WhatsApp).

**Modelo de negocio — MUY IMPORTANTE entender esto:**
- La web **NO cobra online**. No hay tarjetas, no hay Mercado Pago, no hay carrito con pago.
- El cliente navega el catálogo, arma su pedido en un carrito, y al finalizar se genera un
  **mensaje de WhatsApp** ya redactado (con productos, cantidades y total) que se manda al
  número del vendedor. **El pedido y el cierre de la venta pasan por WhatsApp, a mano.**
- Es, en esencia, una **vitrina digital + generador de pedidos por WhatsApp**.

**Lo que la web NO tiene** (importante para no prometer de más): pasarela de pagos, cuentas de
usuario, ni envío de emails automáticos. **Sí tiene** un **cotizador de envío** (estimativo, API
MiCorreo de Correo Argentino) — pero el envío igual se cierra por WhatsApp.

---

## 2. Arquitectura (cómo está armada)

### 2.1 Tecnologías

| Qué | Herramienta / versión |
|---|---|
| Framework | **Next.js 15** (App Router) — ver `package.json`, `next: ^15.3.4` |
| Librería base | **React 19** |
| Estilos | **Tailwind CSS 3.4** (utilidades en las clases) |
| 3D del hero | **Three.js 0.185** (la paleta que gira/juega) |
| Generación de PDF | jspdf + pdf-lib + pdfjs-dist (catálogo y etiquetas) |
| Quitar fondo de fotos | @imgly/background-removal (corre en el navegador, gratis) |
| Analytics | @vercel/analytics + @vercel/speed-insights + **Google Analytics 4** (`G-WSMCJDHZWH`, en `src/components/GoogleAnalytics.jsx`; no mide `/admin`, `/lab*` ni navegadores con `?no-medir=1`) |
| Envíos | **API MiCorreo** (Correo Argentino) para cotizar — ver §2.10 |
| Videos del admin | **Remotion 4.0.529** (versión exacta en todos los paquetes) — vista previa en el admin, render en GitHub Actions. Ver §8 |

No hay backend propio ni servidor aparte: todo corre dentro de Next.js sobre Vercel (salvo el
render de los videos, que corre en GitHub Actions).

### 2.2 "Base de datos" = archivos JSON en la rama `datos` de GitHub

**No hay base de datos tradicional** (ni SQL ni nada). Los datos que cambian solos viven en
**archivos de texto en la rama `datos` del repo** (no en `master`), y GitHub hace de base de
datos. Es una rama "huérfana": no tiene código, sólo esto:

| Archivo (rama `datos`) | Qué guarda | Rol |
|---|---|---|
| `products.json` | Todos los productos: nombre, precio, descripción, categoría, colores, talles, stock, fotos, promos | La "tabla" de productos / catálogo / stock |
| `config.json` | Ajustes de la tienda (WhatsApp, compra mínima…) — ver §2.7 | Configuración |
| `orders.json` | Registro de los pedidos que se enviaron por WhatsApp | La "tabla" de pedidos (solo estadística) |
| `fotos/` | Fotos de producto que sube el admin desde el 30/09/2026 | Imágenes |

**Por qué una rama aparte (30/09/2026):** antes todo esto estaba en `master`, y **cada push a
`master` dispara un deploy a producción**. Cada pedido, cada foto (89 en 60 días), cada
publicación y cada cambio de ajustes reconstruía la web entera, y los cambios tardaban 1–2 min
en verse. La rama `datos` no dispara nada: la web la lee en el momento y el cambio se ve en
segundos. Cada guardado queda como un commit en esa rama → **hay historial para deshacer**.
Se evaluó Vercel Blob y se descartó: en el plan Hobby, si un mes se pasa del límite gratis
(10 GB de transferencia, fácil con fotos y anuncios) **bloquea el almacenamiento 30 días**.

**Todo el acceso a estos datos está en `src/utils/datos.js`.** Si algún día se pasan a una base
de datos real, se cambia sólo ese archivo.

Las **fotos** se sirven por links directos de GitHub:
- nuevas: `https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/datos/fotos/...webp`
- viejas (hasta el 29/09/2026): `.../master/public/assets/...webp` — siguen andando, no se movieron.

⚠️ `catalog/products.json`, `catalog/orders.json` y `public/config.json` **siguen en `master`
pero quedaron congelados** (copia del 30/09/2026). Sólo se usan en desarrollo local cuando no
hay credenciales de GitHub. En Vercel nunca se leen.

### 2.3 Cómo se lee y se publica (el flujo de datos)

- **Lectura (tienda pública):** las páginas (`/`, `/paletas`, `/ropa-y-accesorios`, las fichas)
  leen el catálogo y los ajustes de la rama `datos` con `leerCatalogo()` / `leerAjustes()`
  (`src/utils/datos.js`). Next los guarda en caché con una etiqueta; al guardar desde el admin
  se invalida (`revalidateTag`) y la próxima visita ya muestra lo nuevo. Además cada 5 min se
  vuelven a leer igual, por si alguien edita la rama a mano. Las páginas tienen
  `export const revalidate = 60` (ISR). `/api/catalog` devuelve el catálogo y `/api/config` los
  ajustes (para el admin y el carrito).

**Rutas públicas (actualizado):** `/` = landing de entrada (hero 3D + secciones de scroll +
FAQ). Desde ahí se entra a **dos catálogos separados**: `/paletas` (solo paletas) y
`/ropa-y-accesorios` (todo lo que no es paleta: accesorios de pádel + ropa). `/producto/[slug]`
= ficha (su botón "volver" apunta al catálogo según la categoría). ⚠️ `/catalogo` **ya existía**
antes y redirige a un catálogo externo (`catalogo.saro.com.ar`) — NO es la grilla interna, no
tocar. El sitemap lista `/`, `/paletas`, `/ropa-y-accesorios` y los productos.
- **`catalogo.saro.com.ar` = el PDF del catálogo.** Es **GitHub Pages** sirviendo la carpeta
  `docs/` de `master` (`docs/CNAME`): `docs/index.html` redirige a `docs/catalogo.pdf`. Ahí
  apuntan `/catalogo` y el **QR del admin**. El PDF lo arma el admin en el navegador después de
  cada "Publicar en sitio" y lo sube con `/api/upload-catalog`, **sólo si cambió algo de lo que
  muestra** (nombre, categoría, género, colores, foto o qué productos están visibles; precio y
  stock no aparecen). Para saberlo, la "huella" de lo publicado va en el mensaje del commit
  (`[huella:…]`). ⚠️ Vercel corta los pedidos de más de **4,5 MB** y el PDF viaja en base64 (un
  33 % más pesado): por eso fotos a 600 px, logos comprimidos, y si igual no entra se rearma solo
  con fotos más chicas. Entre mayo y el 30/09/2026 no se actualizó por pasarse de ese límite.
- **Escritura (admin):** cuando en el panel `/admin` editás productos y tocás **"Publicar en
  sitio"**, la web llama a `/api/publish`, que **guarda el `products.json` en la rama `datos`**
  usando un token de acceso (`GITHUB_TOKEN`). **No hay deploy:** la web lo toma en segundos.
  Lo mismo con los Ajustes (`/api/update-config`) y las fotos (`/api/upload-image` → `fotos/`).
- **Pedidos:** cuando un cliente manda el pedido, además de abrir WhatsApp, se llama a
  `/api/track-order` que **agrega el pedido a `orders.json` de la rama `datos`** (para la
  sección "Demanda" del admin). Es un registro, no un sistema de gestión. No guarda datos
  personales (el nombre del cliente sólo va en el mensaje de WhatsApp: el repo es público).
- **Publicar tiene "merge" de 3 vías:** `/api/publish` hace un merge para que si dos personas
  editan a la vez no se pisen los cambios (ver `src/app/api/publish/route.js`). Todos los
  guardados usan el `sha` de GitHub: si otro guardado se metió en el medio (dos pedidos
  simultáneos), GitHub lo rechaza y `actualizarArchivo` vuelve a leer y reintenta.
- **Publicar una lista vacía se rechaza** si hay productos publicados (un admin que no llegó a
  cargar el catálogo borraría todo).

### 2.4 Autenticación del admin

- El panel `/admin` está protegido por un **PIN** (variable de entorno `ADMIN_PIN`).
- Hay **rate limiting** anti–fuerza bruta: 5 intentos por 5 min, luego bloqueo de 15 min por IP
  (ver `/api/verify-pin`).
- Las rutas de API sensibles (publicar, subir imágenes, generar con IA) exigen el PIN en el
  cuerpo del request. `/api/track-order` no pide PIN pero tiene rate limit (10 pedidos / 30 min
  por IP).

### 2.5 Estructura de carpetas

```
Pagina saro/
├── CLAUDE.md                 ← este archivo
├── docs/ESTETICA.md          ← guía visual ampliada (para diseño)
├── catalog/
│   ├── products.json         ← copia CONGELADA (30/09/2026). Lo vivo está en la rama `datos`
│   └── orders.json           ← copia CONGELADA (30/09/2026). Lo vivo está en la rama `datos`
├── public/
│   ├── config.json           ← copia CONGELADA (30/09/2026). Lo vivo está en la rama `datos`
│   ├── manifest.json         ← metadatos PWA (íconos, nombre)
│   ├── favicon.png           ← "chip" navy con el logo blanco (ícono de pestaña)
│   ├── models/paleta-opt.glb ← modelo 3D de la paleta (hero) — la lista está en Paleta3D.jsx
│   ├── videos/               ← música, efectos, fuente Inter y capturas de los videos (§8)
│   └── assets/               ← logos + fondo-cancha.webp + saro-wordmark.png + fotos de producto
├── src/
│   ├── app/
│   │   ├── layout.jsx        ← <head>, fuentes, SEO, Analytics (Vercel + Google Analytics)
│   │   ├── globals.css       ← estilos globales + animaciones del hero
│   │   ├── (shop)/           ← LA TIENDA PÚBLICA (grupo de rutas)
│   │   │   ├── layout.jsx    ← lee los ajustes (leerAjustes) y envuelve la tienda
│   │   │   ├── page.jsx      ← LANDING de entrada (/) — Server Component + preload del .glb
│   │   │   ├── Landing.jsx   ← la landing: HERO 3D + catálogos + cómo comprar + números +
│   │   │   │                    personalizados + Historia/Trabajá + FAQ
│   │   │   ├── paletas/page.jsx           ← catálogo SOLO paletas (/paletas)
│   │   │   ├── ropa-y-accesorios/page.jsx ← catálogo ropa + accesorios (/ropa-y-accesorios)
│   │   │   ├── CatalogView.jsx    ← arma schema + catálogo + bloque SEO por catálogo
│   │   │   ├── ShopShell.jsx ← header + carrito + footer
│   │   │   ├── CatalogClient.jsx  ← grilla de productos, filtros, buscador (prop showFilters)
│   │   │   └── producto/[slug]/   ← página individual de cada producto
│   │   ├── admin/            ← entrada al panel admin (carga AdminPage)
│   │   └── api/              ← LA "COCINA" (endpoints, ver tabla abajo)
│   ├── components/           ← piezas de UI reutilizables
│   │   ├── Header.jsx, Cart.jsx, Footer (en ShopShell), Filters.jsx
│   │   ├── ProductCard.jsx, ProductModal.jsx, ImageCarousel.jsx
│   │   ├── FaqSection.jsx, HowToBuyModal.jsx
│   │   ├── HistoriaTrabaja.jsx ← 2 pestañas: historia/política + form "Trabajá con nosotros"
│   │   ├── GuiaPaletas.jsx   ← guía de compra desplegable (sólo en /paletas)
│   │   ├── CartSuggestions.jsx ← sugerencias para llegar al mínimo (sólo en modo mayorista)
│   │   ├── IntroHero.jsx     ← la intro cinematográfica (texto + escena 3D + fondo de cancha)
│   │   ├── Paleta3D.jsx      ← TODO el motor 3D de la paleta (Three.js)
│   │   └── admin/            ← ProductForm, ProductList, SettingsPanel, VideosPanel, etc.
│   ├── views/AdminPage.jsx   ← el panel admin completo (pestañas)
│   ├── videos/               ← plantillas de video (Remotion) — ver §8
│   └── utils/                ← helpers (datos.js = lectura/guardado en la rama `datos`, colores,
│                                slug, export PDF, envio.js, analytics.js…)
├── package.json, next.config.mjs, tailwind.config.js, vercel.json
└── (archivos locales que NO se deployan: lab.html, IMG_*.jpeg, .py, preview-vendedores.html,
    scripts/ — ver §5.4)
```

### 2.6 Las rutas de API (qué hace cada una)

Todas están en `src/app/api/<nombre>/route.js`:

| Ruta | Método | Qué hace | Pide PIN |
|---|---|---|---|
| `/api/catalog` | GET | Devuelve el catálogo (`products.json` de la rama `datos`) | No |
| `/api/config` | GET | Devuelve los ajustes vigentes (`config.json` de la rama `datos`) | No |
| `/api/publish` | POST | Guarda el catálogo editado en la rama `datos` (con merge). Devuelve el catálogo final | Sí |
| `/api/track-order` | POST | Registra un pedido en `orders.json` de la rama `datos` | No (rate limit) |
| `/api/orders` | GET | Devuelve los pedidos (para la demanda del admin) | Sí (en query) |
| `/api/verify-pin` | POST | Valida el PIN del admin (con anti–fuerza bruta) | — |
| `/api/upload-image` | POST | Sube una foto de producto a `fotos/` de la rama `datos` | Sí |
| `/api/upload-catalog`| POST | Sube el PDF del catálogo a `docs/catalogo.pdf` de `master` (no dispara deploy: `paths-ignore` en `deploy.yml`). Sin `data` responde si hace falta subirlo (compara la huella). Ver §2.3 | Sí |
| `/api/generate-description` | POST | IA (Gemini): genera descripción de producto | Sí |
| `/api/generate-image` | POST | IA (Gemini): genera imagen de escena del producto | Sí |
| `/api/update-config` | POST | Guarda `config.json` (compra mínima, teléfono) en la rama `datos` | Sí |
| `/api/sitemap` | GET | Genera el sitemap XML para Google (con las fotos de cada producto). También responde en **`/sitemap.xml`** (rewrite en `next.config.mjs`), que es la dirección que figura en `robots.txt` | No |
| `/api/cotizar-envio` | POST | Cotiza el envío con la **API MiCorreo** (CP + peso → precio a domicilio y a sucursal). Ver §2.10 | No |
| `/feed.xml` | GET | **Feed de productos para Meta Ads y Google Merchant Center** (se arma solo desde el catálogo). Ver `docs/PUBLICIDAD.md` | No |
| `/feed-img` | GET | Convierte las fotos del feed a JPG 1080×1080 con fondo blanco (sólo fotos de SARO) | No |
| `/api/videos/render` | POST | Dispara el render de un video en GitHub Actions. Ver §8 | Sí (body) |
| `/api/videos/estado` | GET | Estado del render (`?request_id=`): en cola, renderizando, listo o error | Sí (header `x-admin-pin`) |
| `/api/videos/descargar` | GET | Link de descarga del MP4 (`?request_id=`, `&n=` en un lote) | Sí (header `x-admin-pin`) |
| `/api/videos/sugerir` | POST | IA (Gemini): textos para el video y la publicación con los datos reales | Sí (body) |
| `/api/videos/revisar` | POST | IA (Gemini): mira el MP4 ya generado y lista problemas + textos mejores | Sí (body) |

### 2.7 `config.json` (configuración de la tienda)

Es un archivo chico en la **rama `datos`** con la config editable desde el admin (pestaña
**⚙️ Ajustes**). Los cambios se ven en la web en menos de un minuto, sin deploy. (El
`public/config.json` de `master` es una copia congelada; `/config.json` en el sitio también.)

```json
{
  "storeName": "SARO Mayorista",      ← no se usa en ningún lado del sitio
  "whatsappNumber": "5491123208058",   ← número donde caen los pedidos
  "minPurchase": 10000,                ← mínimo (barra de progreso del carrito)
  "suggestedMinPurchase": 200000,      ← el que se muestra como "compra mín. sugerida"
  "currency": "ARS",
  "mostrarCompraMinima": true,         ← ⭐ interruptor de la compra mínima (ver abajo)
  "minPurchaseNuevo": 180000,          ← mínimo para la primera compra mayorista
  "minPurchaseCliente": 10000          ← mínimo si ya es cliente
}
```
(Valores de producción al 28/09/2026.)

⭐ **`mostrarCompraMinima`** es el interruptor de la compra mínima. Hoy está en `true`, pero
el carrito la aplica **sólo si hay productos del catálogo mayorista** (`Cart.jsx`: `hayMayorista`);
un pedido minorista nunca tiene mínimo. Cuando está en `false` se
ocultan solos: el badge del header (desktop y mobile), el chip de la landing, la barra de
progreso del carrito y las sugerencias (`CartSuggestions`). Se cambia desde el
**admin → ⚙️ Ajustes**, con un toggle.

### 2.8 Servicios externos que usa

| Servicio | Para qué | Dónde se configura |
|---|---|---|
| **Vercel** | Hosting + Analytics + Speed Insights | panel de Vercel |
| **GitHub** | "Base de datos" (productos, pedidos) + hosting de imágenes + API de escritura | token en Vercel |
| **WhatsApp** (links `wa.me`) | El "checkout" real: ahí llegan los pedidos | número en `config.json` |
| **Google Gemini** (IA) | Solo en admin: generar descripciones e imágenes de escena | `GEMINI_API_KEY` |
| **Google Search Console** | SEO / posicionamiento (monitoreo, no integrado en código) | externo |
| **Google Analytics 4** | Métricas de uso del sitio (`G-WSMCJDHZWH`) | `layout.jsx` + panel de GA |
| **Correo Argentino (API MiCorreo)** | Cotizador de envío | `MICORREO_*` (ver §2.9 y §2.10) |
| **Zoho Mail** | Casillas `@saro.com.ar` (plan Forever Free) | panel de Zoho + DNS en Vercel |

### 2.9 Variables de entorno (secretos)

Están en Vercel (y localmente en `.env.local`, que **no** se sube a GitHub). **Nunca** las
pongas en el código ni las commitees:

- `ADMIN_PIN` — PIN del panel admin.
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` — para leer/escribir el repo (base de datos e
  imágenes). Hay variantes `NEXT_PUBLIC_GITHUB_*` para uso en el navegador. Para los videos
  (§8) el token además necesita **Actions: Read and write**.
- `GITHUB_VIDEOS_TOKEN` — **opcional**. Si está, los videos usan este token en vez de
  `GITHUB_TOKEN` (para no agrandar los permisos del de siempre).
- `GEMINI_API_KEY` — la IA de Google para el admin.
- **`MICORREO_USER`, `MICORREO_PASSWORD`** — credenciales de **API** de MiCorreo (para el
  endpoint `/token`). ⚠️ **No son** el email/clave de la cuenta: hay que **pedírselas a un
  ejecutivo comercial de Correo Argentino**.
- `MICORREO_CUSTOMER_ID` — id de cliente MiCorreo. Alternativa: `MICORREO_EMAIL` +
  `MICORREO_EMAIL_PASS` (el endpoint lo resuelve solo vía `/users/validate`).
- `MICORREO_CP_ORIGEN` — CP desde donde se despacha (**1065**; es el default si falta).
- `MICORREO_ENV` — poné `test` para pegarle al ambiente de pruebas.

### 2.10 Cotizador de envío (API MiCorreo)

**Estado: código listo y deployado, pero INACTIVO hasta cargar las credenciales.** Sin ellas el
botón "Cotizar envío" devuelve error; el resto del carrito funciona igual.

- **Flujo:** `POST /token` (Basic Auth, token cacheado en memoria) → `POST /rates` con
  `customerId`, `postalCodeOrigin`, `postalCodeDestination` y `dimensions`. Sin `deliveredType`
  la API devuelve **domicilio y sucursal** en una sola llamada.
- **URLs:** prod `https://api.correoargentino.com.ar/micorreo/v1` · test
  `https://apitest.correoargentino.com.ar/micorreo/v1`.
- **Peso** (`src/utils/envio.js`): suma el campo `peso` (gramos) de cada producto — si falta usa
  **400 g** por defecto — y le agrega un **margen de packaging interno**: `<3 kg` +300 g,
  `3–10 kg` +400 g, `>10 kg` +500 g. Al cliente se le muestra **sólo el peso final redondeado a
  kilos enteros** (mínimo 1). ⚠️ **El margen de embalaje NO se menciona nunca en la web.**
- **En el carrito:** el cliente elige **"Cotizar envío"** (ingresa CP) o **"Acordar por
  WhatsApp"**. Lo elegido se adjunta al mensaje de WhatsApp (peso, CP, tipo, precio y total).
- **El peso es sólo para cotizar:** no se muestra en las fichas ni en las cards de producto.
- Se carga por producto en el **admin** (campo "Peso (gramos)", al lado del precio).

---

## 3. Identidad visual (resumen — el detalle fino está en `docs/ESTETICA.md`)

> La guía completa, con reglas de uso del logo y ejemplos de correcto/incorrecto, está en
> **`docs/ESTETICA.md`**. Acá va el resumen operativo.

### 3.1 Paleta de colores

Definidos en `tailwind.config.js` bajo el nombre `saro`. Se usan como clases Tailwind
(`text-saro-blue`, `bg-saro-dark`, etc.):

| Nombre | Hex | Uso principal |
|---|---|---|
| `saro-blue` | **#2563EB** | Azul de marca. Acentos, links, precios, botones primarios, "SARO" |
| `saro-mid` | **#1E40AF** | Azul medio. Hover del azul, degradés |
| `saro-dark` | **#0F172A** | Navy casi negro. Textos fuertes, fondo del intro/hero, botón carrito |
| `saro-light`| **#EFF6FF** | Celeste muy claro. Fondos de badges/chips suaves |
| `saro-accent`| **#F59E0B** | Ámbar. Detalle/acento (badge del carrito, eyebrow del hero) |

Otros que aparecen mucho: **verde WhatsApp** = `emerald-500 / green-500` (botones de WhatsApp),
grises `gray-100/400/500` para textos secundarios y bordes, fondo de página **`#FAFBFC`** (casi
blanco). Nota: el **celeste del logo** (imágenes PNG) es un tono más claro (~`#7EA8E8`), no es
el `saro-blue`. ⚠️ El `manifest.json` tiene un `theme_color` viejo `#4A90D9` (color previo al
rediseño) — es legacy; el azul de marca actual es `#2563EB`.

### 3.2 Tipografía

- **Única fuente: Inter** (Google Fonts), pesos 400, 500, 600, 700, 800. Cargada en
  `layout.jsx` y aplicada global en `globals.css`.
- Jerarquía típica: títulos `font-extrabold` (800) con `tracking-tight`; subtítulos `font-bold`
  (700); cuerpo `font-medium`/`normal`; textos chicos `text-xs`/`text-[11px]` en gris.
- El hero usa tamaños grandes: `text-4xl sm:text-6xl` en el titular.

### 3.3 Logos (archivos en `public/assets/`)

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `logo-horizontal.png` | Logo horizontal completo "▹◅ SARO" en celeste | Header desktop (`h-14`), imágenes OG/Twitter, Schema.org |
| `logo-icon.png` | Solo el ícono "SR" (dos S espejadas) en celeste | Favicon, header mobile (`h-11`), footer (opacidad 40%), **marca de agua en las cards** (`w-9 h-9`, opacidad 35%), PIN gate, 404, PDF |
| `logo.png` | Logo grande (versión pesada) | Header del admin (invertido a blanco) y logo principal del PDF |

Los logos son **celestes sobre transparente**. Sobre fondo oscuro se invierten a blanco con la
clase `brightness-0 invert` (así se hace en el admin).

### 3.4 Imágenes especiales con logo/marca (watermark "SR")

Algunas fotos de producto tienen el **logo SR estampado** en la esquina superior derecha. Son
archivos con sufijo `-sr` o prefijo `c-sr` en `public/assets/` (ej. `c-sr-...webp`,
`saro-sr-junior-...webp`, `tubo-pelotas-noac-x2u-sr-...webp`).

- **Cómo se generan:** en el admin, con el toggle "Grabar logo SR en la imagen". La función
  `applyLogoWatermark` (en `ProductForm.jsx`) dibuja `logo-icon.png` al **12% del ancho**,
  esquina superior derecha, margen del **3%**, **opacidad 0.35**, y guarda en WebP.
- **Son reemplazables:** se pueden regenerar subiendo la foto de nuevo. No son fijas.
- Ojo: en las cards del catálogo el logo SR **también** se muestra en vivo por encima (overlay
  `w-9 h-9 opacity-35`), así que grabar el watermark en la imagen es opcional/redundante y por
  defecto está **desactivado**.

### 3.5 Bordes, sombras, animaciones, espaciado

- **Bordes redondeados:** cards y paneles `rounded-2xl`; botones/inputs `rounded-xl`; chips/
  badges/pills `rounded-full` o `rounded-lg`.
- **Bordes de línea:** `border border-gray-100/80` (gris muy suave, semitransparente).
- **Sombras** (definidas en `tailwind.config.js`): `shadow-card` (reposo de las cards),
  `shadow-card-hover` (hover, con tinte azul), `shadow-float` (modales y panel del carrito).
- **Animaciones Tailwind:** `animate-fade-in`, `animate-slide-up`, `animate-slide-right`.
  Micro-interacción: clase `.btn-press` (se achica al 97% al apretar).
- **Animaciones del hero** (en `globals.css`, prefijo `.intro-*`): glows que respiran, flotación
  de la paleta, partículas, entradas escalonadas. Todas respetan `prefers-reduced-motion`.
- **Espaciado:** contenedores `max-w-7xl mx-auto px-4 sm:px-6`; separación entre secciones con
  `space-y-6`; grilla de productos `gap-3 sm:gap-5`.

---

## 4. Decisiones tomadas y por qué

### 4.1 El hero 3D de la paleta (lo más iterado del proyecto)

**Objetivo:** una primera impresión impactante — una paleta SARO real en 3D que se puede
"jugar" e interactúa con el scroll.

**Se probaron 3 caminos para el modelo 3D, en este orden:**
1. **Procedural** (geometría inventada con Three.js + foto pegada como textura). ❌ Descartado:
   la forma quedaba deforme y la textura plana se veía falsa.
2. **Escaneo por fotogrametría** (app del celular → archivo `.glb`). ❌ Descartado: el mango
   salía con "basura" del escaneo (capturaba la mano) y la malla era ruidosa.
3. **Meshy (IA image-to-3D)** ✅ **El que quedó.** Da el modelo más limpio y realista.

**Estado final del modelo:**
- Archivo: `public/models/paleta-opt.glb` (~**1.5 MB**, comprimido con meshopt + texturas WebP
  desde ~33 MB originales). El loader usa `MeshoptDecoder`.
- Es la paleta **MASTER Carbono 12K** (dorada con carbono gris). ⚠️ **No regenerar a la ligera:**
  costó varias iteraciones. Si se cambia el `.glb`, hay que re-verificar encuadre y que no se
  corte en desktop/mobile.
- **Limitación conocida:** el canto (borde/costado) tiene la textura de Meshy imperfecta (el
  texto "SARO" del canto no es exacto). Se **mitiga** manteniendo la paleta casi siempre de
  frente y con un giro acotado, para que el canto casi no se vea. Se intentó "pintar" el canto
  de dorado por separado pero salpicaba toda la cara (malla ruidosa) → se descartó.

**Cómo funciona la animación (todo en `Paleta3D.jsx`):**
- **Escena 1 (arriba, sin scrollear):** la paleta flota y se inclina siguiendo el mouse.
- **Juego interactivo (click):** al clickear, sale una pelotita **desde la posición del mouse**
  hacia la paleta; la paleta hace un **swing tipo raqueta** y la devuelve a una **dirección
  aleatoria** (arriba, abajo, diagonal). Detalles acordados:
  - Throttle: **mínimo 0.45 s entre pelota y pelota**; los clicks no se acumulan (si dejás de
    clickear, dejan de salir).
  - Cuanto más rápido clickeás, **más rápido es el swing** (duración adaptativa 0.34–1.0 s).
  - Pool de 5 pelotas para poder tener varias en vuelo.
  - El swing **pivota desde el "codo"** (un punto por debajo del mango), no desde el centro —
    así el mango también acompaña el arco, como un brazo real.
  - La cara **mira hacia la pelota** al golpear (rotación en Y hacia el lado de entrada).
- **Al scrollear:** zoom cinematográfico + al 65% del scroll se dispara un **remate estilo
  bandeja** one-shot (una sola vez, se completa solo aunque muevas el scroll — nunca queda a
  medias).
- Todo verificado **sin recortes en desktop y mobile** (en pantallas angostas la cámara se aleja
  y el arco se achica automáticamente).

### 4.2 Otras decisiones fijas (no tocar sin motivo)

- **Rediseño visual completo** de todas las páginas públicas (cards, filtros, carrito, modales,
  FAQ, header, footer) con la paleta de colores y sombras de §3. Quedó fijo.
- La marca de agua SR en las cards quedó en **`w-9 h-9 opacity-35`** (se probó más grande/oscuro
  y se volvió a este valor, igual en cards estándar y de paletas).
- **Generador de escenas con IA en el admin** (`/api/generate-image` + sección en ProductForm):
  toma la foto del producto y genera imágenes lifestyle con Gemini. Depende de que la API key
  de Gemini tenga habilitada la generación de imágenes.
- **Panel de Ajustes en el admin** (compra mínima, compra mínima sugerida, **toggle de compra
  mínima**, teléfono de WhatsApp con prefijo +54 fijo). Guarda en `config.json` vía
  `/api/update-config`.

### 4.3 Decisiones del pivote a minorista (agosto 2026)

- **Rutas separadas:** `/` = landing, `/paletas` y `/ropa-y-accesorios` = catálogos.
  ⚠️ **`/catalogo` ya existía** y redirige a un catálogo externo (`catalogo.saro.com.ar`) — no es
  la grilla interna, **no tocar**. Por eso el catálogo interno NO usa esa ruta.
- **El hero 3D vive en la landing** (se mudó del catálogo). Los catálogos cargan livianos, sin
  Three.js. El botón del hero baja a la sección "Elegí tu catálogo" (no navega).
- **Fondo del hero:** foto de cancha (`fondo-cancha.webp`, 2880px). **Sin desenfoque** — el
  centro va nítido y el velo blanco va sólo en **esquinas superiores y borde inferior** (se probó
  velo completo y blur, y se veía "de baja calidad").
- **"SARO" del título del hero** es una imagen (`saro-wordmark.png`), recortada del logo
  horizontal y recoloreada al degradé azul de marca — no es texto.
- **Favicon:** `public/favicon.png`, un "chip" navy redondeado con el logo en blanco. Se hizo así
  porque el logo es 3:1 y dentro del cuadrado de la pestaña no se distinguía.
- **Filtros:** un grupo con una sola opción **no se muestra** (por eso `/paletas` no tiene filtro
  de categoría). Los filtros se arman sólo con productos **visibles**.
- **`/paletas` no muestra el panel de filtros** (prop `showFilters={false}` en `CatalogClient`),
  y al final tiene la **guía de compra** (`GuiaPaletas.jsx`).
- **Historia/Política y "Trabajá con nosotros"** son **dos pestañas** al final de la landing: al
  abrir una, el panel ocupa **todo el ancho** debajo.
- **Modelos 3D aleatorios:** la lista está en `MODELOS` (arriba de `Paleta3D.jsx`) y en cada
  carga elige uno al azar. Hoy hay **uno solo**; para sumar, dejar el `.glb` en `public/models/`
  y agregarlo a la lista. ⚠️ Ojo: `page.jsx` precarga `paleta-opt.glb` fijo — al sumar modelos
  hay que revisar ese `<link rel="preload">`.

---

## 5. Reglas de trabajo (leer antes de tocar nada)

### 5.1 Qué NO tocar / NO commitear nunca

- ⚠️ **La rama `datos`** — la escribe el admin (y cada pedido). **Nunca** hacer push a `datos`
  desde una copia local vieja: pisás el stock y los pedidos reales. Ver la excepción en §7.
- ⚠️ **`catalog/products.json`, `catalog/orders.json` y `public/config.json` de `master`** —
  quedaron congelados el 30/09/2026 y no hace falta tocarlos. Editarlos **no cambia nada** en
  la web (los datos vivos están en la rama `datos`).
- ⚠️ **Variables de entorno / secretos** — nunca en el código.

### 5.2 Cómo pushear/deployar SIN romper nada

1. Hacé tus cambios (solo archivos de código/diseño/assets nuevos).
2. **Stageá archivos explícitamente** (ej. `git add src/... public/models/...`). **No** uses
   `git add -A` a ciegas, porque arrastraría `products.json`, imágenes fuente, `lab.html`, etc.
3. Antes de pushear: `git fetch` + `git pull --rebase origin master` (para traer cambios que el
   admin haya hecho en el catálogo y no divergir).
4. `git push origin master`. Vercel buildea y deploya solo en ~1–2 min.
5. Verificá en https://saro.com.ar que quedó bien (hero, catálogo, consola sin errores).

### 5.3 Qué requiere confirmación del dueño (smfab) antes de hacerlo

- Cambiar el **modelo 3D** de la paleta o la lógica de la animación del hero.
- Cambiar precios, textos de marca, número de WhatsApp o la compra mínima (eso lo hace él por el
  admin, no por código).
- Sumar servicios externos nuevos (pagos, envíos, mail, base de datos real).
- Cualquier cosa que toque el flujo de pedidos por WhatsApp.

### 5.4 Archivos locales que NO se deployan (a propósito)

Existen en la carpeta local pero **no** están en git / no van a producción:
- `public/lab.html` — laboratorio para previsualizar animaciones del hero (herramienta interna).
- `public/assets/IMG_6558..6562.jpeg` y `public/assets/paleta-master-face.jpg` — fotos fuente
  de la paleta que se usaron para los intentos de modelo 3D **abandonados** (procedural/escaneo).
  Ya no se usan. No borrarlas apura nada, pero tampoco commitearlas.
- `generate_descriptions.py`, `import_catalog.py`, `index.html.bak`, `orbitron_temp/` — scripts/
  restos locales.
- `preview-vendedores.html` — **maqueta no funcional** del modelo mayorista/minorista con login
  (cuestionario → aprobación → catálogo con precios / catálogo sin precios / vendedores por
  zona). Se abre con doble clic. Es sólo para **evaluar el modelo**, ver §6.
- `scripts/generar-fondo-cancha.mjs` — genera fondos con la API de OpenAI. Lee la key de
  `OPENAI_API_KEY` (en `.env.local`). Se corre con
  `node --env-file=.env.local scripts/generar-fondo-cancha.mjs`.
- `public/assets/fondo-cancha (2).png` — PNG de 25 MB (upscale del fondo). El que se usa es el
  `.webp`; este se puede borrar.

### 5.5 Correr en local

`npm run dev` (Next.js dev en el puerto que asigne). **Nota:** en la máquina de smfab el build
local y el dev server a veces se cuelgan (crashes de los workers de Next por memoria) — **no es
un problema del código**; Vercel buildea sin problemas. Si el dev local se traba, reiniciarlo.

---

## 5.6 El hero de scroll (`/lab-scroll`) — ARCHIVADO (29/09/2026)

Era una segunda versión del hero, en maqueta, en la ruta interna `/lab-scroll`: la paleta
golpea una pelota que cruza la cancha y se convierte en una caja SARO, todo atado al scroll
(GSAP + Three.js), con el club armado por código. **Se descartó por el momento** (smfab: "un
bucle de errores sin fin") y se sacó del sitio. El hero público (`Paleta3D.jsx`) nunca se
reemplazó y sigue igual.

- **Copia completa local:** `archivo/lab-scroll-2026-09/` (código, modelos, imágenes,
  scripts, la documentación técnica original y un `CONTEXTO.md` con cómo retomarla y por qué
  se sintió como un bucle). La carpeta `archivo/` está en `.gitignore`: no se sube.
- **En git:** el último estado publicado es el commit `df6c3e7` (historial en los commits
  `feat(lab)`, `fix(lab)`, `perf(lab)`).
- Quedó del lab, a propósito: la caché de 1 día de `/models/*` en `vercel.json` (acelera las
  visitas repetidas del hero público) y las dependencias `gsap` y `@gsap/react` en
  `package.json` (sin uso; no se incluyen en la página mientras nadie las importe).
- Aprendizajes que sirven para cualquier 3D del sitio (detalle en el archivo): la placa de
  la PC de smfab (Intel integrada, pantalla al 150 %) es el piso de rendimiento; compilar
  shaders antes de mostrar evita congelamientos; lo que se ve en el primer cuadro tiene que
  ser determinístico si hay imagen de portada; y el servidor de desarrollo de esta máquina se
  cuelga si se le borra `.next` con él andando.

---

## 6. Estado actual y pendientes

### ✅ Terminado y en producción (deployado)
- **Videos, segunda tanda (04/10/2026):** zona segura de Reels/TikTok, gancho desde el primer
  cuadro, cortes al ritmo de la música, formato 4:5, textos editables, fotos extra en la Ficha,
  lote de fichas, fondo de fotos a elección, 7 pistas CC0 nuevas, 3 niveles de efectos y 3
  plantillas nuevas (Catálogo express, Comparativa, Revendedores). Ver §8.
- **Pestaña 🎬 Videos del admin** (29/09/2026): plantillas Colección, Ficha y Presentación web
  con Remotion, vista previa en vivo, recorte de fotos para video y MP4 renderizado en GitHub
  Actions. Ver §8.
- **Landing** en `/` (hero 3D con fondo de cancha, catálogos, cómo comprar, números, diseños
  personalizados, historia/trabajá, FAQ) + **catálogos separados** `/paletas` y
  `/ropa-y-accesorios`, con sitemap y canonicals propios.
- **Pivote a minorista:** compra mínima oculta (toggle en admin) y textos visibles sin
  "mayorista". Formulario **"Trabajá con nosotros"** → WhatsApp.
- Hero 3D: fondo de cancha, 4 tipos de golpe (drive/volea/globo/remate) + giro cada 4–6 golpes,
  pelotas que salen de pantalla, canvas full-screen sin recortes, placeholder de carga.
- **Guía de compra de paletas** (desplegable en `/paletas`).
- **Google Analytics 4** + eventos `finalizar_pedido`, `cotizar_envio`, `trabaja_con_nosotros`.
- **Campo peso** por producto en el admin + toggle de compra mínima en Ajustes.
- Rediseño visual completo, seguridad (PIN + rate limiting) y SEO/Schema.org de siempre.
- **Pasada de SEO a minorista (28/09/2026):** títulos, descriptions, OpenGraph, Schema.org,
  `manifest.json` (también `theme_color` → `#2563EB`), textos SEO de los catálogos (según sea
  minorista o mayorista), fichas y alt del logo. "Venta por mayor / Trabajá con nosotros"
  queda como mención secundaria. `/ropa-y-accesorios/mayorista` conserva su SEO mayorista.
- **Regla de paletas:** sólo se publican con `precioMinorista`. Sin él no salen en `/paletas`,
  la ficha redirige, no van al sitemap, ni al feed, ni al chatbot, ni a las sugerencias del
  carrito. Al cargarles el precio desde el admin aparecen solas.
- **Admin → lista de productos:** muestra precio mayorista y minorista ("sin cargar" en ámbar).
- **Encuadre estándar de fotos de paletas** (`src/utils/encuadrePaleta.js`, ver
  `docs/ESTETICA.md` §6): el admin lo aplica al subir fotos con categoría Paleta. Las 13 fotos
  de frente que había se encuadraron con `scripts/encuadrar-paletas.mjs` (archivos
  `*-encuadre.webp`); los 3 primeros planos quedaron como estaban.
- **Links viejos de productos:** la URL sale del nombre; si se renombra un producto, el link
  viejo redirige al nuevo (`findBySlug` busca por el final del id).
- **Catálogo corregido (28/09/2026):** typos en nombres y descripciones, "pala" → "paleta",
  tildes, 6 productos que no tenían categoría, descripción de Vortice X (era de indumentaria).
- **Datos fuera de `master` (30/09/2026):** catálogo, ajustes, pedidos y fotos nuevas pasaron a
  la rama `datos` (§2.2). Publicar, subir una foto, cambiar un ajuste o recibir un pedido ya
  **no dispara deploys**; los cambios se ven en segundos.
- **Nombre del cliente en el pedido (30/09/2026):** al tocar "Enviar pedido por WhatsApp" o
  "Copiar texto del pedido", el pie del carrito pide **nombre y apellido** (obligatorios) y
  los pone arriba del mensaje (`👤 *Nombre Apellido*`). Se recuerdan en el navegador del
  cliente (`localStorage`, clave `saro_cliente`). ⚠️ **No** se mandan a `/api/track-order`
  a propósito: `orders.json` vive en un repo público.

- **SEO + Analytics (01/10/2026):** `/sitemap.xml` era un archivo viejo con 1 sola página;
  ahora es el sitemap dinámico (todas las páginas + fotos). La portada tiene su `<h1>` real
  (el titular del hero) y se sacó el `<h1>` del `<noscript>` que duplicaba títulos en todas
  las páginas. Fichas con datos estructurados completos (url, sku, fotos, condición nueva) +
  "miga de pan" (`BreadcrumbList`). GA4 ya no mide el admin ni al equipo (`?no-medir=1`), y
  el pedido manda además `begin_checkout` con los productos (embudo de compras de GA4).

### 🟡 Pendiente / a decidir con el dueño
- **Google Analytics / Search Console (hecho el 02/10/2026):** `finalizar_pedido` es evento
  clave, retención de datos en 14 meses y Search Console vinculado con GA4. En Search Console
  el sitemap ya estaba (`/api/sitemap`, 50 páginas); se pidió "Validar corrección" de 23
  fichas que daban **error 5xx** a Googlebot (viejos: hoy responden bien) y la indexación de
  `/`, `/paletas` y `/ropa-y-accesorios`. Al 01/10/2026 Google tenía **sólo 3 de 60 páginas
  indexadas**: revisar en unas semanas (Search Console → Páginas). **Falta:** marcar
  `trabaja_con_nosotros` con la estrella en GA4 → Administrar → Eventos cuando aparezca
  (GA4 sólo deja marcar eventos que ya llegaron), y entrar una vez a
  `saro.com.ar/?no-medir=1` desde cada navegador propio (PC y celular).
- **Redes sociales en Schema.org:** falta poner los links de Instagram/Facebook de SARO en
  `sameAs` del bloque `Organization` (`layout.jsx`) para que Google los asocie a la marca.
- **Publicidad (Meta/Google):** feed, Pixel de Meta, eventos y pestaña **📣 Publicidad** del admin
  ya hechos (ver **`docs/PUBLICIDAD.md`**). Falta que smfab cree la cuenta comercial de Meta y
  cargue `NEXT_PUBLIC_META_PIXEL_ID` en Vercel. Sólo salen en anuncios los productos con
  **precio minorista** (9 de 50 al 21/09/2026).
- **Cotizador de envío:** código listo pero **inactivo**. Falta que smfab **pida las credenciales
  de API a un ejecutivo comercial de Correo Argentino** y las cargue en `.env.local` + Vercel
  (§2.9). Entrada: https://www.correoargentino.com.ar/MiCorreo/public/primeros-pasos
- **Cargar el peso de los productos** desde el admin (las paletas ≈ 400 g). Sin peso, el
  cotizador asume 400 g por producto.
- **5 paletas sin precio minorista** (Saro MAX Carbono 12k, SR Junior, Nexus woman, Radian Pro
  Carbono, MAX 3.0 Carbono): no se publican hasta que smfab les cargue el precio en el admin.
- **Vortice X:** la descripción nueva sólo dice lo que se ve en la foto (caras de carbono 12K).
  Falta confirmar forma, balance y nivel de juego para completarla.
- **"TUBO PELOTAS x2 NOVA"** no tiene descripción y parece repetido con "Pelotas Nova Padel Pro".
- **Email `@saro.com.ar` (Zoho, plan gratis):** DNS completo en Vercel (01/10/2026): MX,
  verificación, **SPF** (`v=spf1 include:zohomail.com ~all`), **DKIM** (selector `zmail`) y
  **DMARC** (`p=none`, reportes a `administracion@`). Las casillas ya están creadas
  (01/10/2026); los nombres y alias los va ajustando smfab desde mailadmin.zoho.com. La cuenta
  admin `smfabiani11` no se borra (es la dueña de la organización). El plan gratis permite
  **5 usuarios** (los alias no cuentan) y **no tiene IMAP/POP**: se lee en mail.zoho.com o en
  la app Zoho Mail. ⚠️ Si se renombra o borra `administracion@`, actualizar el `rua=` del
  registro `_dmarc` en Vercel. Pendiente: pasar DMARC a `p=quarantine` cuando el envío ande
  bien unas semanas.
- **Modelos 3D extra:** smfab va a pasar 2–3 `.glb` más para que el hero rote entre ellos (§4.3).
- **Opiniones de clientes:** propuesto un carrusel administrable + botón "Dejá tu opinión en
  Google" (falta el link de la ficha). Traer reseñas automáticas de Google requiere Places API
  (con costo y límites) — se descartó por ahora.
- **Modelo mayorista con login** (cuestionario → aprobación → catálogo con precios, catálogo
  minorista sin precios, vendedores por zona): **en evaluación**, maqueta en
  `preview-vendedores.html`. ⚠️ Requeriría **base de datos real + autenticación** (hoy no hay
  ninguna de las dos) y define un **conflicto de canal** (fábrica vs. revendedores) a resolver.

- **Videos (§8):** en producción desde el 29/09/2026 y probado con dos renders reales en la
  Action. Falta que smfab le dé al token de GitHub el permiso **Actions: Read and write** (o
  cargue `GITHUB_VIDEOS_TOKEN` en Vercel): hasta entonces "Generar MP4" muestra el aviso de
  permisos. Y **confirmar la licencia de Remotion**: es gratis para empresas de hasta 3
  personas; si SARO tiene más, necesita la licencia de empresa (https://www.remotion.pro).
  **Pendiente de confirmar.**

### 🔮 Ideas a futuro (no pedidas aún)
Si algún día se quiere vender con pago online, gestionar stock de verdad o mandar mails, ahí sí
haría falta sumar una **base de datos real** y una **pasarela de pagos** — es un cambio grande y
aparte del modelo actual (catálogo + WhatsApp).

---

## 6.1 Handoff: publicidad de productos (septiembre 2026)

**Objetivo actual:** promocionar productos minoristas de SARO en Meta Ads
(Instagram/Facebook) y, más adelante, Google Ads. El checkout sigue siendo
WhatsApp: no hay pagos online ni compras confirmadas automáticamente.

**Qué quedó implementado:**

- `GET /feed.xml` genera un RSS válido para Meta Commerce Manager y Google
  Merchant Center a partir del catálogo publicado (rama `datos`).
- La regla del feed vive en `src/utils/feed.js`, y se reutiliza en
  `src/components/admin/PublicidadPanel.jsx` para que el admin y las plataformas
  muestren exactamente la misma selección.
- Sólo entran productos visibles, con foto, `precioMinorista > 0` y sin
  `publicitar: false`. El feed usa ese precio minorista y la misma URL pública
  `/producto/[slug]`; no se deben usar precios mayoristas en anuncios B2C.
- En `/admin` hay una pestaña **📣 Publicidad** y el toggle **Publicitar este
  producto** en su formulario. Prendido es el valor por defecto; el campo sólo
  se guarda cuando se apaga. El admin publica cambios por su flujo normal,
  nunca editar `products.json` a mano.
- `src/components/MetaPixel.jsx` carga Meta Pixel sólo cuando existe la variable
  de Vercel `NEXT_PUBLIC_META_PIXEL_ID`. Excluye `/admin` y `/lab*`. Mientras
  la variable no esté configurada, el sitio se comporta igual y no mide Meta.
- Los eventos Meta son: `ViewContent` (ficha/modal), `AddToCart`,
  `InitiateCheckout` (pedido enviado a WhatsApp), `Contact` (consultas) y
  `Lead` (formulario Trabajá con nosotros). Los IDs son el `product.id` y deben
  permanecer iguales a `g:id` del feed para el remarketing dinámico.
- `InitiateCheckout` es intencional: abrir WhatsApp no confirma una venta, por
  lo que **no** se debe enviar `Purchase` hasta tener una confirmación real.

**Pendiente de cuenta (lo realiza el dueño):** crear/configurar Meta Business,
Pixel y catálogo; cargar el ID del Pixel en Vercel; verificar `saro.com.ar`; y
cargar `https://saro.com.ar/feed.xml` como feed programado. Google Merchant y
Google Ads se conectan después con el mismo feed. No poner IDs, tokens ni
secretos en código o Git.

**Validación realizada:** `npm run check:orden` y
`npx next build --experimental-build-mode compile` pasaron; este último listó
la ruta dinámica `/feed.xml`. El build local completo puede colgarse por la
limitación ya documentada en §5.5.

**Estado Git al retomar:** el commit de publicidad se publicó como `606edb9`
en `origin/master`, integrado encima de la configuración remota. La carpeta
principal conserva cambios sin guardar del hero y de esta documentación; por
eso su rama local puede quedar detrás de `origin/master`. **No hacer `pull`,
`rebase`, `reset` ni `stash` a ciegas**: primero preservar/confirmar esos
cambios del hero. Si se necesita trabajar sólo en publicidad, partir de
`origin/master` en un worktree limpio.

---

## 7. Instrucciones para Claude (o quien retome)

- Respondé siempre en **español rioplatense** (Argentina), y para alguien que **no programa**.
- Antes de tocar el catálogo/stock/pedidos: releé §5. **Los datos vivos están en la rama
  `datos`** (§2.2). Si hay que cargar datos (pesos, precios, stock), **lo hace smfab desde
  `/admin`** — no editarlos desde el código. **Excepción** (sólo si smfab la pide, como las
  correcciones del 28/09/2026): un script de parche que cambia campos puntuales y verifica que
  el valor original siga igual, corrido sobre la versión fresca de la rama `datos`
  (`git fetch origin datos`) y pusheado a `datos` enseguida. **No dispara deploy.** Como la
  web guarda la lectura en caché, el cambio se ve a los 5 min como mucho (o al instante si
  después se publica algo desde el admin). Si el push choca, alguien guardó en el medio:
  volver a bajar la rama y rehacer el parche, nunca forzar.
- **Deshacer un cambio de datos:** cada guardado es un commit en la rama `datos`. Para volver
  atrás, un commit nuevo en `datos` que restaure la versión anterior del archivo (nunca
  reescribir la historia de esa rama).
- Antes de tocar el hero 3D: leé §4.1 y §4.3 y `docs/ESTETICA.md`. Es lo más delicado del proyecto.
- Para cualquier cambio visual, respetá la paleta y convenciones de §3 y `docs/ESTETICA.md`.
- Deploy = push a `master` (con el cuidado de §5.2). No hay otro paso.
- **Verificación:** el visor de preview se cuelga con el hero 3D (WebGL) y el `next build` local
  a veces crashea por memoria (§5.5). Lo confiable es: `npx next build` (si compila y pasa tipos,
  Vercel lo buildea) + `curl` al dev server para chequear el HTML. Vercel es la verificación real.
- **Secretos:** nunca pedirle al usuario que pegue credenciales en el chat. Van en `.env.local` /
  Vercel; el código las lee del entorno (así se hizo con OpenAI y MiCorreo).

---

## 8. Videos del admin (pestaña 🎬 Videos, septiembre 2026; ampliada el 04/10/2026)

Genera videos promocionales de los productos con **Remotion**: se eligen plantilla, formato,
productos, música, nivel de efectos, fondo de las fotos y textos; se ve una vista previa en
vivo y se genera el MP4 (o un lote de MP4) para descargar.

### 8.1 Cómo se usa (para smfab)

1. `/admin` → pestaña **🎬 Videos**.
2. Elegí la plantilla:
   - **Colección** (1 a 8 paletas, ~20–30 s): gancho con la paleta 3D, una escena por paleta,
     la línea, "por qué SARO" y el cierre.
   - **Ficha** (1 producto, ~7–10 s; con "Una ficha por producto (lote)" genera hasta 8 MP4 de
     una vez). Si el producto tiene más fotos, suma la escena "En detalle".
   - **Catálogo express** (3 a 12 productos de cualquier categoría): un producto por golpe de
     la música, cortes secos.
   - **Comparativa** (2–3 paletas): tabla con forma, balance, caras, núcleo, juego, nivel, peso
     y precio. Sólo filas que alguna ficha dice; el dato que falta va "—".
   - **Revendedores** (1–6 productos, **sin precios**): para tiendas y clubes, termina en
     "Trabajá con nosotros". Pensada para prospección mayorista.
   - **Presentación web** (16:9, recorrido por la web; los 1–2 productos arman el WhatsApp).
3. Formato: **Vertical 9:16** (Reels, Historias, TikTok) o **Feed 4:5** (publicación y anuncios
   del feed). La web sólo viene en 16:9.
4. Música (9 pistas + sin música), **efectos de sonido** (Sin efectos / Suaves / Medios /
   Intensos), **fotos de producto** (Sin fondo / Con fondo blanco) y **textos** (etiqueta,
   frase gancho, frase de cierre; vacío = el de fábrica, que se ve en gris).
5. Tildá los productos (el número indica el orden) y mirá la vista previa. Los precios son los
   del público (`precioMinorista`). La casilla **"Mostrar lo que tapan Instagram y TikTok"**
   sombrea en rojo esa zona (sólo en la vista previa, no sale en el MP4).
6. **"Generar MP4"** → en unos minutos aparece **"Descargar MP4"** en "Videos de esta sesión"
   (en un lote, un botón por ficha).
   - **✨ Sugerir con IA** (al lado de "Textos"): Gemini propone 3 juegos de textos (se usan con
     un clic), el texto de la publicación con hashtags (botón Copiar) y avisos sobre nombres.
   - **🔍 Revisar con IA** (en cada video terminado): Gemini mira el MP4 (~30 s) y da un
     veredicto, los problemas con el segundo en que aparecen y, si conviene, textos mejores
     ("Aplicar textos sugeridos" los carga y hay que generar de nuevo).
7. Para "Sin fondo": **"Preparar foto para video"** en cada producto (o **"Recortar las que
   faltan"**, que hace todas las elegidas de a una). Saca el fondo de la foto con IA (en el
   navegador, gratis) y la guarda aparte; así el producto flota sobre el fondo del video. El que
   no la tiene sale en tarjeta blanca igual. **Después hay que tocar "Publicar en sitio"** para
   que quede guardada.

Sólo se pueden elegir productos **visibles, con foto y con precio minorista** (los mismos que ve
el público). Los avisos en ámbar (sin foto recortada, sin descripción, descripción que parece de
ropa) no impiden generar el video.

### 8.2 Arquitectura

| Pieza | Dónde |
|---|---|
| Plantillas (JSX, datos sólo por props) | `src/videos/Coleccion.jsx`, `Ficha.jsx`, `Ritmo.jsx` (Catálogo express), `Comparativa.jsx`, `Revendedores.jsx`, `Web.jsx` |
| Escenas compartidas (gancho 3D, producto, galería, línea, beneficios, cierre) con sus efectos | `src/videos/escenas.jsx` |
| Piezas comunes: zona segura (`useMarco`), guía de zonas, `Lienzo`, `Estudio`, fotos | `src/videos/comun.jsx`, `Paleta3D.jsx` |
| Música, efectos y niveles | `src/videos/audio.jsx` |
| Cortes al ritmo de la música | `src/videos/pulso.js` (⚠️ no `ritmo.js`: en Windows choca con `Ritmo.jsx`) |
| Textos de fábrica y editables | `src/videos/textos.js` |
| Gemini: sugerir textos y revisar el MP4 | `src/utils/videosGemini.js` + `src/app/api/videos/sugerir`, `revisar` |
| Catálogo de plantillas, formatos, músicas, niveles de efectos y fondos + validación del pedido (sin React: lo usan la API y el workflow) | `src/videos/catalogo.js` |
| Componente y duración de cada plantilla | `src/videos/plantillas.js` |
| Cómo se arman las props | `src/videos/props.js` |
| Reglas de specs / nivel / enfoque / avisos (fuente única, "nada inventado") | `src/utils/videoProductos.js` |
| Pestaña del admin | `src/components/admin/VideosPanel.jsx` |
| Vista previa (`@remotion/player` con `next/dynamic`: no suma nada a las páginas públicas) | `src/components/admin/VistaPreviaVideo.jsx` |
| Recorte de fondo para video | `src/utils/recorteVideo.js` |
| API (`render`, `estado`, `descargar`, todas con PIN) | `src/app/api/videos/*` + helper `src/utils/videosGithub.js` |
| Render del MP4 | `.github/workflows/render-video.yml` (GitHub Actions) → `scripts/videos/renderizar.mjs` (uno o un lote) |
| Herramientas | `scripts/videos/cuadros.mjs` (PNG de cuadros sueltos con la guía, `npm run videos:cuadros`), `analizar-musica.py` (pulso/arranque/ganancia de una pista), `generar-sfx.py` (efectos) |
| Entrada del CLI de Remotion + config | `src/videos/remotion/index.jsx`, `remotion.config.js` |
| Assets (música, efectos, fuente, capturas) | `public/videos/` — licencias en `public/videos/LICENCIAS.md` |

**Flujo del render:** el admin arma las props con los productos elegidos → `POST
/api/videos/render` valida (misma regla que el workflow) y dispara el workflow con
`workflow_dispatch` (inputs: plantilla, props en JSON y un `request_id` tipo
`coleccion-20260929-1530-k3x9`, que va en el nombre de la ejecución) → la Action renderiza con
`--gl=swangle` (WebGL por software, para la paleta 3D) y sube el MP4 al release **`videos-admin`**
→ el admin consulta `/api/videos/estado` cada 10 s y, cuando está listo, `/api/videos/descargar`
le da el link.

**Por qué un release y no un artifact ni un commit:**
- **Nunca a `master`:** cada commit a master dispara `deploy.yml` y un deploy a producción.
- El repo es **público**: los artifacts de una Action tampoco son privados (cualquier usuario de
  GitHub logueado los baja), así que no suman privacidad. Y vienen en `.zip`.
- Un asset de release se baja directo como `.mp4` sin pasar por Vercel (sus funciones responden
  hasta 4,5 MB; un video pesa 5–25 MB). El workflow deja sólo los **últimos 40** (un lote cuenta
  uno por ficha: `<request_id>-1.mp4`, `-2.mp4`…).
- Ojo: al ser público el repo, **los MP4 también lo son** (quien conozca el link o mire el
  release). Son videos promocionales, pensados para publicarse.

**Otras decisiones:**
- `concurrency: render-video` → un render a la vez. El panel no deja pedir otro mientras hay
  uno en curso (GitHub sólo guarda uno en espera y cancela el anterior).
- `timeout-minutes: 40` en la Action; el panel da el render por perdido a los 50 min, o a los
  5 min si GitHub ni lo empezó. Un lote de fichas va en **un solo** render (si fueran varios,
  GitHub cancelaría los que esperan): ~1 min por ficha más la preparación.
- Las entradas del workflow se pasan por variables de entorno y se validan
  (`scripts/videos/validar-pedido.mjs`) antes de usarlas: nunca se pegan en un script.
- Remotion copia su carpeta pública entera en cada render. `public/` pesa cientos de MB, así
  que el render usa `.remotion-public/` (sólo `videos/`, el `.glb` y el logo), que arma
  `scripts/videos/preparar-public.mjs` con las **mismas rutas** que `public/`: así
  `staticFile()` apunta a lo mismo en el admin y en el render.
- **Preflight de Tailwind:** el admin carga Tailwind (`img { max-width: 100% }`, interlineado
  1.5, `box-sizing`), que comprimía las paletas de costado. `Lienzo` (en `comun.jsx`) lo
  neutraliza sólo dentro del video, y toda foto de producto va en una caja fija con
  `object-fit: contain`. Medido: la proporción dibujada es igual a la original en la vista
  previa y en el MP4.
- Cada efecto de sonido tiene un largo acotado (`LARGO` en `audio.jsx`); sin eso quedaban
  montados hasta el final. El Player tiene `numberOfSharedAudioTags={14}` (de fábrica son 5 y
  con efectos intensos no alcanzaban).
- **Niveles de efectos:** cada efecto dice desde qué nivel suena (`nivel` en la lista de
  golpes). "Suaves" = el criterio acordado en septiembre (whoosh en transiciones, golpe grave
  en logo y cierre; en la web clic y "enviado"); "Medios" suma pop en specs y tarjetas, swoosh
  en títulos y campanita en el precio; "Intensos" suma golpes de pelota, un golpe en el precio y
  la subida (riser) antes del cierre. Pico medido con intensos: 0,54.
- **El precio entra con un "pop", sin contar desde $0:** contando, una pausa mostraba un precio
  falso ($80.000 para una paleta de $190.000). Lo marcó dos veces la revisión de Gemini.
- **Gemini (`videosGemini.js`):** `gemini-2.5-flash`, respuesta en JSON con esquema. Sólo recibe
  los datos reales de los productos y, además de pedírselo, el servidor **descarta** textos con
  números que no estén en esos datos, que se pasen del máximo o (el cierre) que repitan la
  dirección. Para revisar, el servidor baja el MP4 del release y lo sube a la API de archivos
  de Gemini (lo borra al terminar): el video no pasa por el navegador. Usa `GEMINI_API_KEY`.
  Medido el 04/10/2026: sugerir ~3 s, revisar un MP4 de 10 MB ~15 s.
- **Zona segura:** textos y precios van dentro de `useMarco().S`. En 9:16 es la guía de anuncios
  de Reels de Meta (libre el 14 % de arriba, el 35 % de abajo y el 6 % de los costados); en 4:5,
  márgenes del 5–6 %. Fuera de la zona sólo hay foto o decoración.
- **Gancho:** lo primero que se lee aparece desde el cuadro 0 (en Ficha la escena arranca "ya
  empezada", `adelanto`), porque el primer segundo decide si la gente sigue mirando.
- **Cortes al ritmo:** cada pista de `MUSICAS` tiene `bpm` (pulso de los golpes fuertes) y
  `desde` (arranca justo sobre uno). `alinearAlRitmo` mueve cada cambio de escena al golpe más
  cercano (desvío medido < 0,5 cuadro). `ganancia` iguala el volumen entre pistas. Medido con
  `scripts/videos/analizar-musica.py`; en pistas de ritmo ambiguo (Parallel Universe) hay que
  comparar candidatos y escuchar.
- La fuente Inter está en el repo (`public/videos/fuentes`): Google Fonts fallaba por red en el
  render.
- El repo es `"type": "module"`: `remotion.config.js` le dice a webpack que no exija la
  extensión en los imports (Next no la pide).

### 8.3 Campo nuevo del producto: `imagenVideo` (opcional)

Con "Con fondo blanco" se ignora y va siempre la foto original en tarjeta
(`productoVideo(p, fondo)` en `src/utils/videoProductos.js`).

- `imagenVideo`: URL de la foto **sin fondo** (WebP con transparencia) que genera "Preparar foto
  para video". Si no existe, el video usa la primera foto del producto sobre una tarjeta blanca.
- `imagenVideoOrigen`: la foto de la que salió. Si después cambia la foto principal, el admin
  avisa "Cambió la foto del producto: prepará de nuevo la del video".
- Se guardan con "Publicar en sitio", como cualquier cambio del admin. No se usan en la web
  pública ni en el feed de publicidad.
- La foto se sube con `/api/upload-image` (el mismo mecanismo que las fotos de producto): va a
  `fotos/` de la rama `datos` y **no dispara deploy**.

### 8.4 Variables y permisos del token

- Usa `GITHUB_TOKEN`, `GITHUB_OWNER` y `GITHUB_REPO` (los de siempre), o `GITHUB_VIDEOS_TOKEN`
  si está cargado.
- El token es *fine-grained* y hoy **no puede disparar workflows** (verificado: 403). Hay que
  darle **Repository permissions → Actions: Read and write** (GitHub → Settings → Developer
  settings → Fine-grained tokens → el token del sitio), o crear uno nuevo con ese permiso (y
  Contents: Read) y cargarlo en Vercel como `GITHUB_VIDEOS_TOKEN`. Sin eso, "Generar MP4"
  muestra ese mismo mensaje.
- El workflow usa el token propio de la Action (`permissions: contents: write`) para crear el
  release y subir el MP4: no necesita secretos.

### 8.5 Costos

- **GitHub Actions es gratis para repos públicos** (runners estándar, sin límite de minutos). Un
  render tarda: Colección de 5 paletas ~9 min (8 de render), Ficha ~2 min (medido el 29/09/2026). Si el repo pasara a privado, el
  plan gratis trae 2.000 min/mes.
- **Licencia de Remotion:** gratis para empresas de hasta 3 personas. Si SARO tiene más,
  necesita la licencia de empresa (https://www.remotion.pro). **Pendiente de confirmar** (§6).

### 8.6 Cómo agregar una plantilla nueva

1. Crear `src/videos/MiPlantilla.jsx`: un componente que recibe `{ productos, musica, efectos,
   formato, textos, guia }`, envuelto en `<Lienzo guia={guia}>`, y una función
   `duracionMiPlantilla(props)` que devuelve los cuadros. Reusar las escenas de `escenas.jsx`;
   textos y precios siempre dentro de `useMarco().S`; fotos con `ImgProducto` / `PaletaFlotante`.
   Duraciones pasadas por `alinearAlRitmo` y efectos con `<Efectos golpes elegido={efectos}>`.
2. Sumarla en `src/videos/catalogo.js` (`PLANTILLAS_META`: id, slug (sólo letras), nombre,
   formatos, fps, min/max, soloPaletas, música por defecto y campos de `textos`), en
   `src/videos/plantillas.js` y su texto de fábrica en `textos.js`.
3. Si necesita datos extra, agregarlos en `armarProps` (`src/videos/props.js`).
4. Probar: `npm run videos:cuadros -- carpeta '[["MiPlantilla","vertical",[0,60,-30]]]'`
   (PNG con la guía de zonas), `npm run videos:studio` y
   `npm run videos:render -- MiPlantilla out/prueba.mp4 --gl=angle` (en Windows `angle`; en la
   Action `swangle`).

El admin, la API y el workflow la toman solos.
