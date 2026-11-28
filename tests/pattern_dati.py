"""Controlli di costruzione su pattern.json: ogni tavola ha un motore che esiste, un'idea, paragrafi veri del quaderno, testi in voce da manuale.
Uso: python3 tests/pattern_dati.py   (con LEGGIO_CHIAVE controlla anche che i paragrafi citati esistano nel quaderno)."""
import hashlib, json, os, pathlib, re, sys

REPO = pathlib.Path(__file__).resolve().parent.parent
VIETATE = re.compile(r"\b(maestro|insegnante|a lezione|il prof)\b", re.I)   # voce impersonale
# Nomi di persona da non scrivere mai: il repository è pubblico, quindi qui ci sono solo le loro impronte (sha256, primi 16 caratteri)
NOMI_H = {"12141ce5eaacba5d", "5705a82920cee05c", "5dfd46e27a5e3e8e", "5f3d6952c5c5e220", "707a679aac35b386", "a5788efaac0c6f8d", "c10e16860a916580", "e4c2eed8a6df0147", "f19cb2e90d327cf8"}
def nome_vietato(testo):
    return next((w for w in re.findall(r"[^\W\d_]+", testo.lower()) if hashlib.sha256(w.encode()).hexdigest()[:16] in NOMI_H), None)
CAMPI = ("id", "titolo", "sotto", "idea", "par", "motore", "guarda")

def testi(t):
    out = [t.get("titolo", ""), t.get("sotto", ""), t.get("prova", "")] + list(t.get("guarda", [])) + list(t.get("formule", []))
    out += [c.get("corso", "") + " " + c.get("tema", "") for c in t.get("corsi", [])]
    c = t.get("calcolo", []); out += c if isinstance(c, list) else [c]
    return [x for x in out if isinstance(x, str)]

def problemi(dati, repo=REPO, paragrafi=None):
    """Lista dei difetti (vuota = tutto a posto). paragrafi: insieme dei numeri di paragrafo del quaderno, se disponibile."""
    P, visti = [], set()
    idee = {i.get("id") for i in dati.get("idee", [])}
    sw = (repo / "sw.js").read_text(encoding="utf-8")
    mm = re.search(r"const MOTORI = \[([^\]]*)\]", sw); in_sw = set(re.findall(r"'([a-z0-9-]+)'", mm.group(1))) if mm else set()
    if dati.get("schema") != 1: P.append("schema diverso da 1")
    for f in ("pattern.html", "pattern.json", "pattern/nucleo.js", "pattern/grafico.js"):
        if f"'./{f}'" not in sw: P.append(f"sw.js: manca ./{f} tra i file per l'uso senza rete")
    # il service worker installa tutto o niente: un file elencato che non esiste bloccherebbe ogni aggiornamento dell'app
    for u in re.findall(r"'\./([^'$]+)'", sw):
        if u and not (repo / u).exists(): P.append(f"sw.js elenca ./{u}, che non esiste: l'app non si aggiornerebbe più")
    su_disco = {f.stem for f in (repo / "pattern" / "motori").glob("*.js")}
    if in_sw != su_disco: P.append(f"sw.js: l'elenco MOTORI non coincide con i file in pattern/motori ({sorted(in_sw ^ su_disco)})")
    for t in dati.get("tavole", []):
        i = t.get("id", "?")
        for c in CAMPI:
            if not t.get(c): P.append(f"{i}: manca «{c}»")
        if not re.fullmatch(r"[a-z0-9-]+", str(i)): P.append(f"{i}: id non valido")
        if i in visti: P.append(f"{i}: id ripetuto")
        visti.add(i)
        if t.get("idea") not in idee: P.append(f"{i}: idea «{t.get('idea')}» non in elenco")
        m = str(t.get("motore", ""))
        if not re.fullmatch(r"[a-z0-9-]+", m) or not (repo / "pattern" / "motori" / f"{m}.js").exists(): P.append(f"{i}: il motore «{m}» non esiste")
        elif m not in in_sw: P.append(f"{i}: sw.js non ha «{m}» nell'elenco MOTORI (senza rete la tavola non si aprirebbe)")
        if m and not (repo / "tests" / "pattern" / f"{m}.test.js").exists(): P.append(f"{i}: il motore «{m}» non ha una prova in tests/pattern/")
        for p in t.get("par", []):
            if not re.fullmatch(r"\d+\.\d+", str(p)): P.append(f"{i}: paragrafo «{p}» scritto male")
            elif paragrafi is not None and p not in paragrafi: P.append(f"{i}: il paragrafo §{p} non esiste nel quaderno")
        if not (2 <= len(t.get("guarda", [])) <= 4): P.append(f"{i}: «guarda» deve avere da 2 a 4 punti")
        for g in t.get("guarda", []):
            if not re.match(r"\*\*[^*]{2,40}\*\*:", g): P.append(f"{i}: un punto di «guarda» non apre con le parole chiave in grassetto")
        if len(t.get("titolo", "")) > 110: P.append(f"{i}: titolo oltre 110 caratteri")
        for x in testi(t):
            v = VIETATE.search(x)
            if v: P.append(f"{i}: voce non da manuale («{v.group(0)}»)")
            if nome_vietato(x): P.append(f"{i}: nome di persona in un testo")
            if x.count("**") % 2 or x.count("`") % 2: P.append(f"{i}: grassetto o formula non chiusi in «{x[:30]}…»")
    return P

def paragrafi_del_quaderno():
    if not os.environ.get("LEGGIO_CHIAVE", "").strip(): return None
    sys.path.insert(0, str(REPO / "tools"))
    import quaderno as QT
    return {str(s["num"]) for l in QT.decifra()["lezioni"] for s in l.get("sezioni", [])}

if __name__ == "__main__":
    d = json.loads((REPO / "pattern.json").read_text(encoding="utf-8"))
    par = paragrafi_del_quaderno()
    pr = problemi(d, paragrafi=par)
    print(f"{len(d['tavole'])} tavole, paragrafi del quaderno {'controllati' if par is not None else 'NON controllati (manca LEGGIO_CHIAVE)'}")
    for x in pr: print("ERR", x)
    print("TUTTO OK" if not pr else "CI SONO ERRORI"); sys.exit(1 if pr else 0)
