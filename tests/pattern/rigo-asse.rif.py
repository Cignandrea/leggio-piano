"""Valori di riferimento per pattern/motori/rigo-asse.js: le chiavi di music21 (clef.lowestLine) e una regola di scrittura dei diesis.
Uso: python3 tests/pattern/rigo-asse.rif.py  → riscrive tests/pattern/rigo-asse.rif.json"""
import json, pathlib
from music21 import clef, pitch, key

IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
def nota(dnn):                 # numero diatonico di music21 → «si4»
    p = pitch.Pitch(); p.diatonicNoteNum = dnn
    return IT[p.step] + str(p.octave)
DO4 = pitch.Pitch("C4").diatonicNoteNum

# Posizione p sul rigo (0 = primo rigo): music21 dà il numero diatonico del primo rigo di ogni chiave.
chiavi = {}
for nome, c in (("violino", clef.TrebleClef()), ("basso", clef.BassClef())):
    chiavi[nome] = {"intercetta": c.lowestLine - DO4, "note": {str(p): nota(c.lowestLine + p) for p in range(-2, 11)}}

# I diesis in armatura: ordine da music21 (KeySignature(7)); posto sul rigo con la regola di incisione dei diesis in chiave di violino:
# ogni diesis va sull'unico posto tra il secondo spazio (p = 3) e lo spazio sopra il quinto rigo (p = 9) che in chiave di violino ha il suo nome.
# music21 non espone le posizioni grafiche dell'armatura: la regola qui è un secondo metodo, indipendente dalla lista del motore.
tre = clef.TrebleClef().lowestLine
diesis = []
for p in key.KeySignature(7).alteredPitches:
    posti = [q for q in range(3, 10) if nota(tre + q)[:-1] == IT[p.step]]
    diesis.append({"nome": IT[p.step] + "♯", "p": posti[0], "n_posti": len(posti)})

# Il §5.1, copiato a mano: fa♯ quinto rigo (8), do♯ terzo spazio (5), sol♯ sopra il quinto rigo (9), re♯ quarto rigo (6)
par_5_1 = [8, 5, 9, 6]
out = {"chiavi": chiavi, "diesis": diesis, "par_5_1": par_5_1, "do_centrale": {"violino": -2 if chiavi["violino"]["note"]["-2"] == "do4" else None, "basso": 10 if chiavi["basso"]["note"]["10"] == "do4" else None}}
pathlib.Path(__file__).with_name("rigo-asse.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto rigo-asse.rif.json:", [d["p"] for d in diesis], {k: v["intercetta"] for k, v in chiavi.items()})
