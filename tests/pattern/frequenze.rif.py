"""Valori di riferimento per pattern/motori/frequenze.js, ricavati senza la formula del motore.
- frequenze degli 88 tasti: music21 (pitch.Pitch(midi).frequency);
- raddoppio dopo 12 semitoni: prodotto ripetuto del fattore 2^(1/12) in aritmetica decimale a 50 cifre (radice dodicesima per Newton);
- ottave e decadi dell'estensione: math.log2 e math.log10 sulle frequenze di music21.
Uso: python3 tests/pattern/frequenze.rif.py  → riscrive tests/pattern/frequenze.rif.json"""
import json, math, pathlib
from decimal import Decimal, getcontext
from music21 import pitch

getcontext().prec = 50
freq = {str(n): pitch.Pitch(midi=n + 20).frequency for n in range(1, 89)}
nomi = {str(n): pitch.Pitch(midi=n + 20).nameWithOctave for n in range(1, 89)}

# radice dodicesima di 2 con il metodo di Newton, in Decimal: r ← r − (r¹² − 2) / (12 r¹¹)
r = Decimal("1.06")
for _ in range(60): r = r - (r ** 12 - 2) / (12 * r ** 11)
prodotto = Decimal(1)
for _ in range(12): prodotto *= r
fMin, fMax = freq["1"], freq["88"]
# metà ottava: tasto 6 semitoni sopra ogni la, rapporto con il la (dalle frequenze di music21) e corda lineare
meta = {str(k): {"rapporto": freq[str(7 + 12 * k)] / freq[str(1 + 12 * k)], "lineare": (freq[str(1 + 12 * k)] + freq[str(13 + 12 * k)]) / 2} for k in range(7)}
out = {"frequenze": freq, "nomi": nomi, "fattore": float(r), "tasso_percento": float((r - 1) * 100), "dodici_passi": str(prodotto),
       "estensione": {"fMin": fMin, "fMax": fMax, "ottave": math.log2(fMax / fMin), "decadi": math.log10(fMax / fMin)},
       "radice2": float(Decimal(2).sqrt()), "meta": meta}
pathlib.Path(__file__).with_name("frequenze.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto frequenze.rif.json; 12 passi =", str(prodotto)[:30], "; ottave", out["estensione"]["ottave"])
