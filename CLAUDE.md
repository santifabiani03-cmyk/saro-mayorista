# SARO Mayorista — Documentación del proyecto

> **Leé esto primero.** Este archivo es el mapa completo del proyecto. Está escrito para
> que cualquier persona (o una sesión nueva de Claude) arranque de cero sin tener que releer
> chats viejos ni preguntar nada. Prioriza ser exhaustivo. Si algo cambia, actualizá este
> archivo y `docs/ESTETICA.md`.

Última actualización: 2026-08-26.

> ⚠️ **Cambio importante (agosto 2026): el sitio pasó de MAYORISTA a MINORISTA.**
> La compra mínima está **oculta** (con un interruptor en el admin para volver a mostrarla) y
> los textos visibles ya no dicen "mayorista". Quien quiera comprar por mayor entra por la
> sección **"Trabajá con nosotros"**. El **SEO/metadata todavía dice "Mayorista"** a propósito:
> es una pasada pendiente (ver §6). El repo y el dominio siguen llamándose `saro-mayorista`.

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
| Analytics | @vercel/analytics + @vercel/speed-insights + **Google Analytics 4** (`G-WSMCJDHZWH`, en `layout.jsx` con `next/script`) |
| Envíos | **API MiCorreo** (Correo Argentino) para cotizar — ver §2.10 |

No hay backend propio ni servidor aparte: todo corre dentro de Next.js sobre Vercel.

### 2.2 "Base de datos" = archivos JSON en GitHub

**No hay base de datos tradicional** (ni SQL ni nada). Los datos viven en **dos archivos de
texto dentro del repo de GitHub**, y GitHub hace de base de datos:

| Archivo | Qué guarda | Rol |
|---|---|---|
| `catalog/products.json` | Todos los productos: nombre, precio, descripción, categoría, colores, talles, stock, fotos, promos | La "tabla" de productos / catálogo / stock |
| `catalog/orders.json` | Registro de los pedidos que se enviaron por WhatsApp | La "tabla" de pedidos (solo estadística) |

Las **fotos de producto** también viven en GitHub (`public/assets/`) y se sirven por links
directos tipo `https://raw.githubusercontent.com/santifabiani03-cmyk/saro-mayorista/master/public/assets/...webp`.

### 2.3 Cómo se lee y se publica (el flujo de datos)

- **Lectura (tienda pública):** las páginas de catálogo (`/paletas` y `/ropa-y-accesorios`) leen
  `catalog/products.json` del disco al construir la página y se refrescan solas cada 60 segundos
  (ISR: `export const revalidate = 60`). La home (`/`) es la **landing** y lee el mismo JSON solo
  para los contadores. También existe la API `/api/catalog` que devuelve el JSON.

**Rutas públicas (actualizado):** `/` = landing de entrada (hero 3D + secciones de scroll +
FAQ). Desde ahí se entra a **dos catálogos separados**: `/paletas` (solo paletas) y
`/ropa-y-accesorios` (todo lo que no es paleta: accesorios de pádel + ropa). `/producto/[slug]`
= ficha (su botón "volver" apunta al catálogo según la categoría). ⚠️ `/catalogo` **ya existía**
antes y redirige a un catálogo externo (`catalogo.saro.com.ar`) — NO es la grilla interna, no
tocar. El sitemap lista `/`, `/paletas`, `/ropa-y-accesorios` y los productos.
- **Escritura (admin):** cuando en el panel `/admin` editás productos y tocás **"Publicar en
  sitio"**, la web llama a `/api/publish`, que **escribe el `products.json` actualizado
  directamente en GitHub** usando un token de acceso (`GITHUB_TOKEN`). Vercel detecta el cambio
  en GitHub y reconstruye la web sola.
- **Pedidos:** cuando un cliente manda el pedido, además de abrir WhatsApp, se llama a
  `/api/track-order` que **agrega el pedido a `catalog/orders.json` en GitHub** (para la sección
  "Demanda" del admin). Es un registro, no un sistema de gestión.
- **Publicar tiene "merge" de 3 vías:** `/api/publish` hace un merge para que si dos personas
  editan a la vez no se pisen los cambios (ver `src/app/api/publish/route.js`).

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
│   ├── products.json         ← catálogo + stock (la "base de datos")  ⚠️ NO TOCAR a mano
│   └── orders.json           ← registro de pedidos                    ⚠️ NO TOCAR a mano
├── public/
│   ├── config.json           ← config de la tienda (ver abajo)        ⚠️ lo maneja el admin
│   ├── manifest.json         ← metadatos PWA (íconos, nombre)
│   ├── favicon.png           ← "chip" navy con el logo blanco (ícono de pestaña)
│   ├── models/paleta-opt.glb ← modelo 3D de la paleta (hero) — la lista está en Paleta3D.jsx
│   └── assets/               ← logos + fondo-cancha.webp + saro-wordmark.png + fotos de producto
├── src/
│   ├── app/
│   │   ├── layout.jsx        ← <head>, fuentes, SEO, Analytics (Vercel + Google Analytics)
│   │   ├── globals.css       ← estilos globales + animaciones del hero
│   │   ├── (shop)/           ← LA TIENDA PÚBLICA (grupo de rutas)
│   │   │   ├── layout.jsx    ← lee public/config.json y envuelve la tienda
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
│   │   └── admin/            ← ProductForm, ProductList, SettingsPanel, etc.
│   ├── views/AdminPage.jsx   ← el panel admin completo (pestañas)
│   └── utils/                ← helpers (colores, slug, export PDF, envio.js, analytics.js…)
├── package.json, next.config.mjs, tailwind.config.js, vercel.json
└── (archivos locales que NO se deployan: lab.html, IMG_*.jpeg, .py, preview-vendedores.html,
    scripts/ — ver §5.4)
```

### 2.6 Las rutas de API (qué hace cada una)

Todas están en `src/app/api/<nombre>/route.js`:

| Ruta | Método | Qué hace | Pide PIN |
|---|---|---|---|
| `/api/catalog` | GET | Devuelve el catálogo (`products.json`) | No |
| `/api/publish` | POST | Guarda el catálogo editado en GitHub (con merge) | Sí |
| `/api/track-order` | POST | Registra un pedido en `orders.json` | No (rate limit) |
| `/api/orders` | GET | Devuelve los pedidos (para la demanda del admin) | Sí (en query) |
| `/api/verify-pin` | POST | Valida el PIN del admin (con anti–fuerza bruta) | — |
| `/api/upload-image` | POST | Sube una foto de producto a GitHub | Sí |
| `/api/upload-catalog`| POST | Sube el PDF del catálogo | Sí |
| `/api/generate-description` | POST | IA (Gemini): genera descripción de producto | Sí |
| `/api/generate-image` | POST | IA (Gemini): genera imagen de escena del producto | Sí |
| `/api/update-config` | POST | Guarda `config.json` (compra mínima, teléfono) en GitHub | Sí |
| `/api/sitemap` | GET | Genera el sitemap XML para Google | No |
| `/api/cotizar-envio` | POST | Cotiza el envío con la **API MiCorreo** (CP + peso → precio a domicilio y a sucursal). Ver §2.10 | No |

### 2.7 `public/config.json` (configuración de la tienda)

Es un archivo chico con la config editable desde el admin (pestaña **⚙️ Ajustes**):

```json
{
  "storeName": "SARO Mayorista",
  "whatsappNumber": "5491123208058",   ← número donde caen los pedidos
  "minPurchase": 150000,               ← mínimo real (barra de progreso del carrito)
  "suggestedMinPurchase": 150000,      ← el que se muestra como "compra mín. sugerida"
  "mostrarCompraMinima": false,        ← ⭐ interruptor mayorista/minorista (ver abajo)
  "currency": "ARS"
}
```

⭐ **`mostrarCompraMinima`** es el interruptor que decide si el sitio se comporta como
**minorista** (`false`, como está hoy) o **mayorista** (`true`). Cuando está en `false` se
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
  imágenes). Hay variantes `NEXT_PUBLIC_GITHUB_*` para uso en el navegador.
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

- ⚠️ **`catalog/products.json` y `catalog/orders.json`** — los edita el admin escribiendo
  DIRECTO en GitHub. Tu copia local casi siempre está **vieja**. Si los commiteás, **pisás el
  stock y los pedidos reales**. Nunca los agregues a un commit.
- ⚠️ **`public/config.json`** — lo maneja el admin (pestaña Ajustes). Mismo riesgo.
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

## 5.6 El hero de scroll (`/lab-scroll`) — maqueta en curso

Una segunda versión del hero, **todavía en maqueta**, en la ruta interna
`/lab-scroll` (no indexada, no enlazada). El hero que está en producción sigue
siendo el de `Paleta3D.jsx`; este NO lo reemplazó todavía.

**El guion**, todo atado al scroll con GSAP ScrollTrigger (`scrub`):
la paleta espera → la pelota entra de costado → el golpe → la pelota cruza la
red y pica del otro lado → la cámara gira 90° siguiéndola → la pelota **se
transforma en una caja de envío** → la caja se apoya.

**Cómo está armado** (`src/app/lab-scroll/ScrollLab.jsx`):

- **Un solo número une todo.** GSAP anima `progRef.current.t` de 0 a 1 y Three
  lo lee en cada cuadro. Nada más se comunica entre las dos librerías.
- **El tiempo de vuelo avanza LINEAL con el scroll.** Con suavizado, la pelota
  parece frenar y acelerar sola.
- **La transformación es geométrica, no un cruce entre dos objetos.** Los
  vértices de la esfera viajan hasta la cara del cubo (`d / mayor componente`).
  Como las esquinas del cubo quedan más lejos del centro que la superficie de la
  esfera, la pelota **nunca se achica**: se expande hasta volverse caja.
- **Escala real.** 1 unidad ≈ 15,5 cm. La cancha mide 129 × 65 (20 × 10 m) y la
  red 5,67 (88 cm). Cuando la red medía 1,5 el pique no se leía como pádel.

**Trampas que ya costaron caro** (no repetirlas):

| Síntoma | Causa |
|---|---|
| La pelota atraviesa la paleta | Viajaba al **centro** del modelo; debe frenar en la **cara** (medio grosor + radio de la pelota) |
| Le pega con el borde | El modelo se centra por su caja, que incluye el mango. El código busca la cara midiendo dónde es más **ancho** |
| La paleta no llega a tiempo | La cara pasa por el impacto en un instante exacto; la pelota tiene que usar **ese mismo** momento |
| La caja se hunde en el piso | Una esfera apoya a R mire como mire, pero un **cubo rotado** apoya en una esquina, hasta 1,73·R |
| El césped no se veía | El piso celeste medía 240×240 (37 m): siete veces una cancha. Tapaba todo el terreno |

**Assets 3D y Meshy.** Patrón confirmado con seis modelos: Meshy **rinde en
objetos compactos y orgánicos** (mano, caja y árbol funcionaron, con reducciones
de 41×, 58× y 30×) y **no rinde en escenarios grandes** — reconstruye la escena
como una sola malla con UVs fragmentadas en miles de retazos, y ahí la textura
**no se puede reducir sin destruirla**. La cancha (2 M de caras, textura de
8192px) y la red (280 k caras) se descartaron por eso. La paleta nueva llegó
**sin texturas**, así que tampoco reemplazó a la actual.

Antes de adoptar un modelo conviene mirar **la textura**: si es un atlas de
retazos sin estructura, no se va a poder optimizar.

**Cómo verificar la escena.** El componente expone `window.__lab` en desarrollo:
`ver(t)` dibuja un cuadro puntual del guion sin depender del scroll, y
`vistaGeneral(t)` encuadra toda la escena y cuenta mallas. El renderer usa
`preserveDrawingBuffer: true` para poder leer el cuadro dibujado. Con eso
aparecieron en minutos errores que a ciegas costaron horas.

⚠️ La pestaña que maneja la extensión de Chrome a veces **no tiene viewport**
(`window.innerWidth` en 0 y `document.hidden` en true). Ahí el lienzo queda en
1×1 y toda captura falla — no es un problema del sitio.

**Qué falta para llevarlo a producción:** criterio visual sobre el resultado
final, la cancha 3D que está haciendo smfab, y la decisión de reemplazar el hero
actual (§5.3: eso requiere confirmación del dueño).

---

## 6. Estado actual y pendientes

### ✅ Terminado y en producción (deployado)
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

### 🟡 Pendiente / a decidir con el dueño
- **Cotizador de envío:** código listo pero **inactivo**. Falta que smfab **pida las credenciales
  de API a un ejecutivo comercial de Correo Argentino** y las cargue en `.env.local` + Vercel
  (§2.9). Entrada: https://www.correoargentino.com.ar/MiCorreo/public/primeros-pasos
- **Cargar el peso de los productos** desde el admin (las paletas ≈ 400 g). Sin peso, el
  cotizador asume 400 g por producto.
- **SEO/metadata todavía dice "Mayorista"** (títulos, descriptions, footer del `layout.jsx`,
  `manifest.json`). Se dejó a propósito para no mover el posicionamiento sin un plan: falta hacer
  esa pasada.
- **Email `@saro.com.ar` (Zoho, plan gratis):** dominio verificado y MX cargados en el DNS de
  Vercel. Falta **crear las casillas** (`ventas@`, `info@`, la personal) y el alias `consultas@`
  → `info@`. La cuenta admin es `smfabiani11` (no se borra, es la dueña de la organización).
- **Modelos 3D extra:** smfab va a pasar 2–3 `.glb` más para que el hero rote entre ellos (§4.3).
- **Opiniones de clientes:** propuesto un carrusel administrable + botón "Dejá tu opinión en
  Google" (falta el link de la ficha). Traer reseñas automáticas de Google requiere Places API
  (con costo y límites) — se descartó por ahora.
- **Modelo mayorista con login** (cuestionario → aprobación → catálogo con precios, catálogo
  minorista sin precios, vendedores por zona): **en evaluación**, maqueta en
  `preview-vendedores.html`. ⚠️ Requeriría **base de datos real + autenticación** (hoy no hay
  ninguna de las dos) y define un **conflicto de canal** (fábrica vs. revendedores) a resolver.

### 🔮 Ideas a futuro (no pedidas aún)
Si algún día se quiere vender con pago online, gestionar stock de verdad o mandar mails, ahí sí
haría falta sumar una **base de datos real** y una **pasarela de pagos** — es un cambio grande y
aparte del modelo actual (catálogo + WhatsApp).

---

## 7. Instrucciones para Claude (o quien retome)

- Respondé siempre en **español rioplatense** (Argentina), y para alguien que **no programa**.
- Antes de tocar el catálogo/stock/pedidos: releé §5. **No pisar `products.json`/`orders.json`/
  `config.json`.** Si hay que cargar datos (pesos, precios, stock), **lo hace smfab desde
  `/admin`** — no editar esos archivos desde el código.
- Antes de tocar el hero 3D: leé §4.1 y §4.3 y `docs/ESTETICA.md`. Es lo más delicado del proyecto.
- Para cualquier cambio visual, respetá la paleta y convenciones de §3 y `docs/ESTETICA.md`.
- Deploy = push a `master` (con el cuidado de §5.2). No hay otro paso.
- **Verificación:** el visor de preview se cuelga con el hero 3D (WebGL) y el `next build` local
  a veces crashea por memoria (§5.5). Lo confiable es: `npx next build` (si compila y pasa tipos,
  Vercel lo buildea) + `curl` al dev server para chequear el HTML. Vercel es la verificación real.
- **Secretos:** nunca pedirle al usuario que pegue credenciales en el chat. Van en `.env.local` /
  Vercel; el código las lee del entorno (así se hizo con OpenAI y MiCorreo).
