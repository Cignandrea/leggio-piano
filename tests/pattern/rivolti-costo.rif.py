"""Valori di riferimento per pattern/motori/rivolti-costo.js: forza bruta su tutte le terne di tasti, con le triadi di do maggiore da music21.
Uso: python3 tests/pattern/rivolti-costo.rif.py  → riscrive tests/pattern/rivolti-costo.rif.json"""
import json, pathlib
from itertools import product
from music21 import key, roman

k = key.Key("C")
TRIADI = [[p.pitchClass for p in roman.RomanNumeral(r, k).pitches] for r in ("I", "ii", "iii", "IV", "V", "vi", "viio")]
LO, HI = 36, 96   # do2 … do7: un intervallo molto più ampio di quello che serve

def partenza(pc, b):
    """La terna di partenza: nota al basso tra do4 e si4, le altre subito sopra (la convenzione del motore, ricostruita qui)."""
    v = [60 + pc[b]]
    for i in (1, 2):
        m = 60 + pc[(b + i) % 3]
        while m <= v[-1]: m += 12
        v.append(m)
    return v

def terne(pc, stretta):
    """Tutte le terne crescenti di tasti tra LO e HI con esattamente le tre note dell'accordo (nessun raddoppio).
    Con stretta=True solo quelle che stanno dentro un'ottava (posizione stretta)."""
    tasti = [[m for m in range(LO, HI + 1) if m % 12 == p] for p in pc]
    for t in product(*tasti):
        s = sorted(t)
        if s[0] < s[1] < s[2] and (not stretta or s[2] - s[0] < 12): yield s

def costo(a, b): return sum(abs(x - y) for x, y in zip(a, b))
def rivolto(pc, s): return pc.index(s[0] % 12)   # 0 fondamentale al basso, 1 terza, 2 quinta

out = {"triadi": TRIADI, "casi": {}}
for da in range(7):
    for pos in range(3):
        p = partenza(TRIADI[da], pos)
        for a in range(7):
            strette = list(terne(TRIADI[a], True))
            per_riv = [min(costo(p, s) for s in strette if rivolto(TRIADI[a], s) == b) for b in range(3)]
            libero = min(costo(p, s) for s in terne(TRIADI[a], False))
            out["casi"][f"{da},{pos},{a}"] = {"partenza": p, "rivolti": per_riv, "min_stretta": min(per_riv), "min_libera": libero,
                                               "comuni": len(set(TRIADI[da]) & set(TRIADI[a]))}
pathlib.Path(__file__).with_name("rivolti-costo.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
diversi = [c for c, v in out["casi"].items() if v["min_libera"] != v["min_stretta"]]
print("scritto rivolti-costo.rif.json:", len(out["casi"]), "casi; posizioni larghe che costano meno:", diversi)
