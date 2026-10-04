# Licencias de los recursos de los videos

Recursos que usan las plantillas de la pestaña "🎬 Videos" del admin (`src/videos/`).

## Música: CC0 1.0 (dominio público)

Se puede usar comercialmente, sin atribución obligatoria. Igual dejamos el crédito.
Licencia verificada el 2026-09-28 en la página de cada pista en Freesound (enlace a
creativecommons.org/publicdomain/zero/1.0).

| Archivo | Pista | Autor | Fuente | Arranca en |
|---|---|---|---|---|
| `musica/parallel-universe.mp3` | Parallel Universe | Andrewkn | https://freesound.org/s/404458/ | 1:06 |
| `musica/mellow-chill.mp3` | mellow_chill_song23 | bainmack | https://freesound.org/s/632681/ | 0:39 |
| `musica/uplifting.mp3` | Free Uplifting Music | Seth_Makes_Sounds | https://freesound.org/s/670819/ | 0:24 |
| `musica/happy-hiphop.mp3` | Happy Hip Hop Beat | Seth_Makes_Sounds | https://freesound.org/s/655615/ | 1:12 |
| `musica/cinematic-synth.mp3` | Super Duper Cinematic Synth Song | Seth_Makes_Sounds | https://freesound.org/s/690476/ | 0:39 |
| `musica/bounce-house.mp3` | bounce house | LFsound42 | https://freesound.org/s/749373/ | 0:06 |
| `musica/lofi-groove.mp3` | Upbeat downtempo cool lofi ish | SamuSounds79 | https://freesound.org/s/728685/ | 0:18 |
| `musica/bubblegum-pop.mp3` | Bubbglegum Pop Song | Seth_Makes_Sounds | https://freesound.org/s/686610/ | 0:15 |
| `musica/fun-dance.mp3` | fun dancetrack | evanjones4 | https://freesound.org/s/320089/ | 0:00 |

Las siete de abajo se sumaron el 2026-10-04 (versión MP3 de vista previa de Freesound, 128 kbps;
licencia CC0 según el filtro de búsqueda y la página de cada pista). El segundo exacto de arranque,
el pulso y la ganancia de cada una están en `src/videos/catalogo.js` (`MUSICAS`), medidos con
`scripts/videos/analizar-musica.py`.

## Efectos de sonido: propios

Los `sfx/*.wav` se sintetizan con `scripts/videos/generar-sfx.py` (numpy, semilla fija; vino
del proyecto `remotion-videos`). No vienen de ninguna librería: no tienen licencia de terceros.
Son: whoosh, swoosh, pop, click, tick, ding, impacto, riser, pelota y palmas.

## Fuente: Inter (SIL Open Font License 1.1)

`fuentes/inter-latin.woff2` es Inter (Rasmus Andersson), bajada de Google Fonts. La OFL
permite usarla, incluso comercialmente, y distribuirla junto con el software.

## Capturas de la web

`web/*.jpg` son capturas de saro.com.ar (propias).
