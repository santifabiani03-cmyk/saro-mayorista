# Rama `datos` — datos vivos de saro.com.ar

Esta rama **no tiene código**: guarda lo que cambia solo, y la web lo lee en el momento.
No dispara deploys (el deploy a producción sólo corre con pushes a `master`).

| Archivo | Qué es | Quién lo escribe |
|---|---|---|
| `products.json` | Catálogo publicado | El admin, con "Publicar en sitio" |
| `config.json` | Ajustes de la tienda (WhatsApp, compra mínima…) | El admin, pestaña Ajustes |
| `orders.json` | Registro de pedidos enviados por WhatsApp | La web, en cada pedido |
| `fotos/` | Fotos de producto subidas desde el admin | El admin |

- Cada guardado es un commit: el historial de esta rama es el historial de cambios.
  Para deshacer, un commit nuevo que restaure la versión anterior. **Nunca** reescribir la
  historia ni hacer push forzado.
- No pushear desde una copia vieja: se pisan el stock y los pedidos reales.
- El código que lee y escribe acá está en `src/utils/datos.js` (rama `master`).
  Ver `CLAUDE.md` §2.2 y §7.
