"""Valori di riferimento per pattern/motori/fibonacci.js: interi esatti, frazioni e φ in Decimal a 60 cifre.
F(n) per somma iterata su interi Python (senza limite di grandezza); i rapporti come Fraction; φ = (1 + √5)/2 con Decimal;
alternanza sopra/sotto φ e decrescita di |r − φ| verificate qui fino a n = 30, confrontando frazioni con φ in Decimal.
Uso: python3 tests/pattern/fibonacci.rif.py  → riscrive tests/pattern/fibonacci.rif.json"""
import json, math, pathlib
from fractions import Fraction as F
from decimal import Decimal, getcontext

getcontext().prec = 60
phi = (1 + Decimal(5).sqrt()) / 2
fib = [0, 1]
while len(fib) < 40: fib.append(fib[-1] + fib[-2])
PURI = {F(2, 1): "ottava", F(3, 2): "quinta", F(4, 3): "quarta", F(5, 4): "terza maggiore", F(6, 5): "terza minore", F(5, 3): "sesta maggiore", F(8, 5): "sesta minore"}
rapporti = {}
for n in range(1, 31):
    r = F(fib[n + 2], fib[n + 1])
    d = Decimal(r.numerator) / Decimal(r.denominator) - phi
    rapporti[str(n)] = {"num": fib[n + 2], "den": fib[n + 1], "valore": float(r), "cents": 1200 * math.log2(r), "segno": 1 if d > 0 else -1,
                        "distanza": float(abs(d)), "puro": PURI.get(r)}
alterna = all(rapporti[str(n)]["segno"] == -rapporti[str(n + 1)]["segno"] for n in range(1, 30))
decresce = all(Decimal(rapporti[str(n + 1)]["distanza"]) < Decimal(rapporti[str(n)]["distanza"]) for n in range(1, 30))
out = {"fib": fib[:31], "phi": str(phi), "cents_phi": 1200 * math.log2(float(phi)), "rapporti": rapporti, "alterna_fino_a_30": alterna, "decresce_fino_a_30": decresce}
pathlib.Path(__file__).with_name("fibonacci.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto fibonacci.rif.json; alterna:", alterna, "decresce:", decresce, "φ in centesimi:", out["cents_phi"])
