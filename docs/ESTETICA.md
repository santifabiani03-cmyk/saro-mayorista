# SARO — Guía de identidad visual (estética)

> Guía completa para mantener la coherencia visual de la web **sin tener que preguntar**.
> Está escrita para diseñadores y para cualquier persona que no programe. Complementa la sección
> 3 de `CLAUDE.md` (raíz del proyecto). Si algo cambia, actualizá ambos archivos.
>
> Nota técnica: los colores se aplican como "clases" de Tailwind (ej. `text-saro-blue`), pero acá
> te doy siempre el **código hex exacto** para que puedas replicar en Figma, Canva o donde sea.

Última actualización: 2026-07-23.

---

## 1. Colores (paleta exacta)

### 1.1 Colores de marca (los oficiales, definidos en `tailwind.config.js`)

| Nombre interno | HEX | Muestra mental | Para qué se usa |
|---|---|---|---|
| `saro-blue` | **#2563EB** | Azul vivo | **Color estrella.** Acentos, links, precios, botones primarios, la palabra "SARO", íconos activos, bordes de foco |
| `saro-mid` | **#1E40AF** | Azul más oscuro | Estados hover del azul, degradés que van de blue→mid |
| `saro-dark` | **#0F172A** | Navy casi negro | Textos importantes, fondo del hero/intro, botón del carrito, pedestales |
| `saro-light` | **#EFF6FF** | Celeste muy claro | Fondos suaves de badges, chips, cajas informativas (ej. "compra mín. sugerida") |
| `saro-accent` | **#F59E0B** | Ámbar / dorado | Detalle de contraste: burbuja del contador del carrito, eyebrow "VENTA MAYORISTA", número de stock en accesos rápidos |

### 1.2 Colores de apoyo (grises y funcionales)

| Uso | HEX aprox. | Nota |
|---|---|---|
| Fondo general de la página | **#FAFBFC** | Blanco "roto", casi blanco |
| Blanco puro (cards, header, modales) | **#FFFFFF** | |
| Texto secundario / labels | grises `#6B7280`–`#94A3B8` | (`text-gray-400/500`) |
| Bordes de línea | `#F3F4F6` al ~80% de opacidad | muy suaves |
| Verde WhatsApp | **#10B981 / #22C55E** | (`emerald-500`/`green-500`) solo para botones de WhatsApp |
| Rojo alertas ("sin stock", errores) | `#EF4444` y fondos `#FEF2F2` | uso puntual |

### 1.3 El celeste del LOGO ≠ el azul de marca ⚠️

Los archivos de logo (`logo-horizontal.png`, `logo-icon.png`, `logo.png`) están dibujados en un
**celeste más claro y suave (~#7EA8E8 / #8AB0EA)**, NO en el `saro-blue` #2563EB. Esto es a
propósito: el logo es un celeste "aireado". No intentes "corregirlo" al azul de marca — son dos
cosas distintas y conviven bien (logo celeste + acentos azul vivo).

### 1.4 Inconsistencia conocida (legacy) 🐛

`public/manifest.json` tiene `theme_color: "#4A90D9"`. Ese era el **azul viejo**, previo al
rediseño. El azul de marca actual es **#2563EB**. Si algún día se prolija, actualizar el
manifest a #2563EB. No es urgente (solo afecta el color de la barra del navegador en PWA).

---

## 2. Tipografía

- **Fuente única: Inter.** (Google Fonts). No se usa ninguna otra. Se carga en `layout.jsx`.
- **Pesos disponibles:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold).
- **Suavizado:** activado (`-webkit-font-smoothing: antialiased`) para que se vea prolija.

### Jerarquía (cómo usar los tamaños)

| Elemento | Peso | Tamaño típico | Extra |
|---|---|---|---|
| Titular hero | 800 extrabold | `text-4xl` (móvil) → `text-6xl` (desktop) | `tracking-tight` (letras juntas) |
| Título de sección | 700–800 | `text-lg` a `text-2xl` | `tracking-tight` |
| Nombre de producto (card) | 600 semibold | `text-sm` | `line-clamp-2` (máx 2 líneas) |
| Precio | 800 extrabold | `text-base`/`text-2xl` | siempre en `saro-blue` |
| Cuerpo / descripción | 400–500 | `text-sm` | color gris |
| Labels / etiquetas chicas | 600–700 | `text-xs` / `text-[11px]` | a veces `uppercase tracking-wider` |

Regla general: **títulos con `tracking-tight`**, textos chicos y labels a veces en
MAYÚSCULAS con `tracking-wider` (letras separadas). Nada de fuentes serif ni decorativas.

---

## 3. El logo (esto es crítico — leer completo)

### 3.1 Las tres variantes y para qué es cada una

Todos en `public/assets/`. Todos son **celestes sobre fondo transparente** (PNG).

#### a) `logo-horizontal.png` — el logo horizontal completo
- **Qué es:** el ícono "SR" (dos formas de S espejadas) seguido de la palabra **"SARO"** en
  mayúsculas, todo en línea horizontal. Es el logo "principal / firma".
- **Se usa en:**
  - Header (barra superior) en **desktop**, altura `h-14` (56 px).
  - Imágenes de redes sociales (OpenGraph / Twitter cuando compartís el link).
  - Schema.org (el "logo oficial" que ve Google).
- **Márgenes:** en el header va a la izquierda con padding del contenedor (`px-4 sm:px-6`).

#### b) `logo-icon.png` — solo el ícono "SR"
- **Qué es:** únicamente el isotipo (las dos S espejadas que forman como un moño/mariposa). Sin
  la palabra SARO.
- **Se usa en (MUCHOS lugares):**
  - **Favicon** (el iconito de la pestaña del navegador) y ícono de PWA/Apple.
  - Header en **mobile** (cuando no entra el horizontal), altura `h-11` (44 px).
  - **Footer**, centrado, a **opacidad 40%** (`opacity-40`), altura `h-10`.
  - **Marca de agua en las cards del catálogo:** arriba a la derecha de cada producto, tamaño
    `w-9 h-9` (36 px), **opacidad 35%**, posición `top-2.5 right-2.5`.
  - Pantalla de PIN del admin, página 404, y el PDF del catálogo.

#### c) `logo.png` — el logo grande (versión pesada, 212 KB)
- **Qué es:** el logo completo en alta resolución.
- **Se usa en:** el **header del panel admin** (ahí se invierte a blanco con `brightness-0
  invert` porque el fondo del admin es oscuro) y como logo principal del **PDF** del catálogo.

### 3.2 Reglas de uso del logo (correcto vs incorrecto)

**✅ CORRECTO**
- Sobre fondo **blanco o claro** → usar el logo tal cual (celeste).
- Sobre fondo **oscuro** (ej. header del admin, hero navy) → invertir a **blanco** (con
  `brightness-0 invert`). El logo blanco sobre navy se ve prolijo.
- Como marca de agua en fotos: **chico y sutil** (opacidad 15–35%), arriba a la derecha.
- Respetar la proporción original (no deformar).

**❌ INCORRECTO**
- ❌ No recolorear el logo al azul vivo #2563EB "para que combine" — el logo es celeste, punto.
- ❌ No poner el logo celeste sobre fondo celeste/claro sin contraste (se pierde).
- ❌ No estirar/achatar (mantener el aspecto).
- ❌ No poner el logo a opacidad 100% gigante encima de una foto de producto (tapa el producto).
  La marca de agua va **sutil**.
- ❌ No mezclar la versión con texto (horizontal) donde solo entra el ícono, ni viceversa.

### 3.3 Tamaños de referencia (resumen rápido)

| Dónde | Archivo | Tamaño | Opacidad |
|---|---|---|---|
| Header desktop | logo-horizontal | h-14 (56px) | 100% |
| Header mobile | logo-icon | h-11 (44px) | 100% |
| Marca de agua en cards | logo-icon | w-9 h-9 (36px), top/right 2.5 | 35% |
| Footer | logo-icon | h-10 (40px) | 40% |
| Watermark grabado en foto | logo-icon | 12% del ancho, margen 3% | 35% |
| Admin (fondo oscuro) | logo (invertido a blanco) | h-7 a h-9 | 100% |

---

## 4. Imágenes de producto con logo/marca ("watermark SR")

Son fotos de producto que tienen el **logo SR estampado** arriba a la derecha. Ejemplos reales
en `public/assets/`: `c-sr-1779851768084.webp` (un buzo azul jaspeado con el SR en la esquina),
`saro-sr-junior-*.webp`, `tubo-pelotas-noac-x2u-sr-*.webp`.

- **Cómo se generan:** desde el admin, con el toggle **"Grabar logo SR en la imagen"**. La
  función `applyLogoWatermark` (en `ProductForm.jsx`) hace exactamente esto:
  - Toma `logo-icon.png`.
  - Lo dibuja al **12% del ancho** de la foto, en la **esquina superior derecha**, con **margen
    del 3%** y **opacidad 0.35**.
  - Guarda en WebP calidad 0.92.
- **¿Son reemplazables o fijas?** → **Reemplazables.** Se regeneran subiendo la foto de nuevo
  (con o sin el toggle). No hay nada "hardcodeado" que dependa de estas imágenes puntuales.
- **Detalle importante:** en las cards del catálogo el logo SR **ya se muestra en vivo** por
  encima de cada foto (overlay `w-9 h-9 opacity-35`). Por eso grabar el watermark dentro de la
  imagen es **opcional y por defecto está desactivado** (para no duplicar el logo). Se graba solo
  si la foto va a usarse fuera de la web (ej. catálogo PDF, redes) donde no hay overlay.

---

## 5. Componentes y convenciones visuales

### 5.1 Bordes redondeados (radios)

| Elemento | Radio | Clase |
|---|---|---|
| Cards de producto, paneles, modales | grande | `rounded-2xl` |
| Botones, inputs, chips seleccionables | medio | `rounded-xl` |
| Badges / pills / etiquetas | completo o chico | `rounded-full` / `rounded-lg` |

### 5.2 Sombras (definidas en `tailwind.config.js`)

| Nombre | Cuándo | Efecto |
|---|---|---|
| `shadow-card` | Cards en reposo | Sombra sutil, gris muy leve |
| `shadow-card-hover` | Cards al pasar el mouse | Más marcada, con **tinte azul** (da el "levantar") |
| `shadow-float` | Modales y panel del carrito | Sombra grande, flotante |

Los bordes de línea son `border border-gray-100/80` (gris casi imperceptible).

### 5.3 Animaciones y micro-interacciones

- **Botones:** clase `.btn-press` → se achican al 97% al apretar (feedback táctil).
- **Entradas:** `animate-fade-in`, `animate-slide-up`, `animate-slide-right` (para modales,
  toasts, paneles).
- **Cards del catálogo:** aparecen escalonadas al cargar (`.card-in`) y se elevan en hover
  (`hover:-translate-y-1` + `shadow-card-hover`).
- **Hero (intro):** glows que "respiran", la paleta flota (`.intro-floaty`), partículas suben,
  textos que entran en secuencia (`.intro-rise`). Definidas en `globals.css`.
- **Accesibilidad:** TODO respeta `prefers-reduced-motion` (si el usuario pidió menos
  movimiento, las animaciones se apagan). Mantener esta regla en cualquier animación nueva.

### 5.4 Espaciado y grillas

- Contenedor central: `max-w-7xl mx-auto px-4 sm:px-6` (ancho máximo con padding lateral).
- Grilla de productos: 2 columnas en móvil, 3 en tablet, 4 en desktop
  (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), separación `gap-3 sm:gap-5`.
- Entre secciones: `space-y-6`.
- Paddings internos de cards: `p-3.5` aprox.

### 5.5 Tono general del diseño

Limpio, aireado, moderno, "premium accesible". Mucho blanco, azul de marca para lo importante,
grises suaves para lo secundario, un toque de ámbar para acentos puntuales. Nada recargado. El
protagonismo visual se lo lleva el **hero 3D** y las **fotos de producto**; el resto acompaña sin
competir.

---

## 6. Reglas estéticas acordadas a lo largo del trabajo

- **Marca de agua SR en cards:** quedó en `w-9 h-9 opacity-35`, **igual en cards de accesorios/
  ropa y en cards de paletas** (se probó más grande y más oscura en paletas y se volvió a este
  valor por pedido del dueño). No agrandar sin confirmar.
- **Azul de marca = #2563EB** en todos los acentos nuevos (no usar el viejo #4A90D9).
- **Una sola tipografía (Inter).** No sumar fuentes.
- **El logo no se recolorea:** celeste sobre claro, blanco sobre oscuro.
- **Hero 3D:** la paleta se mantiene **mayormente de frente** y con giro acotado para no exponer
  el canto imperfecto del modelo (ver `CLAUDE.md` §4.1). No poner giros de 360° completos.
- **Accesibilidad de movimiento:** respetar `prefers-reduced-motion` siempre.
- **Fondos:** página en `#FAFBFC`, superficies (cards/header/modales) en blanco puro.

---

## 7. Checklist rápido para un cambio visual nuevo

Antes de dar por bueno un cambio de diseño, revisá:
- [ ] ¿Usé los colores `saro-*` correctos (azul #2563EB para acentos)?
- [ ] ¿La tipografía es Inter con la jerarquía de §2?
- [ ] ¿Los radios/sombras siguen §5.1 y §5.2?
- [ ] ¿El logo se usa en la variante y tamaño correctos (§3)?
- [ ] ¿Se ve bien en **mobile y desktop**?
- [ ] ¿Respeta `prefers-reduced-motion` si hay animación?
- [ ] ¿No toqué `products.json` / `config.json` / `orders.json`? (ver `CLAUDE.md` §5)
