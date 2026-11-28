"""Valori di riferimento per pattern/motori/battimenti.js.
- frequenze: music21; rapporti puri: fractions; scarto in centesimi tra l'intervallo del pianoforte (in semitoni, da music21) e quello puro;
- battimenti: la somma delle due sinusoidi è campionata a 48 000 punti al secondo per 3 secondi; l'inviluppo è stimato come massimo
  di |somma| su finestre lunghe un periodo della portante, si misura la distanza tra gli zeri: deve essere 1/Δf.
Uso: python3 tests/pattern/battimenti.rif.py  → riscrive tests/pattern/battimenti.rif.json"""
import json, math, pathlib
from fractions import Fraction as F
from music21 import pitch, interval
import numpy as np

INT = {"quinta": ("G4", F(3, 2)), "quarta": ("F4", F(4, 3)), "terza": ("E4", F(5, 4)), "terzamin": ("E-4", F(6, 5))}
do4 = pitch.Pitch("C4")
out = {}
for k, (alta, r) in INT.items():
    pa = pitch.Pitch(alta); fb, fa = do4.frequency, pa.frequency
    f1, f2 = r.numerator * fb, r.denominator * fa
    semitoni = interval.Interval(do4, pa).semitones
    # campionamento
    sr, T = 48000, 3.0
    t = np.arange(int(sr * T)) / sr
    s = np.sin(2 * np.pi * f1 * t) + np.sin(2 * np.pi * f2 * t)
    w = int(round(sr / ((f1 + f2) / 2))) + 1
    env = np.array([np.abs(s[i:i + w]).max() for i in range(0, len(s) - w, w)])
    tt = np.arange(len(env)) * w / sr + w / (2 * sr)
    # i minimi (gli zeri dell'inviluppo) sono stretti e si localizzano meglio dei massimi, larghi: la loro distanza è il periodo
    minimi = [tt[i] for i in range(1, len(env) - 1) if env[i] <= env[i - 1] and env[i] < env[i + 1] and env[i] < 0.3]
    passo = float(np.mean(np.diff(minimi))) if len(minimi) > 1 else None
    out[k] = {"fBassa": fb, "fAlta": fa, "armBasso": r.numerator, "armAlto": r.denominator, "f1": f1, "f2": f2, "battimenti": abs(f1 - f2),
              "scartoCents": 100 * semitoni - 1200 * math.log2(r), "passo_campionato": passo, "primo_minimo": minimi[0],
              "inviluppo_max": float(env.max())}
# identità sin a + sin b = 2 cos((a-b)/2) sin((a+b)/2) in punti casuali con seme fisso
rng = np.random.default_rng(7); a, b = rng.uniform(-50, 50, 5000), rng.uniform(-50, 50, 5000)
out["identita_errore_max"] = float(np.max(np.abs(np.sin(a) + np.sin(b) - 2 * np.cos((a - b) / 2) * np.sin((a + b) / 2))))
pathlib.Path(__file__).with_name("battimenti.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print({k: (round(v["battimenti"], 4), v["passo_campionato"] and round(v["passo_campionato"], 4)) for k, v in out.items() if isinstance(v, dict)})
