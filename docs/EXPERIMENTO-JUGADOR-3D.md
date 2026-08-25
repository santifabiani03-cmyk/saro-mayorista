# Experimento: jugador 3D animado (en pausa)

**Estado:** pausado en agosto 2026. El hero de scroll siguió sin sujeto.
**Dónde está el código:** rama `experimento/jugador-3d` (5 commits, desde `2c1c2c7` hasta `6d17b55`).

Este archivo existe para no volver a pagar el costo de descubrir lo mismo.

---

## Cómo recuperarlo

```bash
git checkout experimento/jugador-3d
```

Los assets viven en esa rama:

| Archivo | Qué es | Peso |
|---|---|---|
| `public/models/jugador.glb` | Jugador texturizado con esqueleto de 24 huesos | 830 KB |
| `public/models/golpes.json` | Pistas de rotación de la animación de Mixamo | 61 KB |
| `extraer-anim.mjs` | Script que saca las animaciones de un FBX a JSON | — |

---

## Lo que costó descubrir (y no es obvio)

### 1. El eje de rotación de cada hueso no se adivina

Sobre este esqueleto, el brazo **no baja rotando en Z** — eso es la torsión del propio
brazo y no cambia la silueta. El modelo parecía congelado en T-pose durante horas por
esto.

| Hueso | Eje que sirve | Qué hace |
|---|---|---|
| `RightArm` (hombro) | **Y** | sube y baja el brazo |
| `RightForeArm` (codo) | **X** | dobla el codo |

**Cómo se averigua:** fijar una rotación de ~1,3 rad en cada eje por separado y mirar
las tres imágenes. El eje bueno es el único que cambia la silueta. No hay atajo.

### 2. Un hijo de un hueso hereda una escala propia del esqueleto

La paleta colgada de `RightHand` medía **0,03 unidades** en vez de 2,9: era invisible.
La escala del hueso no es la del modelo, así que **no se calcula, se mide**:

```js
hueso.add(objeto)
raiz.updateMatrixWorld(true)
const t = new THREE.Box3().setFromObject(objeto).getSize(new THREE.Vector3())
objeto.scale.setScalar(largoDeseado / Math.max(t.x, t.y, t.z))
```

### 3. Meshy no sirve solo: hace falta un remesh en el medio

El `image-to-3d` devuelve **1,87 millones de caras** y el rigging admite **320 mil**.
La cadena completa es: imagen T-pose (9 créditos) → 3D (30) → **remesh a 60k (5)** →
rigging (5). El endpoint de remesh es `/openapi/v1/remesh`; el mensaje de error de la
propia API dice `v2`, que **no existe**.

Al generar la imagen hay que pasar `"pose_mode": "t-pose"` o el rig sale mal.

### 4. Las animaciones de Mixamo no mueven la muñeca ni tienen dedos

Medido sobre cuatro clips: **0° de rotación de muñeca** y **cero huesos de dedos**.
Por eso las manos se ven rígidas y la mano no cierra sobre el mango. El latigazo de
muñeca hay que sumarlo por código encima del mocap. Los dedos no tienen arreglo con
este modelo: haría falta uno generado con huesos de dedos.

### 5. Conviene traer sólo la animación, no la malla

El FBX de Mixamo pesa 10 MB. Extrayendo únicamente las pistas de rotación —y tirando
las de posición, para que el personaje golpee plantado en lugar de desplazarse— queda
un JSON de **61 KB** que se aplica sobre el modelo ya optimizado. Ver `extraer-anim.mjs`.

Los nombres de hueso de Mixamo llevan el prefijo `mixamorig:`; los de Meshy no. Conviene
indexarlos de las dos formas.

### 6. Elegir animación por el nombre no funciona

Hay que medir **hacia dónde viaja la mano** en el momento más rápido del clip:

| Clip | Dirección de la mano | Sirve para pádel |
|---|---|---|
| Goalie Throw | adelante (+0,91), alta | sí — la que se usó |
| Bash | adelante y arriba, más corto | sí, más contenido |
| Baseball Strike | arriba y hacia **atrás** | no: manda la pelota al fondo |
| Heavy Weapon Swing | hacia **abajo** (−0,80) | no: no pasa la red |

---

## Por qué se pausó

Un cuerpo humano fotorrealista es el objeto menos indulgente que se puede poner en
pantalla: un error de cinco grados en un codo se lee como "muñeco roto", mientras que la
misma imprecisión en una paleta no se nota. Sumado a que el entorno de desarrollo no
permite ver el render en vivo, cada ajuste necesitaba una vuelta con el dueño.

**Si se retoma, lo que más rinde es resolver primero cómo verlo.** El truco que funcionó
está en la rama: exponer `window.__lab.ver(t)` para dibujar un cuadro puntual del guion
sin depender del scroll ni de `requestAnimationFrame`, y `/api/lab-shot` (endpoint sólo
de desarrollo) para guardarlo como imagen. Con eso aparecieron tres errores en minutos
que a ciegas habían costado horas. El renderer necesita `preserveDrawingBuffer: true`.
