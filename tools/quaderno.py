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
"""
import base64, json, os, pathlib, sys
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


def cifra(dati):
    for k in ("lezioni", "argomenti", "domande"):
        if not isinstance(dati.get(k), list): sys.exit(f"manca la lista {k}")
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
    for k in ("stato", "percorso"):
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
        print({k: len(d[k]) for k in ("lezioni", "argomenti", "domande")}, "· prossima lezione:", (d.get("stato") or {}).get("prossima_lezione"))
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
