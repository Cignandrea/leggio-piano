"""Valori di riferimento per pattern/motori/gradini.js, ricavati in modo indipendente dalla formula chiusa.
(a) Risoluzione esatta del sistema lineare dei giri attesi con le frazioni (eliminazione di Gauss);
(b) simulazione Monte Carlo con seme fisso (200 000 partite per caso);
(c) la regola alternativa «si torna al gradino appena sotto», risolta allo stesso modo, per controllare la frase sui limiti del modello.
Uso: python3 tests/pattern/gradini.rif.py  → riscrive tests/pattern/gradini.rif.json"""
import json, pathlib, random
from fractions import Fraction as F

def risolvi(A, b):
    """Gauss-Jordan esatto su frazioni."""
    n = len(A); M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        r = next(i for i in range(c, n) if M[i][c] != 0); M[c], M[r] = M[r], M[c]
        piv = M[c][c]; M[c] = [x / piv for x in M[c]]
        for i in range(n):
            if i != c and M[i][c] != 0:
                f = M[i][c]; M[i] = [a - f * bb for a, bb in zip(M[i], M[c])]
    return [M[i][n] for i in range(n)]

def attesi(p0, p1, p2, ritorno=(0, 0)):
    """Incognite E60, E70, E80; ritorno = gradino a cui si torna se fallisce 70 e 80 (0 = 60, 1 = 70).
    E_i = 1 + p_i·E_{i+1} + (1 − p_i)·E_{dove si torna}, con E_fine = 0 e a 60 si ripete 60."""
    p = [p0, p1, p2]; dove = [0, ritorno[0], ritorno[1]]
    A = [[F(0)] * 3 for _ in range(3)]; b = [F(1)] * 3
    for i in range(3):
        A[i][i] += 1
        if i < 2: A[i][i + 1] -= p[i]
        A[i][dove[i]] -= (1 - p[i])
    return risolvi(A, b)

def simula(p, partite, rng):
    tot = 0
    for _ in range(partite):
        g, n = 0, 0
        while g < 3:
            n += 1
            g = g + 1 if rng.random() < p[g] else 0
        tot += n
    return tot / partite

curva = {}
for k in range(30, 101, 5):
    p = F(k, 100); e = attesi(p, p, p)
    alt = attesi(p, p, p, ritorno=(0, 1))
    curva[str(k)] = {"E60": float(e[0]), "E70": float(e[1]), "E80": float(e[2]), "esatto": str(e[0]), "resa": float(p ** 3), "alternativa": float(alt[0])}

rng = random.Random(20261128)
casi = [(0.9, 0.9, 0.9), (0.8, 0.8, 0.8), (0.5, 0.5, 0.5), (0.9, 0.8, 0.6), (0.6, 0.9, 0.7)]
mc = []
for c in casi:
    e = attesi(*(F(str(x)) for x in c))
    mc.append({"p": c, "esatto": float(e[0]), "simulato": simula(c, 200_000, rng), "resa": c[0] * c[1] * c[2]})

out = {"curva": curva, "montecarlo": mc, "tolleranza_mc_relativa": 0.02,
       "spec": {"0.9": 3.72, "0.8": 4.77, "0.5": 14, "0.3": 51.5}}
pathlib.Path(__file__).with_name("gradini.rif.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("scritto gradini.rif.json"); [print(m) for m in mc]
print({k: (round(v["E60"], 3), round(v["alternativa"], 3)) for k, v in curva.items() if k in ("30", "50", "80", "90")})
