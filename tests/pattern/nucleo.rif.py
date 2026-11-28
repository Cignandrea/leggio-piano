"""Valori di riferimento per pattern/nucleo.js, calcolati in modo indipendente con music21 e con le frazioni.
Uso: python3 tests/pattern/nucleo.rif.py  → riscrive tests/pattern/nucleo.rif.json"""
import json, pathlib
from fractions import Fraction
from math import log2
from music21 import key, scale, pitch, roman

IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
def it(nome):  # «F#» → «fa♯», «B-» → «si♭»
    return IT[nome[0]] + nome[1:].replace("#", "♯").replace("-", "♭")
def sigla(nome): return nome.replace("#", "♯").replace("-", "♭")

# Tonalità maggiori in ordine di quinte, da sol♭ (−6) a fa♯ (+6)
TONICHE = {-6: "G-", -5: "D-", -4: "A-", -3: "E-", -2: "B-", -1: "F", 0: "C", 1: "G", 2: "D", 3: "A", 4: "E", 5: "B", 6: "F#"}
QUAL = {"major": "magg", "minor": "min", "diminished": "dim", "augmented": "aum"}
SUFF = {"magg": "", "min": "m", "dim": "°", "aum": "+"}
ton = {}
for t, nome in TONICHE.items():
    k = key.Key(nome)
    gradi = []
    for num in ("I", "ii", "iii", "IV", "V", "vi", "viio"):
        rn = roman.RomanNumeral(num, k)
        q = QUAL[rn.quality]
        gradi.append({"note": [it(p.name) for p in rn.pitches], "tipo": q, "sigla": sigla(rn.root().name) + SUFF[q]})
    ton[str(t)] = {"tonica": it(k.tonic.name), "scala": [it(p.name) for p in k.getScale().getPitches()[:7]],
                   "armatura": [it(p.name) for p in k.alteredPitches], "gradi": gradi}

modi = {}
for nome, cls, da in (("locrio", scale.LocrianScale, "B"), ("frigio", scale.PhrygianScale, "E"), ("minore", scale.MinorScale, "A"), ("dorico", scale.DorianScale, "D"),
                      ("misolidio", scale.MixolydianScale, "G"), ("maggiore", scale.MajorScale, "C"), ("lidio", scale.LydianScale, "F")):
    ps = cls(pitch.Pitch(da + "4")).getPitches(da + "4", da + "5")
    modi[nome] = {"semitoni": [int(p.ps - ps[0].ps) for p in ps], "da": it(da), "note": [it(p.name) for p in ps]}

freq = {str(n): pitch.Pitch(midi=n + 20).frequency for n in range(1, 89)}
cents = {f"{a}/{b}": 1200 * log2(Fraction(a, b)) for a, b in ((2, 1), (3, 2), (4, 3), (5, 4), (6, 5), (5, 3), (8, 5), (81, 80), (531441, 524288))}

# La tabella del quaderno, §5.4, copiata a mano come secondo controllo indipendente
tabella = {"pop": {"0": "C G Am F", "1": "G D Em C", "2": "D A Bm G", "3": "A E F♯m D", "4": "E B C♯m A"},
           "arm": {"0": "C Am Dm G", "1": "G Em Am D", "2": "D Bm Em A", "3": "A F♯m Bm E", "4": "E C♯m F♯m B"}}

# La nota a n semitoni sopra il do, scritta come l'intervallo che ha quel nome (seconda minore = re bemolle, non do diesis)
from music21 import interval
INT = ["P1", "m2", "M2", "m3", "M3", "P4", "A4", "P5", "m6", "M6", "m7", "M7"]
int_do = [it(interval.Interval(n).transposePitch(pitch.Pitch("C4")).name) for n in INT]
assert [interval.Interval(n).semitones for n in INT] == list(range(12))

out = {"intervalli_da_do": int_do, "tonalita": ton, "modi": modi, "frequenze": freq, "cents": cents, "tabella_5_4": tabella}
pathlib.Path(__file__).with_name("nucleo.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto nucleo.rif.json:", len(ton), "tonalità,", len(modi), "modi,", len(freq), "frequenze")
