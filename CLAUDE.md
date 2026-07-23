# SARO Mayorista — Documentación del proyecto

> **Leé esto primero.** Este archivo es el mapa completo del proyecto. Está escrito para
> que cualquier persona (o una sesión nueva de Claude) arranque de cero sin tener que releer
> chats viejos ni preguntar nada. Prioriza ser exhaustivo. Si algo cambia, actualizá este
> archivo y `docs/ESTETICA.md`.

Última actualización: 2026-07-23.

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

SARO es una **marca argentina de paletas de pádel, accesorios de pádel y ropa deportiva**.
Esta web es su **catálogo mayorista online**.

**Para quién es:** comerciantes y revendedores que compran al por mayor (no venta al público
minorista clásica). Por eso hay una "compra mínima sugerida".

**Modelo de negocio — MUY IMPORTANTE entender esto:**
- La web **NO cobra online**. No hay tarjetas, no hay Mercado Pago, no hay carrito con pago.
- El cliente navega el catálogo, arma su pedido en un carrito, y al finalizar se genera un
  **mensaje de WhatsApp** ya redactado (con productos, cantidades y total) que se manda al
  número del vendedor. **El pedido y el cierre de la venta pasan por WhatsApp, a mano.**
- Es, en esencia, una **vitrina digital + generador de pedidos por WhatsApp**.

**Lo que la web NO tiene** (importante para no prometer de más): pasarela de pagos, cálculo/
integración de envíos, cuentas de usuario, ni envío de emails automáticos.

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
| Analytics | @vercel/analytics + @vercel/speed-insights |

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

- **Lectura (tienda pública):** la home lee `catalog/products.json` del disco al construir la
  página y se refresca sola cada 60 segundos (esto se llama ISR: `export const revalidate = 60`
  en `src/app/(shop)/page.jsx`). También existe la API `/api/catalog` que devuelve el JSON.
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
│   ├── models/paleta-opt.glb ← modelo 3D de la paleta (hero)
│   └── assets/               ← logos + TODAS las fotos de producto
├── src/
│   ├── app/
│   │   ├── layout.jsx        ← <head>, fuentes, SEO, Analytics
│   │   ├── globals.css       ← estilos globales + animaciones del hero
│   │   ├── (shop)/           ← LA TIENDA PÚBLICA (grupo de rutas)
│   │   │   ├── layout.jsx    ← lee public/config.json y envuelve la tienda
│   │   │   ├── page.jsx      ← home / catálogo (Server Component)
│   │   │   ├── ShopShell.jsx ← header + carrito + footer
│   │   │   ├── CatalogClient.jsx  ← grilla de productos, filtros, buscador, HERO 3D
│   │   │   └── producto/[slug]/   ← página individual de cada producto
│   │   ├── admin/            ← entrada al panel admin (carga AdminPage)
│   │   └── api/              ← LA "COCINA" (endpoints, ver tabla abajo)
│   ├── components/           ← piezas de UI reutilizables
│   │   ├── Header.jsx, Cart.jsx, Footer (en ShopShell), Filters.jsx
│   │   ├── ProductCard.jsx, ProductModal.jsx, ImageCarousel.jsx
│   │   ├── FaqSection.jsx, HowToBuyModal.jsx
│   │   ├── IntroHero.jsx     ← la intro cinematográfica (texto + escena 3D)
│   │   ├── Paleta3D.jsx      ← TODO el motor 3D de la paleta (Three.js)
│   │   └── admin/            ← ProductForm, ProductList, SettingsPanel, etc.
│   ├── views/AdminPage.jsx   ← el panel admin completo (pestañas)
│   └── utils/                ← helpers (colores, slug, export PDF, etc.)
├── package.json, next.config.mjs, tailwind.config.js, vercel.json
└── (archivos locales que NO se deployan: lab.html, IMG_*.jpeg, scripts .py — ver §5)
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

### 2.7 `public/config.json` (configuración de la tienda)

Es un archivo chico con la config editable desde el admin (pestaña **⚙️ Ajustes**):

```json
{
  "storeName": "SARO Mayorista",
  "whatsappNumber": "5491123208058",   ← número donde caen los pedidos
  "minPurchase": 150000,               ← mínimo real (barra de progreso del carrito)
  "suggestedMinPurchase": 150000,      ← el que se muestra como "compra mín. sugerida"
  "currency": "ARS"
}
```

### 2.8 Servicios externos que usa

| Servicio | Para qué | Dónde se configura |
|---|---|---|
| **Vercel** | Hosting + Analytics + Speed Insights | panel de Vercel |
| **GitHub** | "Base de datos" (productos, pedidos) + hosting de imágenes + API de escritura | token en Vercel |
| **WhatsApp** (links `wa.me`) | El "checkout" real: ahí llegan los pedidos | número en `config.json` |
| **Google Gemini** (IA) | Solo en admin: generar descripciones e imágenes de escena | `GEMINI_API_KEY` |
| **Google Search Console** | SEO / posicionamiento (monitoreo, no integrado en código) | externo |

### 2.9 Variables de entorno (secretos)

Están en Vercel (y localmente en `.env.local`, que **no** se sube a GitHub). **Nunca** las
pongas en el código ni las commitees:

- `ADMIN_PIN` — PIN del panel admin.
- `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` — para leer/escribir el repo (base de datos e
  imágenes). Hay variantes `NEXT_PUBLIC_GITHUB_*` para uso en el navegador.
- `GEMINI_API_KEY` — la IA de Google para el admin.

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
- **Panel de Ajustes en el admin** (compra mínima, compra mínima sugerida, teléfono de WhatsApp
  con prefijo +54 fijo). Guarda en `config.json` vía `/api/update-config`.

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

### 5.5 Correr en local

`npm run dev` (Next.js dev en el puerto que asigne). **Nota:** en la máquina de smfab el build
local y el dev server a veces se cuelgan (crashes de los workers de Next por memoria) — **no es
un problema del código**; Vercel buildea sin problemas. Si el dev local se traba, reiniciarlo.

---

## 6. Estado actual y pendientes

### ✅ Terminado y en producción (deployado)
- Rediseño visual completo de la tienda pública.
- Hero 3D con la paleta MASTER real (modelo Meshy 1.5 MB): flotar+mouse, juego de pelotas por
  click (destino aleatorio, throttle 0.45 s, swing adaptativo), zoom por scroll y remate bandeja.
- Sin recortes en desktop ni mobile; sin errores de consola.
- Panel admin con Ajustes (compra mínima/sugerida, WhatsApp), generador de escenas IA,
  reordenamiento de imágenes por drag&drop.
- Seguridad: PIN + rate limiting en endpoints; validación de datos en pedidos.
- SEO: títulos/keywords de pádel, Schema.org (Organization, WebSite, Product, FAQ), sitemap
  dinámico, verificado en Google Search Console.

### 🔗 Verificado en producción (última sesión)
21 productos cargando OK, flujo de compra (abrir producto → carrito → WhatsApp) OK, hero 3D OK
en desktop y mobile, 0 errores de consola.

### 🟡 Pendiente / a decidir con el dueño
- El hint **"🎾 Tocá la paleta para jugar"** (abajo del hero): falta que smfab confirme si se
  deja o se saca.
- El **canto de la paleta 3D** tiene textura imperfecta de Meshy (ver §4.1). Si molesta, la
  opción real es **regenerar el modelo en Meshy** con fotos de los costados. Por ahora se mitiga
  con el encuadre.
- Afinado fino opcional del ritmo/direcciones del juego de pelotas, según feedback en uso real.

### 🔮 Ideas a futuro (no pedidas aún)
Si algún día se quiere vender con pago online, gestionar stock de verdad o mandar mails, ahí sí
haría falta sumar una **base de datos real** y una **pasarela de pagos** — es un cambio grande y
aparte del modelo actual (catálogo + WhatsApp).

---

## 7. Instrucciones para Claude (o quien retome)

- Respondé siempre en **español rioplatense** (Argentina), y para alguien que **no programa**.
- Antes de tocar el catálogo/stock/pedidos: releé §5. **No pisar `products.json`/`orders.json`/
  `config.json`.**
- Antes de tocar el hero 3D: leé §4.1 y `docs/ESTETICA.md`. Es lo más delicado del proyecto.
- Para cualquier cambio visual, respetá la paleta y convenciones de §3 y `docs/ESTETICA.md`.
- Deploy = push a `master` (con el cuidado de §5.2). No hay otro paso.
