"""Valori di riferimento per pattern/motori/esercizi-grafico.js: ogni figura di esercizi.json espansa in note
con un'implementazione indipendente. I tasti bianchi si contano con music21 (diatonicNoteNum), i nomi delle note
li dà music21; il conteggio dei gruppi è scritto da capo. Le relazioni tra le mani si classificano in modo diverso:
con la regressione esatta r = a·l + b (a = 1 parallelo, a = −1 specchio), su frazioni.
Uso: python3 tests/pattern/esercizi-grafico.rif.py  → riscrive tests/pattern/esercizi-grafico.rif.json"""
import json, pathlib
from fractions import Fraction as F
from music21 import pitch

ROOT = pathlib.Path(__file__).resolve().parents[2]
IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
DNN0 = pitch.Pitch("C4").diatonicNoteNum - 35       # convenzione dell'app: do4 = tasto bianco 35 (MIDI 0 = do−1 = 0)

def nome(b):
    p = pitch.Pitch(); p.diatonicNoteNum = b + DNN0
    return IT[p.step] + str(p.octave)

def espandi(fig):
    out = {}
    L, G, passo = len(fig["seq"]), max(1, fig.get("gruppi") or 1), fig.get("passo") or 1
    for h in ("r", "l"):
        H = (fig.get("mani") or {}).get(h)
        if not H: continue
        seq = H.get("seq") or fig["seq"]
        b0 = pitch.Pitch(H["base"].replace("b", "-") if len(H["base"]) > 2 else H["base"]).diatonicNoteNum - DNN0
        note = []
        for g in range(G):
            for k in range(L):
                idx = seq[k] if isinstance(seq[k], list) else [seq[k]]
                for j in idx:
                    if not (0 <= j < len(H["tasti"])): continue
                    b = b0 + g * passo + H["tasti"][j]
                    note.append({"i": g * L + k + 1, "gruppo": g + 1, "bianco": b, "nome": nome(b), "dito": H["dita"][j]})
        out[h] = note
    return out

def relazione(nr, nl):
    if not nr or not nl: return {"tipo": "una mano"}
    r = {}; l = {}
    for n in nr: r.setdefault(n["i"], n["bianco"])
    for n in nl: l.setdefault(n["i"], n["bianco"])
    if set(r) != set(l): return {"tipo": "altro"}
    xs = [F(l[i]) for i in sorted(r)]; ys = [F(r[i]) for i in sorted(r)]
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs); sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    if sxx == 0: return {"tipo": "altro"}
    a = sxy / sxx; b = my - a * mx
    esatta = all(y == a * x + b for x, y in zip(xs, ys))
    if esatta and a == 1: return {"tipo": "parallelo", "c": int(b)}
    if esatta and a == -1: return {"tipo": "specchio", "c": int(b)}
    return {"tipo": "altro"}

lib = json.loads((ROOT / "esercizi.json").read_text(encoding="utf-8"))
casi = {}
for e in lib["esercizi"]:
    vs = [(v["id"], v["figura"]) for v in e.get("varianti", []) if v.get("figura")] or ([("", e["figura"])] if e.get("figura") else [])
    for vid, fig in vs:
        n = espandi(fig)
        L, G, passo = len(fig["seq"]), max(1, fig.get("gruppi") or 1), fig.get("passo") or 1
        # rampa: inizio di ogni gruppo, e pendenza come rapporto esatto tra salita totale e note percorse
        starts = {h: [[next(x["i"] for x in n[h] if x["gruppo"] == g), next(x["bianco"] for x in n[h] if x["gruppo"] == g)] for g in range(1, G + 1)] for h in n}
        pend = None
        if G > 1:
            h0 = next(iter(starts)); (i0, b0), (i1, b1) = starts[h0][0], starts[h0][-1]
            pend = float(F(b1 - b0, i1 - i0))
        casi[e["id"] + ("/" + vid if vid else "")] = {"note": n, "relazione": relazione(n.get("r"), n.get("l")), "rampa": starts, "pendenza": pend, "L": L, "G": G}

out = {"casi": casi}
pathlib.Path(__file__).with_name("esercizi-grafico.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto esercizi-grafico.rif.json:", {k: (v["relazione"], v["pendenza"], {h: len(x) for h, x in v["note"].items()}) for k, v in casi.items()})
