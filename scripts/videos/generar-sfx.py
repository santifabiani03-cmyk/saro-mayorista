"""Sintetiza los efectos de sonido de los videos. Son 100 % propios: sin licencias.

Genera en public/videos/sfx/ (los usan las plantillas de src/videos, ver audio.jsx):
  whoosh.wav  transición (ruido filtrado con barrido de frecuencia)
  swoosh.wav  whoosh corto y agudo, para textos
  pop.wav     aparición de chips / tarjetas
  click.wav   clic del cursor
  tick.wav    tecla (tipeo de la URL)
  ding.wav    precio / mensaje enviado (campana FM suave)
  impacto.wav golpe grave con cola, para el logo
  riser.wav   subida de tensión antes del cierre

Uso:  scripts\\.venv\\Scripts\\python.exe scripts\\generar_sfx.py
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parents[2] / "public" / "videos" / "sfx"
rng = np.random.default_rng(7)  # semilla fija: siempre el mismo sonido


def t(seg: float) -> np.ndarray:
    return np.arange(int(SR * seg)) / SR


def envolvente(n: int, ataque: float, caida: float) -> np.ndarray:
    """Ataque lineal + caída exponencial, en segundos."""
    x = np.arange(n) / SR
    a = np.clip(x / max(ataque, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(x - ataque, 0) / max(caida, 1e-4))


def pasabanda_barrido(ruido: np.ndarray, f0: float, f1: float, q: float = 4.0) -> np.ndarray:
    """Filtro de estado variable con centro que barre de f0 a f1 (el 'fsss' del whoosh)."""
    fc = np.geomspace(f0, f1, len(ruido))
    low = band = 0.0
    out = np.empty_like(ruido)
    for i, x in enumerate(ruido):
        f = 2 * np.sin(np.pi * fc[i] / SR)
        low += f * band
        high = x - low - band / q
        band += f * high
        out[i] = band
    return out


def guardar(nombre: str, señal: np.ndarray, pico: float = 0.8) -> None:
    señal = señal / (np.max(np.abs(señal)) + 1e-9) * pico
    # fade de 5 ms en las puntas para que no haga "clic"
    f = int(SR * 0.005)
    señal[:f] *= np.linspace(0, 1, f)
    señal[-f:] *= np.linspace(1, 0, f)
    estereo = np.stack([señal, señal], axis=1)
    with wave.open(str(OUT / nombre), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((estereo * 32767).astype("<i2").tobytes())


def whoosh(dur: float, f0: float, f1: float, pico_en: float) -> np.ndarray:
    n = int(SR * dur)
    x = np.arange(n) / n
    forma = np.where(x < pico_en, (x / pico_en) ** 2, np.exp(-(x - pico_en) / (1 - pico_en) * 4))
    return pasabanda_barrido(rng.standard_normal(n), f0, f1) * forma


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    guardar("whoosh.wav", whoosh(0.65, 250, 3200, 0.55), 0.7)
    guardar("swoosh.wav", whoosh(0.32, 900, 6000, 0.45), 0.5)

    # pop: seno con caída de tono rápida
    x = t(0.14)
    tono = 2 * np.pi * np.cumsum(np.geomspace(900, 380, len(x))) / SR
    guardar("pop.wav", np.sin(tono) * envolvente(len(x), 0.002, 0.035), 0.6)

    # click: transitorio corto de ruido filtrado + cuerpo agudo
    x = t(0.05)
    clic = rng.standard_normal(len(x)) * envolvente(len(x), 0.0005, 0.004)
    clic += 0.6 * np.sin(2 * np.pi * 2400 * x) * envolvente(len(x), 0.0005, 0.008)
    guardar("click.wav", clic, 0.55)

    x = t(0.04)
    guardar("tick.wav", np.sin(2 * np.pi * 3100 * x) * envolvente(len(x), 0.0005, 0.006) + 0.3 * rng.standard_normal(len(x)) * envolvente(len(x), 0.0003, 0.002), 0.35)

    # ding: síntesis FM tipo campana (moduladora 3.5x) + octava
    x = t(1.4)
    env = envolvente(len(x), 0.003, 0.45)
    mod = 2.2 * env * np.sin(2 * np.pi * 1318.5 * 3.5 * x)
    campana = np.sin(2 * np.pi * 1318.5 * x + mod) + 0.4 * np.sin(2 * np.pi * 2637 * x) * envolvente(len(x), 0.003, 0.2)
    guardar("ding.wav", campana * env, 0.5)

    # impacto: bombo grave con barrido de tono + ruido de cola
    x = t(1.6)
    tono = 2 * np.pi * np.cumsum(np.geomspace(120, 38, len(x))) / SR
    golpe = np.sin(tono) * envolvente(len(x), 0.002, 0.45)
    golpe += 0.25 * pasabanda_barrido(rng.standard_normal(len(x)), 1800, 300, 1.2) * envolvente(len(x), 0.001, 0.25)
    guardar("impacto.wav", golpe, 0.9)

    # riser: ruido con barrido ascendente + tono que sube, crece hasta el final
    x = t(2.2)
    n = len(x)
    sube = (np.arange(n) / n) ** 2.2
    tono = 2 * np.pi * np.cumsum(np.geomspace(180, 900, n)) / SR
    riser = 0.8 * pasabanda_barrido(rng.standard_normal(n), 300, 7000, 6) * sube + 0.35 * np.sin(tono) * sube
    guardar("riser.wav", riser, 0.6)

    # pelota: transitorio de ruido brillante + cuerpo resonante que baja de tono
    x = t(0.18)
    tono = 2 * np.pi * np.cumsum(np.geomspace(1350, 950, len(x))) / SR
    cuerpo = np.sin(tono) * envolvente(len(x), 0.0006, 0.028)
    cuerpo += 0.45 * np.sin(2 * np.pi * 420 * x) * envolvente(len(x), 0.0008, 0.02)
    chasquido = pasabanda_barrido(rng.standard_normal(len(x)), 3200, 2200, 2.5) * envolvente(len(x), 0.0003, 0.006)
    guardar("pelota.wav", cuerpo + 0.9 * chasquido, 0.75)

    # palmas: golpe grave corto (bombo seco) para los cortes al ritmo
    x = t(0.35)
    tono = 2 * np.pi * np.cumsum(np.geomspace(150, 55, len(x))) / SR
    seco = np.sin(tono) * envolvente(len(x), 0.001, 0.09)
    seco += 0.35 * pasabanda_barrido(rng.standard_normal(len(x)), 2500, 900, 1.5) * envolvente(len(x), 0.0005, 0.02)
    guardar("palmas.wav", seco, 0.85)

    print("SFX ->", OUT, sorted(p.name for p in OUT.glob("*.wav")))


if __name__ == "__main__":
    main()
