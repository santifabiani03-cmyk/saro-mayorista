# SARO — Historial de enfoques probados y descartados

> **Esto NO es el estado actual del proyecto** (para eso está `CLAUDE.md`). Esto es **memoria de
> errores ya cometidos**: cosas que probamos, salieron mal y revertimos, con la razón. El objetivo
> es que una sesión futura **no repita** estos caminos ni pierda tiempo re-descubriendo por qué no
> funcionan.
>
> Escrito para alguien que no programa. Última actualización: 2026-07-23.

---

## 1. Modelo 3D de la paleta (el que más iteramos)

Se probaron **tres** caminos antes de llegar al definitivo. Quedó el **#3 (Meshy)**.

### ❌ 1.1 Modelo procedural (geometría inventada con código)
- **Qué era:** dibujar la paleta "a mano" con Three.js (una forma de gota extruida) y pegarle una
  foto como textura.
- **Por qué se descartó:** la forma quedaba **deforme** y la textura plana pegada encima se veía
  **falsa** (parecía una calcomanía, no un objeto real). Aunque se mejoró con reflejos y barniz,
  nunca dejó de parecer "de plástico dibujado".
- **Lección:** modelar una paleta de pádel a mano con código no da realismo. No volver por acá.

### ❌ 1.2 Mapear la foto real sobre la geometría procedural
- **Qué era:** recortar la foto frontal real (IMG_6561) y mapearla sobre la gota procedural.
- **Por qué se descartó:** la **silueta seguía deforme** (la geometría inventada no coincidía con
  la forma real de la paleta) y el carbono se veía como un "damero de transparencia" por la
  iluminación. Se intentó material sin iluminar (MeshBasic) y afinar el gris, pero el problema de
  fondo (forma inventada) no se resolvía.
- **Restos:** las fotos `public/assets/IMG_6558..6562.jpeg` y `paleta-master-face.jpg` son de este
  intento. **Ya no se usan.** No commitear.

### ❌ 1.3 Escaneo por fotogrametría (app del celular → .glb)
- **Qué era:** el dueño escaneó la paleta con una app y pasó un `.glb` real (22 MB).
- **Por qué se descartó:** el escaneo capturó **la mano y la cinta del mango** como "basura"
  pegada al modelo, la malla era **ruidosa**, y venía **descentrado y con la cara mirando de
  costado** (había que rotarlo). Se probó recentrarlo y escalarlo, pero el mango sucio no había
  forma linda de limpiarlo.
- **Lección:** los escaneos caseros de objetos finos (como una paleta) traen basura difícil de
  sacar. Sirve como referencia, no como modelo final.

### ✅ 1.4 Meshy (IA image-to-3D) — EL QUE QUEDÓ
- Da el modelo más limpio y realista. Archivo final: `public/models/paleta-opt.glb` (~1.5 MB,
  comprimido). Ver `CLAUDE.md` §4.1.
- **Limitación aceptada:** el canto (borde) tiene la textura imperfecta (el "SARO" del costado no
  es exacto). Se **mitiga con el encuadre** (paleta de frente, giro acotado), NO intentando
  arreglar la textura del canto (ya se intentó, ver 1.5).

### ❌ 1.5 "Pintar" el canto de dorado por separado (cleanEdges)
- **Qué era:** detectar las caras del borde del modelo por su orientación y repintarlas de dorado
  limpio, para tapar la textura imperfecta del canto.
- **Por qué se descartó:** la malla de Meshy tiene las **normales muy ruidosas**, así que las
  "caras del canto" no estaban solo en el borde sino **salpicadas por toda la superficie** → se
  doraba la paleta entera. No hay umbral que las separe bien. Se revirtió del todo.
- **Lección:** no separar caras por orientación en mallas de IA/escaneo (normales ruidosas). Si el
  canto molesta, el único camino real es **regenerar el modelo en Meshy** con fotos de los costados.

---

## 2. Animación del hero (muchas idas y vueltas)

### ❌ 2.1 Primera intro: una "banda" oscura arriba del catálogo
- **Qué era:** una franja navy fija con el titular y accesos rápidos por categoría, pegada arriba
  de la grilla de productos.
- **Por qué se descartó:** al dueño **no le gustó** — la sintió poco impactante, "un cambio que no
  me gustó". Pidió algo más diseñado, con una entrada previa a la pantalla de productos.
- **Resultado:** se reemplazó por la **intro cinematográfica con scroll** (la paleta 3D que flota,
  gira y se juega). Esa dirección sí gustó.

### ❌ 2.2 Giro 360° completo de la paleta
- **Qué era:** la paleta daba vueltas completas.
- **Por qué se descartó:** mostraba el **canto imperfecto** del modelo (ver 1.4) y, al ser fina,
  "desaparecía" de perfil. Se cambió a un **giro acotado / vaivén** que la mantiene de frente.
- **Lección:** la paleta debe quedarse **mayormente de frente**. Nada de giros de 360°.

### ❌ 2.3 Remate/golpe atado al scroll (scrubbing)
- **Qué era:** la posición de la pelota y el golpe se movían pegados al scroll (scrolleás y avanza
  el golpe cuadro a cuadro).
- **Por qué se descartó:** si dejabas el scroll **a la mitad**, quedaba la **pelota congelada en el
  aire** y la paleta trabada — se veía roto. El dueño pidió que el efecto sea **todo de una**.
- **Resultado:** se pasó a una **animación por tiempo (one-shot)**: una vez que arranca, se
  completa sola en ~1.4 s, aunque muevas el scroll. Nunca queda a medias.
- **Lección:** los efectos "de golpe" (impacto) deben ser por tiempo, no por scroll.

### 2.4 Correcciones sucesivas del swing (todas por feedback, ya resueltas)
No fueron "descartes" sino errores corregidos; anotados para no repetirlos:
- **Pivote en el centro → base del mango → "codo"** (un punto por debajo del mango). El correcto
  es el codo: el mango acompaña el arco como un brazo real.
- **Dirección del golpe invertida:** la pelota venía de la izquierda pero la paleta golpeaba hacia
  la derecha. Se corrigió: el follow-through va hacia donde sale la pelota.
- **La cara no miraba a la pelota:** se agregó rotación para que la cara "reciba" mirando al lado
  de entrada; después se aumentó un poco esa rotación.
- **Devolución siempre hacia arriba:** al principio todos los tiros salían para arriba (la altura
  de salida era siempre positiva). Se cambió a **ángulo completamente aleatorio** (arriba, abajo,
  diagonales).
- **Origen de la pelota:** primero salía de un lado fijo alternando; se cambió a que **salga desde
  la posición del mouse** (el usuario elige de dónde viene).
- **Throttle entre pelotas:** empezó en 0.8 s, se bajó a **0.45 s** (con swing más rápido para que
  acompañe el ritmo).

### ❌ 2.5 Recortes en pantallas angostas (mobile)
- **Qué pasaba:** durante el golpe, la paleta y la sombra se **cortaban** en el borde en mobile
  (pantalla angosta, el arco se iba de cuadro).
- **Cómo se resolvió (no se descartó, se arregló):** en pantallas angostas la **cámara se aleja**
  automáticamente y el **arco del swing se achica** (factor por aspecto de pantalla). Verificado
  sin recortes en desktop y mobile.
- **Lección:** cualquier animación amplia del hero hay que **verificarla en mobile**, no solo
  desktop.

---

## 3. Texturas/materiales del modelo procedural (contexto histórico)

Todo esto quedó obsoleto cuando entró Meshy (§1.4), pero se anota la lección:
- El carbono procedural se veía como **damero de transparencia** (celdas muy grandes y claras) →
  hubo que hacerlo más fino y gris.
- La iluminación **lavaba** la foto pegada → se usó material sin iluminar (MeshBasic).
- El "bumper" dorado del borde quedaba **abultado** (tubo muy grueso) → se afinó.
- **Lección general:** texturizar/pintar a mano una paleta realista es un pozo sin fondo. Mejor un
  modelo generado (Meshy) que traiga su propia textura.

---

## 4. Problemas de ENTORNO / herramientas (no son bugs del código — no perseguirlos)

Estos reaparecieron muchas veces y **hicieron perder tiempo**. No son errores del proyecto: son de
la máquina/herramientas. Una sesión futura debe reconocerlos y **no tratarlos como bugs a arreglar**.

- **Archivos de OneDrive Desktop = "solo en la nube":** los archivos que el dueño adjunta desde
  `C:\Users\smfab\OneDrive\Desktop\` suelen ser placeholders que **fallan al leerse**
  ("El proveedor de archivos en la nube se cerró inesperadamente"). **Solución:** pedirle que haga
  clic derecho → "Conservar siempre en este dispositivo" (hasta el tilde verde), o mover el archivo
  a una carpeta local fuera de OneDrive.
- **`next build` y el dev server se cuelgan en esta máquina:** crashes de los *workers* de Next por
  memoria, o la página no "hidrata" (queda muerta). **No es el código** — en Vercel buildea bien.
  Si el dev local se traba, reiniciarlo; no debuguear el "bug" que no existe.
- **Las capturas de pantalla del navegador se cuelgan o salen en blanco** en páginas con 3D
  (WebGL) o al estar scrolleado. **Solución:** verificar **numéricamente por JavaScript** (leer
  posiciones/estados) en vez de depender del screenshot; y capturar solo desde el tope de la página.
- **HMR (recarga en caliente) no re-ejecuta el efecto 3D de Three.js:** al editar `Paleta3D.jsx`,
  a veces sigue corriendo la versión vieja. **Solución:** recargar la página entera para probar
  cambios del 3D, no confiar en el auto-refresh.

---

## 5. Otros enfoques/errores de sesiones previas (para no repetir)

- **`generateStaticParams` en las páginas de producto:** se agregó para pre-generar todas las
  páginas en el build, pero **rompía el build de Vercel** (algunos productos daban error al
  pre-renderizar). **Se quitó.** Las páginas de producto se generan on-demand (ISR) + el sitemap
  dinámico avisa a Google. **No volver a agregar `generateStaticParams`.**
- **Worker de pdf.js desde CDN:** cargar el worker de `pdfjs-dist` desde un CDN **fallaba** (esa
  versión no estaba en el CDN). **Solución:** se sirve local desde `public/`. No volver al CDN.
- **Marca de agua SR más grande en las paletas:** se probó agrandar el logo (w-12) en las cards de
  paletas → **quedó muy grande** → se volvió a `w-9 opacity-35`, igual que las demás cards.
- **Endpoints abiertos:** `generate-description` y `track-order` estaban sin protección; se les
  agregó **PIN y/o rate limiting**. No dejar endpoints de escritura/IA sin protección.

---

## 6. Regla de oro que salió de todo esto

> Cuando algo del 3D o una animación "no se ve bien", el reflejo correcto es **ajustar encuadre,
> tiempos y dirección** — NO reconstruir el modelo ni pelear con la textura/malla. Y **siempre
> verificar en mobile**. Los caminos de "modelar/pintar a mano la paleta" ya se recorrieron y son
> callejones sin salida: el modelo bueno viene de Meshy.
