"""Aiuti per scrivere un capitolo del quaderno (schema 3: il quaderno è un manuale) da un build script.

Uso, da uno script tenuto FUORI dal repository:
    import sys; sys.path.insert(0, "<repo>/tools"); from capitolo import *
    lezione = {...}                       # vedi claude/Quaderno-schema.md nel Project
    salva(lezione, parti={"III": ["5.1", "5.2"], "V": ["5.3"]}, argomenti_nuovi={...}, domande={...}, stato={...})

`salva` decifra il quaderno, sostituisce o aggiunge il capitolo, mette ogni paragrafo nuovo nella sua parte
dell'ordine per argomento, controlla tutto (problemi_schema3 dello strumento, più gli ABC con music21) e ricifra.
Se un controllo non passa non scrive nulla. Serve LEGGIO_CHIAVE nell'ambiente.
"""
import datetime, json, sys
import quaderno as Q

ROMANI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]


def T(md): return {"tipo": "testo", "md": md}
def F(fig, didascalia): return {"tipo": "figura", "figura": fig, "didascalia": didascalia}
def E(titolo, md, abc=None):
    b = {"tipo": "esempio", "titolo": titolo, "md": md}
    if abc: b["abc"] = abc
    return b
def O(md, abc=None):
    """Approfondimento: un passo oltre il necessario, verificato come tutto il resto."""
    b = {"tipo": "oltre", "md": md}
    if abc: b["abc"] = abc
    return b
def V(metodo, md):
    """Una verifica del paragrafo. metodo: calcolo (music21, conti) | fonte (titolo, autore o ente, link) |
    registrazione (ciò che solo la lezione può dire: esercizi assegnati, con il minuto)."""
    assert metodo in Q.METODI, metodo
    return {"metodo": metodo, "md": md}
def S(num, titolo, argomenti, blocchi, verifiche):
    return {"num": num, "titolo": titolo, "argomenti": argomenti, "blocchi": blocchi, "verifiche": verifiche}
def tastiera(da, a, note=None, note_b=None, passi=False):
    f = {"tipo": "tastiera", "da": da, "a": a, "note": note or {}}
    if note_b: f["note_b"] = note_b
    if passi: f["passi"] = True
    return f
def abc(testo): return {"tipo": "abc", "abc": testo}
def compito(testo, metronomo=None, pagina=None, battute=None, fatto=False):
    return {"testo": testo, "metronomo": metronomo, "pagina": pagina, "battute": battute, "fatto": fatto}
def domanda(testo, argomento, sezione, lezione, creato):
    return {"testo": testo, "argomento": argomento, "sezione": sezione, "lezione": lezione, "stato": "aperta", "risposta": "", "creato": creato}
def argomento(titolo, area, definizione, lezioni, oggi):
    assert area in ("Tecnica", "Lettura", "Ritmo", "Teoria", "Brani", "Postura", "Altro"), area
    return {"titolo": titolo, "area": area, "strumento": "piano", "definizione": definizione, "lezioni": lezioni, "aggiornato": oggi}


def abc_di(lez):
    for s in lez.get("sezioni") or []:
        for b in s.get("blocchi") or []:
            if b.get("abc"): yield s["num"], b["abc"]
            if b.get("tipo") == "figura" and (b.get("figura") or {}).get("tipo") == "abc": yield s["num"], b["figura"]["abc"]


def problemi_abc(lez):
    """Ogni ABC deve essere leggibile da music21 e avere note. Senza music21 lo dice: non lo salta in silenzio."""
    try:
        from music21 import converter
    except ImportError:
        return ["music21 non è installato: gli ABC non sono stati controllati (pip install music21)"]
    p = []
    for num, testo in abc_di(lez):
        try:
            n = len(list(converter.parse(testo, format="abc").recurse().notes))
            if n == 0: p.append(f"§{num}: ABC senza note")
        except Exception as e:
            p.append(f"§{num}: ABC illeggibile ({e})")
    return p


def salva(lezione, parti, argomenti_nuovi=None, argomenti_aggiorna=None, domande=None, domande_risolte=None, stato=None, percorso=None, prova=False):
    """lezione: dict con «id» (AAAA-MM-GG-piano). parti: {"III": ["5.1", …]} dove mettere i paragrafi nuovi
    (in coda alla parte; una parte nuova si passa come {"VII": {"titolo": …, "intro": …, "sezioni": […]}}).
    prova=True controlla e non scrive."""
    d = Q.decifra()
    lez = dict(lezione); lid = lez.pop("id"); lez["_id"] = lid
    vecchia = next((x for x in d["lezioni"] if x.get("_id") == lid), None)
    if vecchia:  # riscrittura: le spunte dei compiti restano
        fatti = {c["testo"] for c in vecchia.get("compiti") or [] if c.get("fatto")}
        for c in lez.get("compiti") or []:
            if c["testo"] in fatti: c["fatto"] = True
        d["lezioni"][d["lezioni"].index(vecchia)] = lez
    else:
        d["lezioni"].append(lez)
    for slug, doc in (argomenti_nuovi or {}).items():
        d["argomenti"] = [a for a in d["argomenti"] if a.get("_id") != slug] + [{**doc, "_id": slug}]
    for slug, lezioni in (argomenti_aggiorna or {}).items():
        a = next(x for x in d["argomenti"] if x.get("_id") == slug); a["lezioni"] = lezioni; a["aggiornato"] = lez["data"]
    for qid, doc in (domande or {}).items():
        d["domande"] = [q for q in d["domande"] if q.get("_id") != qid] + [{**doc, "_id": qid}]
    for qid, risposta in (domande_risolte or {}).items():
        q = next(x for x in d["domande"] if x.get("_id") == qid); q["stato"] = "risolta"; q["risposta"] = risposta
    man = d.setdefault("manuale", {"parti": []})
    nuovi = {str(s["num"]) for s in lez["sezioni"]}
    for parte in man["parti"]:  # in riscrittura i paragrafi tolti dal capitolo escono dall'ordine
        parte["sezioni"] = [x for x in parte["sezioni"] if not (str(x).startswith(f"{lez['numero']}.") and str(x) not in nuovi)]
    for rom, cosa in (parti or {}).items():
        i = ROMANI.index(rom)
        if isinstance(cosa, dict):
            assert i == len(man["parti"]), f"la parte {rom} nuova deve essere la successiva all'ultima"
            man["parti"].append(cosa)
        else:
            gia = {str(x) for p in man["parti"] for x in p["sezioni"]}
            man["parti"][i]["sezioni"] += [x for x in cosa if str(x) not in gia]
    man["aggiornato"] = datetime.date.today().isoformat()
    if stato: d["stato"] = {**(d.get("stato") or {}), **stato, "schema": 3}
    if percorso: d["percorso"] = {**(d.get("percorso") or {}), **percorso}
    pr = Q.problemi_schema3(d) + problemi_abc(lez)
    for x in pr: print("PROBLEMA:", x)
    if pr: sys.exit("niente è stato scritto")
    if prova: print("prova: controlli superati, niente scritto"); return d
    Q.cifra(d)
    print(f"capitolo {lez['numero']} scritto: {len(lez['sezioni'])} paragrafi; quaderno ricifrato")
    return d
