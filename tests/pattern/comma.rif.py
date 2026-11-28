"""Valori di riferimento per pattern/motori/comma.js, da rapporti esatti (fractions) e math.log2.
Strade diverse da quelle del motore:
- la quinta mesotonica come radice quarta di 5 (quattro quinte = terza pura 5/4 più due ottave), non come quinta pura meno ¼ di comma;
- il lupo come rapporto esatto 2^7 / q^11; le terze come prodotto di quattro rapporti consecutivi;
- la catena delle quinte pure come frazioni (3/2)^k ridotte nell'ottava, confrontate con i tasti equabili.
Uso: python3 tests/pattern/comma.rif.py  → riscrive tests/pattern/comma.rif.json"""
import json, math, pathlib
from fractions import Fraction as F

def c(r): return 1200 * math.log2(r)  # centesimi di un rapporto (float o Fraction)
def ottava(r):  # riporta un rapporto nell'ottava [1, 2)
    while r >= 2: r /= 2
    while r < 1: r *= 2
    return r

pura = F(3, 2)
quinte = {"pitagorica": float(pura), "mesotonica": 5 ** 0.25, "equabile": 2 ** (7 / 12)}
LUPO = 8
acc = {}
for nome, q in quinte.items():
    rapporti = [q] * 12; rapporti[LUPO] = 2 ** 7 / q ** 11
    cents = [c(r) for r in rapporti]
    terze = [c(math.prod(rapporti[(k + j) % 12] for j in range(4)) / 4) for k in range(12)]
    acc[nome] = {"quinte": cents, "scarti": [x - c(pura) for x in cents], "totale": sum(cents), "somma_scarti": sum(cents) - 12 * c(pura),
                 "terza": c(q ** 4 / 4), "terze": terze, "lupo": cents[LUPO],
                 "catena": {str(k): c(q ** k / 2 ** math.floor(k * 7 / 12)) - 100 * ((7 * k) % 12) for k in range(-1, 13)}}

# catena pitagorica esatta: nota a k quinte dal do, nell'ottava, in centesimi (tabella del §4.10 A.3)
tabella = {str(k): c(ottava(pura ** k)) for k in range(-6, 7)}
out = {
    "quinta_pura": c(pura), "comma_pitagorico": c(F(3 ** 12, 2 ** 19)), "comma_sintonico": c(F(81, 80)), "terza_pura": c(F(5, 4)),
    "comma_rapporto": float(F(3 ** 12, 2 ** 19)), "dodici_quinte": float(pura ** 12), "accordature": acc, "tabella_A3": tabella,
    "quinte_41": c(pura ** 41 / 2 ** 24), "quinte_53": c(pura ** 53 / 2 ** 31), "quinte_5": c(pura ** 5 / 2 ** 3),
    "intervalli_A2": {k: c(F(*map(int, k.split("/")))) for k in ("3/2", "4/3", "5/4", "6/5", "5/3", "8/5")},
}
pathlib.Path(__file__).with_name("comma.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto comma.rif.json:", {k: round(v["somma_scarti"], 6) for k, v in acc.items()}, "lupo meso", round(acc["mesotonica"]["lupo"], 3))
