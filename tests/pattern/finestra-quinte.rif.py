"""Valori di riferimento per pattern/motori/finestra-quinte.js, ricavati con music21 senza usare la retta delle quinte.
Uso: python3 tests/pattern/finestra-quinte.rif.py  → riscrive tests/pattern/finestra-quinte.rif.json"""
import json, pathlib
from itertools import combinations
from music21 import key, roman, pitch

IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
def it(nome): return IT[nome[0]] + nome[1:].replace("#", "♯").replace("-", "♭")

TONICHE = {-6: "G-", -5: "D-", -4: "A-", -3: "E-", -2: "B-", -1: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#"}
QUAL = {"major": "magg", "minor": "min", "diminished": "dim", "augmented": "aum"}
out = {}
for t, nome in TONICHE.items():
    k = key.Key(nome)
    sc = k.getScale().getPitches(nome + "4", nome + "5")[:7]          # i sette gradi, in ordine di grado
    tipi = [QUAL[roman.RomanNumeral(r, k).quality] for r in ("I", "ii", "iii", "IV", "V", "vi", "viio")]
    arm = [it(p.name) for p in k.alteredPitches]                       # l'ordine dell'armatura secondo music21
    # Il tritono: forza bruta su tutte le coppie di gradi, distanza di 6 semitoni in un verso o nell'altro.
    tritoni = [[i + 1, j + 1] for i, j in combinations(range(7), 2) if int(sc[j].ps - sc[i].ps) % 12 == 6]
    ultimo = k.alteredPitches[-1] if k.alteredPitches else None
    r = {"tonica": it(k.tonic.name), "scala": [it(p.name) for p in sc], "pc": sorted({int(p.ps) % 12 for p in sc}),
         "tipi": tipi, "armatura": arm, "relativa": it(k.relative.tonic.name), "relativa_modo": k.relative.mode, "tritoni": tritoni}
    if k.sharps > 0:   # «la tonica sta un semitono sopra l'ultimo diesis»: distanza in semitoni dall'ultimo diesis alla tonica
        r["sopra_ultimo"] = (int(pitch.Pitch(k.tonic.name).ps) - int(pitch.Pitch(ultimo.name).ps)) % 12
        r["ultimo_grado"] = [p.name for p in sc].index(ultimo.name) + 1
    if k.sharps <= -2:  # «la tonica è il penultimo bemolle»
        r["penultimo"] = it(k.alteredPitches[-2].name)
    out[str(t)] = r

# Il §2.6 del quaderno, copiato a mano come controllo indipendente: funzioni dei sette gradi.
out["funzioni_2_6"] = ["T", "S", "T/D", "S", "D", "T", "D"]
pathlib.Path(__file__).with_name("finestra-quinte.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto finestra-quinte.rif.json:", len(TONICHE), "tonalità")
