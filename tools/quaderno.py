"""Quaderno cifrato del Leggio.

Il quaderno vive nel repository solo cifrato (AES-256-GCM), in quaderno.cifrato.json.
La chiave non sta mai nel repository: si passa nella variabile d'ambiente LEGGIO_CHIAVE
(base64url, 32 byte). Il testo in chiaro va tenuto FUORI dal repository.

Uso:
  LEGGIO_CHIAVE=... python3 tools/quaderno.py decifra /tmp/quaderno.json
  LEGGIO_CHIAVE=... python3 tools/quaderno.py cifra /tmp/quaderno.json
  LEGGIO_CHIAVE=... python3 tools/quaderno.py controlla
  LEGGIO_CHIAVE=... python3 tools/quaderno.py cartelle /tmp/q [id]   (come le cartelle di ArtifactData, per la skill)
  LEGGIO_CHIAVE=... python3 tools/quaderno.py applica <out/>         (applica out/writes.json della skill e ricifra)

Dallo schema 3 (quaderno come manuale) il quaderno si cifra solo se supera i controlli di `problemi_schema3`:
ogni paragrafo ha il suo posto nell'ordine per argomento (manuale.parti), ha almeno una verifica, e il testo è in
voce da manuale. Se un controllo non passa, il quaderno pubblicato resta quello di prima.
"""
import base64, json, os, pathlib, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REPO = pathlib.Path(__file__).resolve().parent.parent
CIFRATO = REPO / "quaderno.cifrato.json"


def fuori_dal_repo(percorso):
    """Il testo in chiaro non entra mai nel repository: né nella radice né in una sottocartella."""
    r = pathlib.Path(percorso).resolve()
    if r == REPO or REPO in r.parents:
        sys.exit(f"fermo: {r} è dentro il repository; il quaderno in chiaro va fuori (es. /tmp)")
    return r


def b64d(s):
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def b64e(b):
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def chiave():
    k = os.environ.get("LEGGIO_CHIAVE", "").strip()
    if not k:
        sys.exit("Manca LEGGIO_CHIAVE (la chiave è nel Project Music Room, claude/Leggio.md).")
    kb = b64d(k)
    if len(kb) != 32:
        sys.exit("LEGGIO_CHIAVE non è una chiave da 32 byte.")
    return kb


def decifra():
    f = json.loads(CIFRATO.read_text(encoding="utf-8"))
    pt = AESGCM(chiave()).decrypt(b64d(f["iv"]), b64d(f["dati"]), None)
    return json.loads(pt.decode("utf-8"))


# ---------- schema 3: il quaderno è un manuale
METODI = ("calcolo", "fonte", "registrazione")
BLOCCHI = ("testo", "figura", "esempio", "oltre")
# Voce da manuale: nel testo non entrano le persone, la cronaca della lezione, le sigle di incertezza, il tempo relativo.
# Stanno fuori da questo controllo: verifiche, compiti, fonte e note del capitolo, domande.
VOCE = [(re.compile(rx, re.I), nome) for rx, nome in [
    (r"\bmaestr[oi]\b|\bjacopo\b|\bandrea\b", "persone"),
    (r"\blezion[ei]\b", "«lezione» (nel testo si dice «capitolo»)"),
    (r"\[(?:S|A|V|\?)\]", "sigle [S] [A] [V] [?]"),
    (r"da chiedere|da chiarire|da confermare|non è chiaro|non si capisce", "dubbi lasciati nel testo"),
    (r"la volta scorsa|l'altra volta|la prossima volta|per ora\b|più avanti vedremo", "tempo relativo"),
    (r"registrazion[ei]|trascrizion[ei]|whatsapp|\bappunti\b|\bvocal[ei]\b", "cronaca delle fonti (va nelle verifiche)"),
]]


def testi_di_voce(lez):
    """(dove, testo) per tutto ciò che deve avere voce da manuale."""
    yield "titolo", lez.get("titolo") or ""
    yield "cornice", lez.get("cornice") or ""
    for r in lez.get("riassunto") or []:
        yield f"scheda «{r.get('titolo')}»", f"{r.get('titolo') or ''}\n{r.get('md') or ''}"
    for s in lez.get("sezioni") or []:
        yield f"§{s.get('num')} titolo", s.get("titolo") or ""
        for b in s.get("blocchi") or []:
            pezzi = [b.get("md") or "", b.get("titolo") or "", b.get("didascalia") or ""]
            yield f"§{s.get('num')} {b.get('tipo')}", "\n".join(x for x in pezzi if x)


def problemi_schema3(d):
    """Controlli di costruzione dello schema 3. Lista vuota = il quaderno si può cifrare."""
    p = []
    slug = {a.get("_id") for a in d.get("argomenti") or []}
    dom = {q.get("_id") for q in d.get("domande") or []}
    nums = []
    for lez in d.get("lezioni") or []:
        n = lez.get("numero")
        for dove, testo in testi_di_voce(lez):
            for rx, nome in VOCE:
                m = rx.search(testo)
                if m: p.append(f"cap. {n}, {dove}: voce non da manuale ({nome}): «…{testo[max(0, m.start() - 30):m.end() + 30]}…»")
        for q in lez.get("domande") or []:
            if q not in dom: p.append(f"cap. {n}: domanda {q} non esiste")
        for s in lez.get("sezioni") or []:
            num = str(s.get("num"))
            nums.append(num)
            if not num.startswith(f"{n}."): p.append(f"§{num} non è del capitolo {n}")
            for a in s.get("argomenti") or []:
                if a not in slug: p.append(f"§{num}: argomento sconosciuto {a}")
            for b in s.get("blocchi") or []:
                if b.get("tipo") not in BLOCCHI: p.append(f"§{num}: blocco «{b.get('tipo')}» non ammesso (ammessi: {', '.join(BLOCCHI)})")
            ver = s.get("verifiche") or []
            if not ver: p.append(f"§{num}: nessuna verifica (ogni paragrafo ne ha almeno una)")
            for v in ver:
                if v.get("metodo") not in METODI or not (v.get("md") or "").strip():
                    p.append(f"§{num}: verifica senza metodo valido ({', '.join(METODI)}) o senza testo")
    doppi = sorted({x for x in nums if nums.count(x) > 1})
    if doppi: p.append(f"paragrafi con lo stesso numero: {doppi}")
    man = d.get("manuale") or {}
    posti = [str(x) for parte in man.get("parti") or [] for x in parte.get("sezioni") or []]
    if not man.get("parti"): p.append("manca manuale.parti (l'ordine per argomento)")
    for parte in man.get("parti") or []:
        if not (parte.get("titolo") or "").strip(): p.append("una parte del manuale non ha titolo")
    fuori = [x for x in nums if x not in posti]
    if fuori: p.append(f"paragrafi senza posto nell'ordine per argomento: {fuori}")
    orfani = [x for x in posti if x not in nums]
    if orfani: p.append(f"l'ordine per argomento cita paragrafi che non esistono: {orfani}")
    ripetuti = sorted({x for x in posti if posti.count(x) > 1})
    if ripetuti: p.append(f"paragrafi messi due volte nell'ordine per argomento: {ripetuti}")
    return p


def schema(d):
    try: return int((d.get("stato") or {}).get("schema") or 0)
    except (TypeError, ValueError): return 0


def cifra(dati):
    for k in ("lezioni", "argomenti", "domande"):
        if not isinstance(dati.get(k), list): sys.exit(f"manca la lista {k}")
    if schema(dati) >= 3:
        pr = problemi_schema3(dati)
        if pr: sys.exit("fermo: il quaderno non supera i controlli dello schema 3; quello pubblicato resta com'era.\n- " + "\n- ".join(pr))
    pt = json.dumps(dati, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    iv = os.urandom(12)
    ct = AESGCM(chiave()).encrypt(iv, pt, None)
    CIFRATO.write_text(json.dumps({"v": 1, "alg": "AES-256-GCM", "iv": b64e(iv), "dati": b64e(ct)}) + "\n", encoding="utf-8")
    if decifra() != dati: sys.exit("la rilettura non coincide")


def esporta_cartelle(dest, solo=None):
    """Scrive il quaderno in chiaro come le cartelle di ArtifactData (lezioni/, argomenti/, domande/, meta/),
    così gli script della skill lezione-piano (indice.py, controlla.py diff) funzionano come prima."""
    dest = pathlib.Path(dest)
    fuori_dal_repo(dest)
    d = decifra()
    for coll in ("lezioni", "argomenti", "domande"):
        (dest / coll).mkdir(parents=True, exist_ok=True)
        for doc in d[coll]:
            doc = dict(doc); did = doc.pop("_id")
            if solo and did != solo: continue
            (dest / coll / f"{did}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf-8")
    (dest / "meta").mkdir(parents=True, exist_ok=True)
    for k in ("stato", "percorso", "manuale"):
        if d.get(k) is not None:
            (dest / "meta" / f"{k}.json").write_text(json.dumps(d[k], ensure_ascii=False, indent=1), encoding="utf-8")


def applica(out):
    """Applica out/writes.json (prodotto da scrivi() della skill lezione-piano) al quaderno e lo ricifra."""
    out = pathlib.Path(out)
    writes = json.loads((out / "writes.json").read_text(encoding="utf-8"))
    d = decifra()
    for w in writes:
        coll, did = w["collection"], w["doc_id"]
        if coll == "meta":
            if w["op"] == "set": d[did] = json.loads(pathlib.Path(w["file_path"]).read_text(encoding="utf-8"))
            else: d[did] = {**(d.get(did) or {}), **w["data"]}
            continue
        docs = d[coll]; i = next((k for k, x in enumerate(docs) if x.get("_id") == did), None)
        if w["op"] == "set":
            doc = json.loads(pathlib.Path(w["file_path"]).read_text(encoding="utf-8")); doc["_id"] = did
            if i is None: docs.append(doc)
            else: docs[i] = doc
        elif w["op"] in ("update", "merge"):
            if i is None:
                if w["op"] != "merge": sys.exit(f"update di un documento che non c'è: {coll}/{did}")
                docs.append({**w["data"], "_id": did})
            else: docs[i] = {**docs[i], **w["data"]}
        elif w["op"] == "delete":
            if i is not None: docs.pop(i)
        else:
            raise SystemExit(f"operazione sconosciuta: {w['op']}")
    cifra(d)
    print(f"applicate {len(writes)} scritture; quaderno ricifrato:", {k: len(d[k]) for k in ("lezioni", "argomenti", "domande")})


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "cartelle":
        esporta_cartelle(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
        print("cartelle in", sys.argv[2]); return
    if cmd == "applica":
        applica(sys.argv[2]); return
    if cmd == "decifra":
        out = pathlib.Path(sys.argv[2])
        fuori_dal_repo(out)
        out.write_text(json.dumps(decifra(), ensure_ascii=False, indent=1), encoding="utf-8")
        print("decifrato in", out)
    elif cmd == "cifra":
        src = pathlib.Path(sys.argv[2])
        cifra(json.loads(src.read_text(encoding="utf-8")))
        print("cifrato e riletto:", CIFRATO.name)
    elif cmd == "controlla":
        d = decifra()
        print({k: len(d[k]) for k in ("lezioni", "argomenti", "domande")}, "· schema", schema(d), "· prossima lezione:", (d.get("stato") or {}).get("prossima_lezione"))
        if schema(d) >= 3:
            pr = problemi_schema3(d)
            print("controlli dello schema 3:", "tutti superati" if not pr else "\n- " + "\n- ".join(pr))
            if pr: sys.exit(1)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
