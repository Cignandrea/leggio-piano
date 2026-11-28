"""Valori di riferimento per pattern/motori/tempo.js, ricavati in modo indipendente.
Durate esatte con le frazioni (60/BPM come numero razionale), pendenza con una differenza centrale numerica
(non con la formula −60/BPM²), tabella del §2.4 copiata a mano.
Uso: python3 tests/pattern/tempo.rif.py  → riscrive tests/pattern/tempo.rif.json"""
import json, pathlib
from fractions import Fraction as F

def durata(b): return F(60, b)                      # secondi in un minuto, divisi per i battiti

punti = {}
for b in range(40, 181):
    T, T10 = durata(b), durata(b + 10)
    h = 1e-4
    deriv = (60 / (b + h) - 60 / (b - h)) / (2 * h)   # differenza centrale
    punti[str(b)] = {
        "durata": float(T), "minima": float(2 * T), "semibreve": float(4 * T),
        "guadagno_s": float(T - T10), "guadagno_pct": float((T - T10) / T * 100),
        "pendenza_num": deriv,
        "pari": [float(T / 2), float(T / 2)], "shuffle": [float(T * F(2, 3)), float(T * F(1, 3))],
    }

# §2.4: figura → (tempi in 4/4, secondi a 60, secondi a 120)
TABELLA_2_4 = {"semibreve": [4, "4", "2"], "minima": [2, "2", "1"], "semiminima": [1, "1", "0,5"]}
# frasi della tavola: perdita percentuale salendo di dieci tra i gradini del §5.3, esatte
gradini = {"60→70": str(F(70 - 60, 70) * 100), "70→80": str(F(80 - 70, 80) * 100)}

out = {"punti": punti, "tabella_2_4": TABELLA_2_4, "gradini_pct_esatti": gradini}
pathlib.Path(__file__).with_name("tempo.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto tempo.rif.json:", len(punti), "valori di BPM; gradini", gradini)
