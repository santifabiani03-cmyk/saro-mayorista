"""Mide una pista para sumarla a MUSICAS (src/videos/catalogo.js).

Da el pulso de los golpes fuertes (bpm), el segundo exacto donde conviene
arrancar (desde, sobre un golpe) y la ganancia para que suene igual de fuerte
que Parallel Universe.

Uso (necesita numpy):
  node node_modules/@remotion/cli/remotion-cli.js ffmpeg -i pista.mp3 -ac 1 -ar 22050 -acodec pcm_s16le pista.wav
  python scripts/videos/analizar-musica.py pista.wav SEGUNDO_OBJETIVO

SEGUNDO_OBJETIVO: más o menos dónde querés que arranque (después de la intro,
donde la canción ya "entró"). El script lo corre hasta el golpe fuerte más
cercano. Ojo: pistas con ritmo ambiguo dan varios candidatos parecidos; se
elige el de mayor "claridad", y conviene escuchar el resultado en la vista previa.
"""
import sys
import wave

import numpy as np

SR = 22050
HOP = 256
FPS = SR / HOP
REFERENCIA_DB = -17.3  # RMS de Parallel Universe desde 1:06 (ganancia 1)


def leer(ruta):
    with wave.open(ruta) as w:
        d = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
        if w.getnchannels() == 2:
            d = d.reshape(-1, 2).mean(axis=1)
    return d


def golpes(x):
    """Curva de "ataques": graves (el bombo) pesan más que el resto."""
    n = 2048
    ventanas = np.lib.stride_tricks.sliding_window_view(x, n)[::HOP] * np.hanning(n)
    esp = np.abs(np.fft.rfft(ventanas, axis=1))
    graves = np.log1p(esp[:, 1 : int(180 * n / SR)].sum(axis=1) * 10)
    todo = np.log1p(esp * 10)
    g = np.maximum(np.diff(graves), 0)
    t = np.maximum(np.diff(todo, axis=0), 0).sum(axis=1)
    e = g / (g.std() + 1e-9) + 0.5 * t / (t.std() + 1e-9)
    e -= np.convolve(e, np.ones(16) / 16, mode="same")
    return np.maximum(e, 0)


def tempo(env):
    e = env - env.mean()
    ac = np.correlate(e, e, mode="full")[len(e) - 1 :]
    mejor = (0, 0)
    for bpm in np.arange(60, 181, 0.25):
        lag = 60 * FPS / bpm
        s = 0
        for k in (1, 2, 3, 4, 8):
            i = lag * k
            lo = int(i)
            if lo + 1 < len(ac):
                s += ac[lo] * (1 - (i - lo)) + ac[lo + 1] * (i - lo)
        mejor = max(mejor, (s, bpm))
    return mejor[1]


def fase_y_claridad(env, bpm):
    periodo = 60 * FPS / bpm
    mejor = (0, 0)
    for f0 in np.linspace(0, periodo, 64, endpoint=False):
        idx = np.round(np.arange(f0, len(env) - 1, periodo)).astype(int)
        mejor = max(mejor, (env[idx].mean() / (env.mean() + 1e-9), f0 / FPS))
    return mejor[1], mejor[0]


def main():
    x = leer(sys.argv[1])
    objetivo = float(sys.argv[2]) if len(sys.argv) > 2 else 0
    env = golpes(x)[int(objetivo * FPS) : int((objetivo + 30) * FPS)]
    base = tempo(env)
    candidatos = []
    for r in (1, 2, 0.5, 1.5, 2 / 3, 4 / 3, 0.75):
        bpm = base * r
        if 60 <= bpm <= 150:
            fase, claridad = fase_y_claridad(env, bpm)
            candidatos.append((claridad, round(bpm, 2), round(objetivo + fase, 3)))
    candidatos.sort(reverse=True)
    claridad, bpm, desde = candidatos[0]
    tramo = x[int(desde * SR) : int((desde + 30) * SR)]
    rms = 20 * np.log10(np.sqrt(np.mean(tramo**2)) + 1e-9)
    ganancia = float(np.clip(10 ** ((REFERENCIA_DB - rms) / 20), 0.5, 2.6))
    print(f"bpm: {bpm}  desde: {desde}  ganancia: {ganancia:.2f}  (claridad {claridad:.2f})")
    print("Otros candidatos (claridad, bpm, desde):", candidatos[1:4])


if __name__ == "__main__":
    main()
