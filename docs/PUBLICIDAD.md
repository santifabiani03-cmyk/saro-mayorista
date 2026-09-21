# SARO — Publicidad (Meta Ads y Google)

Cómo está armada la publicidad automática de productos y cómo se conecta con
Meta (Instagram/Facebook) y Google. Última actualización: 2026-09-21.

---

## 1. Qué hay en la web (ya hecho)

| Pieza | Dónde | Qué hace |
|---|---|---|
| **Feed de productos** | `https://saro.com.ar/feed.xml` (`src/app/feed.xml/route.js`) | Lista de productos en el formato que leen Meta y Google. Se arma sola desde `catalog/products.json` cada vez que se publica desde el admin |
| **Regla del feed** | `src/utils/feed.js` | Entra un producto si: está visible, tiene **precio minorista**, tiene foto y no se apagó "Publicitar". Usa el precio minorista (el mismo de la ficha) |
| **Fotos del feed** | `/feed-img?u=...` (`src/app/feed-img/route.js`) | Convierte las fotos WebP a JPG 1080×1080 con fondo blanco (Meta no toma bien WebP ni transparencias). Sólo acepta fotos de SARO |
| **Pixel de Meta** | `src/components/MetaPixel.jsx` | Se activa sólo si existe `NEXT_PUBLIC_META_PIXEL_ID` en Vercel. No mide `/admin` ni `/lab*` |
| **Eventos** | `src/utils/analytics.js` | Van a GA4 y a Meta a la vez (tabla abajo) |
| **Admin → 📣 Publicidad** | `src/components/admin/PublicidadPanel.jsx` | Muestra qué productos están en los anuncios, cuáles no y por qué. Tiene el link del feed para copiar |
| **Interruptor "Publicitar"** | Ficha del producto en el admin | Prendido por defecto. Se guarda `publicitar: false` en el producto sólo si se apaga |

### Eventos que se miden

| Qué hace el cliente | Meta | GA4 |
|---|---|---|
| Entra a una página | `PageView` | (automático) |
| Abre una ficha o el detalle de un producto | `ViewContent` | `view_item` |
| Agrega al carrito | `AddToCart` | `add_to_cart` |
| Manda el pedido por WhatsApp | `InitiateCheckout` | `finalizar_pedido` |
| Toca un botón de WhatsApp (header, landing, chat, personalizados) | `Contact` | `contacto_whatsapp` |
| Completa "Trabajá con nosotros" | `Lead` | `trabaja_con_nosotros` |

El pedido va como `InitiateCheckout` y **no** como `Purchase`: la venta se cierra a
mano por WhatsApp y la web no sabe si se concretó.

⚠️ Los `content_ids` de los eventos son el `id` del producto, igual que el `g:id`
del feed. Si se cambia uno, hay que cambiar el otro, o Meta deja de reconocer qué
producto vio cada persona.

### Precio de la ficha = precio del anuncio

Meta y Google rechazan un producto si el precio del anuncio no coincide con el de
la página. Por eso la ficha (`/producto/[slug]`) muestra el **precio minorista**
cuando existe. Desde el catálogo mayorista (`/ropa-y-accesorios/mayorista`) se
entra con `?modo=mayorista` y ahí sí se ve el mayorista.

---

## 2. Paso a paso para conectar Meta (lo hace smfab)

> Todo esto se hace desde la computadora, con tu usuario de Facebook.
> Nada de esto se puede hacer desde el código.

### 2.1 Cuenta comercial y cuenta publicitaria
1. Entrá a **business.facebook.com** → "Crear cuenta" → nombre **SARO**.
2. En **Configuración → Cuentas → Páginas**, agregá la página de Facebook de SARO.
   En **Cuentas de Instagram**, conectá el Instagram de SARO.
3. En **Cuentas → Cuentas publicitarias → Agregar → Crear una cuenta nueva**:
   - Zona horaria: **Buenos Aires**. Moneda: **ARS**.
   - ⚠️ Ninguna de las dos se puede cambiar después.
4. Cargá el medio de pago (**lo hacés vos**, nunca lo pases por el chat).

### 2.2 Crear el Pixel y cargarlo en la web
1. Entrá a **Events Manager** (Administrador de eventos) → **Conectar orígenes de
   datos** → **Web** → nombre: "SARO web" → elegí **instalar el código manualmente**.
2. Copiá el **ID del Pixel** (un número de 15 o 16 dígitos). **No es secreto**: me
   lo podés pasar por el chat.
3. Cargalo en Vercel: **Project → Settings → Environment Variables** →
   - Key: `NEXT_PUBLIC_META_PIXEL_ID`
   - Value: el número
   - Environments: Production (y Preview)
4. En **Deployments**, tocá los tres puntos del último → **Redeploy** (sin esto el
   Pixel no se activa).

### 2.3 Verificar el dominio
**Configuración del negocio → Seguridad de la marca → Dominios → Agregar** →
`saro.com.ar`. Elegí el método **registro TXT de DNS**: Meta te da un texto
`facebook-domain-verification=...`. Cargalo en **Vercel → Domains → saro.com.ar →
DNS Records → Add** (tipo TXT, nombre vacío o `@`). Es el mismo lugar donde están
los MX de Zoho: no toques esos.

### 2.4 Crear el catálogo con el feed
1. Entrá a **Commerce Manager** → **Crear catálogo** → tipo **Comercio electrónico**
   → "Subir la información de los productos" → dueño: la cuenta comercial SARO.
2. En el catálogo: **Orígenes de datos → Agregar artículos → Feed de datos →
   Feed programado**.
   - URL: `https://saro.com.ar/feed.xml` (está para copiar en **admin → 📣 Publicidad**)
   - Frecuencia: **diaria**. Moneda: **ARS**.
3. En **Catálogo → Configuración → Orígenes de eventos**, conectá el Pixel "SARO web".
4. Revisá la pestaña **Problemas**: si algún producto tiene error, pasame la captura.

### 2.5 Probar que el Pixel mide
En **Events Manager → tu Pixel → Probar eventos**, abrí la web, entrá a una paleta
y agregala al carrito. Tienen que aparecer `PageView`, `ViewContent` y
`AddToCart`. **No** mandes el pedido de prueba: te llega un WhatsApp y se registra
en "Demanda".

---

## 3. Google (después de Meta)

1. **Merchant Center** (merchants.google.com) → país **Argentina** → verificá
   `saro.com.ar` (ya está verificado en Search Console, se puede reutilizar).
2. **Productos → Fuentes de datos → Agregar → archivo por URL** →
   `https://saro.com.ar/feed.xml` → frecuencia diaria.
3. Configurá **envíos** (tarifa estimada real, nunca "gratis" si no lo es) y
   **política de devoluciones**. Google las exige.
4. ⚠️ **Riesgo conocido:** Google a veces suspende tiendas que no tienen pago en la
   web ("falta de checkout"). Si pasa, lo más fácil es usar Google para **anuncios
   de búsqueda con texto** (ej. "paletas de pádel carbono") en vez de Shopping.
5. **Google Ads**: creá la cuenta, vinculá Merchant Center y Google Analytics
   (`G-WSMCJDHZWH`) e importá `finalizar_pedido` como conversión.

---

## 4. Pendientes del catálogo (desde el admin)

- **Cargar el precio minorista**: sin él, el producto no sale en el catálogo
  público ni en los anuncios. Al 21/09/2026 sólo 9 de 50 productos lo tienen
  (7 paletas y 2 de ropa). La pestaña **📣 Publicidad** muestra cuáles faltan.
- **Descripciones**: un producto sin descripción sale con un texto genérico.
- **Precios escritos a mano en la descripción** (ej. "PACK X DOCENA $35.000"):
  contradicen el precio del anuncio. El panel los marca con ⚠️.

## 5. Mejoras posibles (no hechas)

- **API de Conversiones de Meta** (medición desde el servidor): recupera eventos
  que bloquean iPhone y los bloqueadores de anuncios. Necesita un token secreto de
  Meta en Vercel. Conviene hacerlo cuando haya campañas andando.
- **Variantes por color/talle en el feed** (`item_group_id`): hoy va un producto
  por item. Google lo pide para ropa en algunos países, en Argentina no.
