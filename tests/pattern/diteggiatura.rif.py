"""Valori di riferimento per pattern/motori/diteggiatura.js, ricavati in modo indipendente.
Le dita sono gli elenchi del quaderno (§1.2) copiati a mano; note e tasti neri vengono da music21;
coincidenze e passaggi si trovano confrontando gli elenchi posizione per posizione (forza bruta), senza la regola di periodo 7.
Uso: python3 tests/pattern/diteggiatura.rif.py  → riscrive tests/pattern/diteggiatura.rif.json"""
import json, pathlib
from music21 import key

IT = {"C": "do", "D": "re", "E": "mi", "F": "fa", "G": "sol", "A": "la", "B": "si"}
def it(nome): return IT[nome[0]] + nome[1:].replace("#", "♯").replace("-", "♭")

# §1.2, salendo, scritti come nel quaderno (i «|» separano i gruppi)
ELENCHI = {
    1: {"d": "1-2-3 | 1-2-3-4-5", "s": "5-4-3-2-1 | 3-2-1"},
    2: {"d": "1-2-3 | 1-2-3-4 | 1-2-3 | 1-2-3-4-5", "s": "5-4-3-2-1 | 3-2-1 | 4-3-2-1 | 3-2-1"},
}
def dita(testo): return [int(x) for x in testo.replace("|", "-").replace(" ", "").split("-") if x]

def passaggi(f, cresce):
    """Il passaggio è un salto contro il verso naturale delle dita: per la destra che sale le dita crescono 1→5."""
    out = []
    for i in range(1, len(f)):
        d = f[i] - f[i - 1]
        if (d < 0) if cresce else (d > 0): out.append({"nota": i + 1, "dito": f[i], "prima": f[i - 1]})
    return out

ottave = {}
for o, e in ELENCHI.items():
    d, s = dita(e["d"]), dita(e["s"])
    assert len(d) == len(s) == 7 * o + 1
    s_giu = list(reversed(s))   # la sinistra che scende ripercorre all'indietro le dita della salita
    ottave[str(o)] = {
        "d": d, "s": s, "s_giu": s_giu,
        "coincidenze_parallelo": [{"nota": i + 1, "dito": a} for i, (a, b) in enumerate(zip(d, s)) if a == b],
        "coincidenze_contrario": [{"nota": i + 1, "dito": a} for i, (a, b) in enumerate(zip(d, s_giu)) if a == b],
        "passaggi_d": passaggi(d, True), "passaggi_s": passaggi(s, False), "passaggi_s_giu": passaggi(s_giu, True),
    }

TONICHE = {0: "C", 1: "G", 2: "D", 3: "A", 4: "E"}
scale = {}
for t, nome in TONICHE.items():
    k = key.Key(nome)
    ps = k.getScale().getPitches(nome + "4", nome + "6")       # due ottave salendo
    scale[str(t)] = {
        "note": [it(p.name) for p in ps], "midi": [int(p.ps) for p in ps],
        "nero": [p.accidental is not None and p.accidental.alter != 0 for p in ps[:7]],
        # tabella del §1.2: la destra riparte col pollice sulla 4ª nota, il medio della sinistra scavalca sulla 6ª (dagli elenchi)
        "pollice": it(ps[dita(ELENCHI[1]["d"]).index(1, 1)].name),
        "medio": it(ps[[i for i in range(1, 8) if dita(ELENCHI[1]["s"])[i] > dita(ELENCHI[1]["s"])[i - 1]][0]].name),
        "neri": [it(p.name) for p in ps[:7] if p.accidental is not None and p.accidental.alter != 0],
    }

# La tabella del §1.2 copiata a mano, come secondo controllo
TABELLA_1_2 = {"0": ["do", "", "fa", "la"], "1": ["sol", "fa♯", "do", "mi"], "2": ["re", "fa♯, do♯", "sol", "si"],
               "3": ["la", "do♯, fa♯, sol♯", "re", "fa♯"], "4": ["mi", "fa♯, sol♯, do♯, re♯", "la", "do♯"]}

out = {"ottave": ottave, "scale": scale, "tabella_1_2": TABELLA_1_2}
pathlib.Path(__file__).with_name("diteggiatura.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto diteggiatura.rif.json")
for o in ("1", "2"):
    r = ottave[o]; print(o, "ottave · medi/stessi:", r["coincidenze_parallelo"], "· passaggi d", [p["nota"] for p in r["passaggi_d"]], "s", [p["nota"] for p in r["passaggi_s"]])
