"""Collaudo del Leggio in Chrome vero (headless), telefono 390 px, chiaro e scuro.
Uso: LEGGIO_CHIAVE=<chiave del quaderno> python3 tests/collaudo.py
Senza LEGGIO_CHIAVE le prove che aprono il quaderno vengono saltate (e il collaudo non è completo)."""
import copy, json, os, re, shutil, socket, subprocess, sys, tempfile, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
REPO = ROOT.parent
CHIAVE = os.environ.get("LEGGIO_CHIAVE", "").strip()
def porta_libera():
    with socket.socket() as so:
        so.bind(("127.0.0.1", 0)); return so.getsockname()[1]
def servi(cartella):
    port = porta_libera()
    pr = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "-d", str(cartella)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return pr, f"http://127.0.0.1:{port}/"
srv, URL = servi(REPO)
# l'app 1.0.1 (ultima pubblicata prima della 2.0) con i dati nuovi: chi non ha ancora aggiornato non deve vedere righe vuote
VECCHIA = pathlib.Path(tempfile.mkdtemp(prefix="leggio-vecchia-"))
(VECCHIA / "index.html").write_bytes(subprocess.run(["git", "-C", str(REPO), "show", "57c8531:index.html"], capture_output=True, check=True).stdout)
for f in ("piano.json", "esercizi.json"): shutil.copy(REPO / f, VECCHIA / f)
srv_v, URL_V = servi(VECCHIA)
time.sleep(1)
ok = True
def check(c, msg):
    global ok
    print(("OK  " if c else "ERR ") + msg); ok &= bool(c)
def font_finti(c):
    """I caratteri di Google non fanno parte dell'app: nel collaudo si simulano, così la prova non dipende dalla rete esterna."""
    c.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
    c.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=200, content_type="font/woff2", body=b""))
    return c

sys.path.insert(0, str(REPO / "tools"))
import quaderno as QT
QUADERNO = QT.decifra() if CHIAVE else {"lezioni": []}
PIANO = json.loads((REPO / "piano.json").read_text(encoding="utf-8"))
LIB = json.loads((REPO / "esercizi.json").read_text(encoding="utf-8"))
NB, NL, VER = len(PIANO["sessione"]), len(LIB["esercizi"]), PIANO["versione"]
# le foto del collaudo mostrano il quaderno in chiaro: fuori dal repository
shots = pathlib.Path(tempfile.gettempdir()) / "leggio-collaudo"; shots.mkdir(exist_ok=True)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--autoplay-policy=no-user-gesture-required"])
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                            color_scheme="light", permissions=["clipboard-read", "clipboard-write"])
        font_finti(ctx)
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.goto(URL); pg.wait_for_timeout(1500)

        # 1. Oggi: piano risolto dalla libreria
        n = pg.locator("ol.blocks > li").count()
        check(n == NB, f"Oggi: {n} blocchi (attesi {NB})")
        check(f"piano {VER}" in pg.locator(".settings").inner_text(), "versione del piano visibile")
        check(pg.locator(".tabs [aria-current='page']").inner_text() == "Oggi", "sezioni in alto, attiva «Oggi»")
        check("2×" in pg.locator("ol.blocks > li").first.inner_text(), "il ritocco della sessione vale (perno 2 giri)")
        pg.screenshot(path=str(shots / "1-oggi.png"), full_page=True)

        # 2. Manifest e service worker
        man = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
        check(man["display"] == "standalone" and man["start_url"] == "./", "manifest standalone")
        pg.wait_for_timeout(1500)
        check(pg.evaluate("navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active || r.waiting || r.installing)))"), "service worker registrato")

        # 3. Esercizi: libreria completa, esercizio libero che non tocca la sessione di oggi
        pg.locator('[data-act="tab"][data-v="esercizi"]').click(); pg.wait_for_timeout(400)
        ne = pg.locator('[data-act="lib"]').count()
        check(ne == NL, f"Esercizi: {ne} esercizi in libreria (attesi {NL})")
        check(pg.locator(".app h2").count() == len(LIB["aree"]), "un gruppo per area")
        pg.screenshot(path=str(shots / "2-esercizi.png"), full_page=True)
        pg.locator('[data-act="lib"][data-id="hanon"]').click(); pg.wait_for_timeout(500)
        check(pg.locator(".pos").inner_text() == "Esercizio libero", "esercizio libero aperto")
        check(pg.locator(".ph").count() == 3 and "3×" in pg.locator(".ph").first.inner_text(), "nella libreria i giri completi (3 fasi, 3 giri)")
        pg.locator('[data-act="play"]').click(); pg.wait_for_timeout(3000); pg.locator('[data-act="play"]').click()
        pg.locator('[data-act="next"]').click(); pg.wait_for_timeout(400)
        check(pg.locator('[data-act="lib"]').count() == NL, "«Chiudi» torna agli esercizi")
        pg.locator('.tabs [data-act="tab"][data-v="oggi"]').click(); pg.wait_for_timeout(400)
        check(f"0 di {NB} fatti" in pg.locator(".app").inner_text(), "la sessione di oggi non è cambiata")

        # 4. Basso a tre note e discesa (dalla libreria: non dipende dalla sessione del giorno)
        pg.locator('[data-act="tab"][data-v="esercizi"]').click(); pg.wait_for_timeout(400)
        pg.locator('[data-act="lib"][data-id="basso"]').click(); pg.wait_for_timeout(500)
        check(pg.locator("#kb-l .mk circle").count() == 3, "basso a tre note")
        pg.locator('[data-act="phase"][data-i="1"]').click(); pg.wait_for_timeout(300)
        for _ in range(24): pg.locator('[data-act="bpm"][data-d="5"]').click()
        pg.locator('[data-act="play"]').click()
        seen = False
        for _ in range(60):
            pg.wait_for_timeout(250)
            if pg.locator("#cname").inner_text().startswith("solo il basso: mi"):
                seen = pg.locator("#kb-l .mk circle[class^='hot']").count() == 1 and pg.locator("#beats i").count() == 1; break
        check(seen, "discesa: sul mi solo il basso, la destra tiene")
        pg.locator('[data-act="play"]').click()
        for _ in range(24): pg.locator('[data-act="bpm"][data-d="-5"]').click()
        pg.locator('[data-act="libclose"]').click(); pg.wait_for_timeout(300)
        # 4b. Scale col metronomo: blocco di testo con «bpm» e passi 60-70-80
        pg.locator('[data-act="lib"][data-id="scale-cinque"]').click(); pg.wait_for_timeout(500)
        check(pg.locator("#mplay").count() == 1 and pg.locator("#passi button").count() == 3, "scale: metronomo e passi 60-70-80")
        pg.locator('#passi button[data-v="80"]').click(); pg.wait_for_timeout(200)
        check(pg.locator("#bpmv").inner_text() == "80" and pg.locator('#passi button[aria-pressed="true"]').inner_text() == "80", "scale: il passo scelto diventa la velocità")
        pg.locator("#mplay").click(); pg.wait_for_timeout(1800)
        check(pg.locator("#mplay").get_attribute("aria-pressed") == "true" and pg.locator("#mbeats i.on").count() == 1, "scale: il metronomo parte e segna il battito")
        pg.locator("#mplay").click(); pg.wait_for_timeout(900)
        check(pg.locator("#mplay").get_attribute("aria-pressed") == "false" and pg.locator("#mbeats i.on").count() == 0, "scale: il metronomo si ferma")
        pg.locator('#passi button[data-v="60"]').click()
        pg.screenshot(path=str(shots / "2b-scale.png"), full_page=True)
        pg.locator('[data-act="libclose"]').click(); pg.wait_for_timeout(300)
        # 4c. Giro in una tonalità con i diesis: in la il sesto grado è fa♯ minore
        pg.locator('[data-act="lib"][data-id="giri-pop-5"]').click(); pg.wait_for_timeout(500)
        pg.locator('[data-act="phase"][data-i="3"]').click(); pg.wait_for_timeout(400)
        chips = pg.locator("#chips").inner_text()
        check("F♯m" in chips or "F#m" in chips, "giro pop in la: c'è fa♯ minore")
        pg.screenshot(path=str(shots / "2c-giro-la.png"), full_page=True)
        pg.locator('[data-act="libclose"]').click(); pg.wait_for_timeout(300)
        pg.locator('.tabs [data-act="tab"][data-v="oggi"]').click(); pg.wait_for_timeout(300)
        pg.evaluate("localStorage.removeItem('leggio-v2')"); pg.reload(); pg.wait_for_timeout(1200)

        # 5. Sessione intera, diario e «Copia per Claude»
        pg.locator('[data-act="start"]').click(); pg.wait_for_timeout(500)
        pg.locator('[data-act="play"]').click(); pg.wait_for_timeout(5000)
        check(pg.locator("#kb-r .mk circle[class^='hot']").count() >= 1, "il metronomo fa avanzare la nota rossa")
        pg.locator('[data-act="play"]').click()
        titles = []
        for _ in range(NB + 2):
            titles.append(pg.locator(".bhead h1").inner_text())
            pg.locator('[data-act="next"]').click(); pg.wait_for_timeout(300)
            if pg.locator('[data-act="salva"]').count(): break
        check(len(titles) == NB, f"percorsi {len(titles)} blocchi")
        pg.locator(f'[data-act="rate"][data-id="{PIANO["valuta"][0]["id"]}"][data-v="bene"]').click()
        pg.fill("#nota", "Prova del collaudo")
        pg.locator('[data-act="salva"]').click(); pg.wait_for_timeout(500)
        check(pg.locator("#dstat").inner_text().startswith("Salvato sul telefono alle"), "salvato sul telefono")
        diary = pg.evaluate("JSON.parse(localStorage.getItem('leggio-diario') || '[]')")
        check(len(diary) == 1 and diary[0]["piano"] == VER and diary[0]["nota"] == "Prova del collaudo", "diario: una sessione completa")
        pg.locator("#perclaude").click(); pg.wait_for_timeout(800)
        check(pg.evaluate("navigator.clipboard.readText()").startswith("Leggio del piano, 1 sessione da registrare:"), "testo copiato per Claude")
        fine = pg.locator(".app").inner_text()
        lib = {e["id"]: e for e in LIB["esercizi"]}
        giri = [g for s in PIANO["sessione"] for g in (lib.get(s if isinstance(s, str) else s.get("da"), s if isinstance(s, dict) else {}).get("giri") or [])]
        brani, esercizi = [g["titolo"] for g in giri if not g.get("esercizio")], [g["titolo"] for g in giri if g.get("esercizio")]
        check(bool(brani) and all(x in fine for x in brani) and not any(x in fine for x in esercizi), f"Fine: solo i brani ({len(brani)}), non i giri-esercizio ({len(esercizi)})")
        pg.locator('[data-act="home"]').click(); pg.wait_for_timeout(300)

        # 6. Quaderno cifrato
        if CHIAVE:
            pg.goto(URL + "quaderno.html"); pg.wait_for_timeout(1200)
            check("chiuso a chiave" in pg.locator("main").inner_text(), "quaderno senza chiave: chiede la chiave")
            pg.fill("input.chiave", "AAAA" + CHIAVE[4:]); pg.locator("button.apri").click(); pg.wait_for_timeout(1200)
            check("non apre" in pg.locator("main").inner_text(), "chiave sbagliata: lo dice")
            check(pg.evaluate("localStorage.getItem('leggio-chiave')") is None, "chiave sbagliata: non resta sul telefono")
            pg.goto(URL + "quaderno.html#chiave=" + CHIAVE); pg.wait_for_timeout(2000)
            check("chiave=" not in pg.url, "la chiave sparisce dall'indirizzo")
            ncap = pg.locator(".toc > li.cap").count()
            check(ncap >= 4, f"sommario: {ncap} capitoli")
            pg.screenshot(path=str(shots / "3-quaderno.png"), full_page=True)
            pg.locator(".todo input.check").first.click(); pg.wait_for_timeout(300)
            pg.reload(); pg.wait_for_timeout(1500)
            check(pg.locator(".todo input.check").first.is_checked(), "la spunta di un compito resta sul telefono")
            pg.locator("nav.views button", has_text="Cap. 4").click(); pg.wait_for_timeout(1500)
            check(pg.locator("section.sezione").count() == 11, "capitolo 4: 11 paragrafi")
            check(pg.locator(".abc svg").count() >= 1 and pg.locator("svg.kb").count() >= 1, "notazione e tastiere disegnate")
            check(pg.locator(".scheda").count() >= 4, "riassunto a schede")
            pg.locator("nav.views button", has_text="Cap. 5").click(); pg.wait_for_timeout(1500)
            check(pg.locator("section.sezione").count() == 5 and pg.locator(".abc svg").count() >= 1 and pg.locator("svg.kb").count() >= 1 and pg.locator("table").count() >= 2, "capitolo 5: 5 paragrafi, armature disegnate, tastiera, tabelle")
            pg.screenshot(path=str(shots / "4b-capitolo5.png"), full_page=True)
            pg.screenshot(path=str(shots / "4-capitolo4.png"))
            pg.locator("nav.views button", has_text="Indice analitico").click(); pg.wait_for_timeout(600)
            check(pg.locator(".voce").count() >= 30, "indice analitico")
            # 6b. I due ordini: per lezione (capitoli) e per argomento (parti del manuale)
            pg.locator("nav.views button", has_text="Cap. 2").click(); pg.wait_for_timeout(1200)
            nsez = pg.locator("section.sezione").count()
            check(pg.locator("details.verifiche").count() == nsez and nsez >= 7, f"capitolo 2: {nsez} paragrafi, ognuno con «Fonti e verifiche»")
            testo_cap = pg.locator("main").inner_text().lower()
            check(not any(x in testo_cap.split("compiti")[0] for x in ("il maestro", "da chiedere", "[s]", "[?]")), "capitolo 2: voce da manuale nel testo")
            fig = pg.locator("#s-2-5 figcaption b").first.inner_text()
            pg.evaluate("document.getElementById('s-2-5').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
            check(pg.locator("#ordine").is_visible(), "interruttore «Per lezione | Per argomento» visibile")
            pg.locator("#ordine button", has_text="Per argomento").click(); pg.wait_for_timeout(1500)
            check("#parte-" in pg.url and pg.locator("#s-2-5").count() == 1, "cambio d'ordine: si resta sul paragrafo che si leggeva")
            check(pg.locator("#s-2-5 figcaption b").first.inner_text() == fig, "le figure tengono lo stesso numero nei due ordini")
            check(pg.locator("nav.views button", has_text="Parte I").count() >= 1 and pg.locator("nav.views button", has_text="Cap. 1").count() == 0, "per argomento: la barra mostra le parti")
            pg.locator("nav.views button", has_text="Sommario").click(); pg.wait_for_timeout(600)
            nparti = pg.locator(".toc > li.cap").count()
            ntot = pg.locator(".toc > li.cap ol > li").count()
            check(nparti >= 5 and ntot == sum(len(l["sezioni"]) for l in QUADERNO["lezioni"]), f"sommario per argomento: {nparti} parti, {ntot} paragrafi (tutti)")
            pg.screenshot(path=str(shots / "5-sommario-argomenti.png"), full_page=True)
            pg.locator(".toc > li.cap button.cap-row").first.click(); pg.wait_for_timeout(1200)
            check(pg.locator(".dove").count() == pg.locator("section.sezione").count() > 0, "ogni paragrafo di una parte dice da quale capitolo viene")
            rif = pg.locator(".md button.ref").first
            if rif.count():
                dest = "s-" + rif.inner_text().replace("§", "").replace(".", "-"); rif.click(); pg.wait_for_timeout(1200)
                check(pg.locator("#" + dest).count() == 1, "un rimando § porta al suo paragrafo")
            pg.locator("details.verifiche summary").first.click(); pg.wait_for_timeout(300)
            check(pg.locator("details.verifiche[open] li").count() >= 1, "«Fonti e verifiche» si apre")
            pg.screenshot(path=str(shots / "5b-parte.png"))
            pg.reload(); pg.wait_for_timeout(1500)
            check(pg.locator("#ordine button[aria-pressed='true']").inner_text() == "Per argomento", "l'ordine scelto resta alla riapertura")
            pg.locator("#ordine button", has_text="Per lezione").click(); pg.wait_for_timeout(1000)
            check(pg.locator("nav.views button", has_text="Cap. 1").count() == 1, "ritorno all'ordine per lezione")
            pg.reload(); pg.wait_for_timeout(1500)
            check(pg.locator("nav.views button").count() >= 6, "riaperto: la chiave è rimasta sul telefono")
            ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(2000)
            check(pg.locator("nav.views button").count() >= 6 and pg.locator(".loading").count() == 0, "quaderno senza rete")
            ctx.set_offline(False)
            pg.locator(".tabs a", has_text="Esercizi").click(); pg.wait_for_timeout(1500)
            check(pg.locator('[data-act="lib"]').count() == NL, "dal quaderno la scheda Esercizi apre la libreria")
        else:
            print("SALTATO quaderno: manca LEGGIO_CHIAVE")
            ok = False

        # 6b. Pattern: dati, calcoli, tavole, comandi, rimandi al quaderno, uso senza rete
        sys.path.insert(0, str(ROOT))
        import pattern_dati as PD
        PATT = json.loads((REPO / "pattern.json").read_text(encoding="utf-8")); TAV = PATT["tavole"]
        par_q = {str(s["num"]) for l in QUADERNO["lezioni"] for s in l.get("sezioni", [])} if CHIAVE else None
        pr = PD.problemi(PATT, paragrafi=par_q)
        check(not pr, f"Pattern: dati a posto, {len(TAV)} tavole {pr[:3]}")
        def guasta(f):
            d = copy.deepcopy(PATT); f(d); return PD.problemi(d, paragrafi=par_q)
        check(any("non esiste" in x for x in guasta(lambda d: d["tavole"][0].update(motore="inesistente"))), "spia Pattern: un motore che non esiste viene fermato")
        check(any("voce" in x for x in guasta(lambda d: d["tavole"][0]["guarda"].append("**Nota**: il maestro dice così."))), "spia Pattern: «il maestro dice» viene fermato")
        swfinto = pathlib.Path(tempfile.mkdtemp(prefix="leggio-sw-")); shutil.copytree(REPO / "pattern", swfinto / "pattern"); shutil.copytree(REPO / "icons", swfinto / "icons"); shutil.copytree(REPO / "vendor", swfinto / "vendor")
        for f in REPO.glob("*.*"):
            if f.is_file(): shutil.copy(f, swfinto / f.name)
        (swfinto / "pattern" / "motori" / (TAV[0]["motore"] + ".js")).unlink(); (swfinto / "pattern" / "grafico.js").unlink()
        psw = PD.problemi(PATT, repo=swfinto)
        check(any("aggiornerebbe" in x for x in psw) and any("MOTORI non coincide" in x for x in psw), "spia Pattern: un file elencato nel service worker ma assente viene fermato")
        shutil.rmtree(swfinto, ignore_errors=True)
        if CHIAVE: check(any("§9.9" in x for x in guasta(lambda d: d["tavole"][0]["par"].append("9.9"))), "spia Pattern: un paragrafo che non è nel quaderno viene fermato")
        rn = subprocess.run("node --test tests/pattern/*.test.js", shell=True, cwd=str(REPO), capture_output=True, text=True)
        mp = re.search(r"# pass (\d+)", rn.stdout); mf = re.search(r"# fail (\d+)", rn.stdout)
        check(rn.returncode == 0 and mp and int(mp.group(1)) > 0 and mf and int(mf.group(1)) == 0, f"Pattern: calcoli verificati contro i riferimenti ({mp.group(1) if mp else 0} prove, {mf.group(1) if mf else '?'} fallite)")
        pg.goto(URL + "index.html#oggi"); pg.wait_for_timeout(800)
        pg.locator(".tabs a", has_text="Pattern").click(); pg.wait_for_timeout(1500)
        check(pg.locator(".tabs [aria-current='page']").inner_text() == "Pattern", "da Oggi la scheda Pattern apre la sezione")
        pg.locator(".ordine .seg button", has_text="Per idea matematica").click(); pg.wait_for_timeout(300)
        check(pg.locator("a.voce").count() == len(TAV), f"Pattern per idea matematica: {len(TAV)} tavole")
        pg.locator(".ordine .seg button", has_text="Per capitolo").click(); pg.wait_for_timeout(300)
        attese = sum(len({p.split(".")[0] for p in t["par"]}) for t in TAV)
        check(pg.locator("a.voce").count() == attese, f"Pattern per capitolo: {attese} voci")
        pg.screenshot(path=str(shots / "7-pattern.png"), full_page=True)
        e0, vuote, sforano, ferme = len(errs), [], [], []
        STATO = "document.querySelector('.pt-graf').innerHTML + '|' + document.querySelector('.pt-lettura').textContent"
        for t in TAV:
            pg.goto(URL + "pattern.html#t-" + t["id"]); pg.wait_for_timeout(800)
            if pg.locator(".pt-graf svg").count() == 0 or not pg.locator(".pt-lettura").inner_text().strip() or pg.locator("h1").inner_text().strip() != t["titolo"]: vuote.append(t["id"])
            # ogni comando si tocca davvero e deve cambiare il grafico o la riga di lettura: scelte e interruttori a ogni tocco,
            # i cursori con almeno uno tra più e meno (a un estremo uno dei due non può fare nulla)
            for sel in (".pt-comandi .seg button[aria-pressed='false']", ".pt-comandi .tog"):
                for i in range(min(pg.locator(sel).count(), 14)):
                    prima = pg.evaluate(STATO)
                    try: nome = pg.locator(sel).nth(i).inner_text(timeout=1500); pg.locator(sel).nth(i).click(timeout=1500)
                    except Exception: continue
                    pg.wait_for_timeout(60)
                    if pg.evaluate(STATO) == prima: ferme.append(f"{t['id']}: «{nome}»")
            for i in range(pg.locator(".pt-comandi .pt-cur").count()):
                cur, mossa = pg.locator(".pt-comandi .pt-cur").nth(i), False
                for j in (1, 0, 0, 1):   # più, meno, meno, più: passa anche dagli estremi vicini
                    prima = pg.evaluate(STATO)
                    try: cur.locator(".pt-cur-r .btn").nth(j).click(timeout=1500)
                    except Exception: continue
                    pg.wait_for_timeout(60); mossa = mossa or pg.evaluate(STATO) != prima
                if not mossa: ferme.append(f"{t['id']}: cursore {i + 1}")
            if pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 0: sforano.append(t["id"])
        pg.screenshot(path=str(shots / "8-pattern-tavola.png"), full_page=True)
        check(not vuote, f"Pattern: ogni tavola ha titolo, grafico e riga di lettura {vuote}")
        check(not ferme, f"Pattern: ogni comando di ogni tavola cambia il grafico o la riga di lettura {ferme}")
        check(not sforano, f"Pattern: nessuna tavola esce dallo schermo a 390 px {sforano}")
        check(len(errs) == e0, f"Pattern: nessun errore aprendo le tavole e toccando i comandi {errs[e0:e0 + 3]}")
        if CHIAVE:
            t0 = TAV[0]; pg.goto(URL + "pattern.html#t-" + t0["id"]); pg.wait_for_timeout(700)
            pg.locator("a.ref").first.click(); pg.wait_for_timeout(2500)
            sid = "s-" + t0["par"][0].replace(".", "-")
            top = pg.evaluate("(id) => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top : null; }", sid)
            check("quaderno.html" in pg.url and top is not None and -80 < top < 500, f"Pattern: il rimando §{t0['par'][0]} apre il quaderno su quel paragrafo ({top})")
            pg.locator(".tabs a", has_text="Pattern").click(); pg.wait_for_timeout(1200)
            check(pg.locator("a.voce").count() == attese, "dal quaderno la scheda Pattern apre la sezione")
        # un indirizzo che non esiste più porta all'elenco e non intrappola il tasto Indietro
        pg.goto(URL + "pattern.html"); pg.wait_for_timeout(600)
        pg.goto(URL + "pattern.html#t-" + TAV[1]["id"]); pg.wait_for_timeout(500)
        pg.goto(URL + "pattern.html#t-tavola-che-non-esiste"); pg.wait_for_timeout(600)
        check(pg.locator("a.voce").count() == attese and "#t-" not in pg.url, "Pattern: un indirizzo che non esiste più porta all'elenco")
        pg.go_back(); pg.wait_for_timeout(600)
        check(pg.url.endswith("#t-" + TAV[1]["id"]) and pg.locator(".pt-graf svg").count() >= 1, f"Pattern: da lì il tasto Indietro torna alla tavola di prima ({pg.url.split('/')[-1]})")
        # tutte le combinazioni dei comandi, con i cursori agli estremi: scritte sovrapposte o tagliate, NaN, sforamenti
        rs = subprocess.run([sys.executable, str(ROOT / "pattern_stati.py")], cwd=str(REPO), capture_output=True, text=True)
        check(rs.returncode == 0 and "TUTTO OK" in rs.stdout, "Pattern: tutte le combinazioni dei comandi, nessuna scritta sovrapposta o fuori dal disegno " + " | ".join(l for l in rs.stdout.splitlines() if l.startswith("ERR"))[:300])
        chiavi = [k for k in pg.evaluate("caches.keys()") if k.startswith("leggio-")]
        check(chiavi == ["leggio-" + re.search(r"const VERSION = '([^']+)'", (REPO / "sw.js").read_text(encoding="utf-8")).group(1)], f"service worker: una sola cache, quella della versione nuova {chiavi}")
        ctx.set_offline(True); senza = []
        for t in TAV:
            pg.goto(URL + "pattern.html#t-" + t["id"]); pg.wait_for_timeout(600)
            if pg.locator(".pt-graf svg").count() == 0: senza.append(t["id"])
        ctx.set_offline(False)
        check(not senza, f"Pattern senza rete: tutte le tavole si aprono {senza}")

        # 7. Senza rete: app e piano dalla cache
        ctx.set_offline(True); pg.goto(URL + "index.html#oggi"); pg.wait_for_timeout(1500)
        check(pg.locator("ol.blocks > li").count() == NB, "senza rete: app e piano dalla cache")
        ctx.set_offline(False)
        check(not [e for e in errs if "favicon" not in e and "INTERNET_DISCONNECTED" not in e], f"nessun errore in console {errs[:3]}")

        # 8. Tema scuro
        ctx2 = font_finti(b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark"))
        p2 = ctx2.new_page(); p2.goto(URL); p2.wait_for_timeout(1500)
        p2.locator('[data-act="tab"][data-v="esercizi"]').click(); p2.wait_for_timeout(400)
        p2.screenshot(path=str(shots / "5-esercizi-scuro.png"), full_page=True)
        if CHIAVE:
            p2.goto(URL + "quaderno.html#chiave=" + CHIAVE); p2.wait_for_timeout(2000)
            p2.screenshot(path=str(shots / "6-quaderno-scuro.png"))
            check(p2.locator(".toc > li.cap").count() >= 4, "quaderno scuro")
        p2.goto(URL + "pattern.html#t-" + TAV[0]["id"]); p2.wait_for_timeout(1200)
        p2.screenshot(path=str(shots / "9-pattern-scuro.png"), full_page=True)
        check(p2.locator(".pt-graf svg").count() >= 1, "Pattern in tema scuro")

        # 9. Robustezza (senza service worker, per controllare la rete richiesta per richiesta)
        nuovo = lambda: font_finti(b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, service_workers="block"))
        c3 = nuovo(); p3 = c3.new_page()
        p3.route("**/esercizi.json", lambda r: r.abort()); p3.goto(URL); p3.wait_for_timeout(1500)
        n3 = p3.locator("ol.blocks > li").count()
        check(n3 != 1 and "non si è caricata" in p3.locator(".app").inner_text(), f"libreria irraggiungibile al primo avvio: niente sessione monca ({n3} blocchi) e avviso")
        p3.unroute("**/esercizi.json"); p3.locator('[data-act="riprova"]').click(); p3.wait_for_timeout(1500)
        check(p3.locator("ol.blocks > li").count() == NB and "non si è caricata" not in p3.locator(".app").inner_text(), "«Riprova» carica la sessione")
        monca = dict(LIB, esercizi=[e for e in LIB["esercizi"] if e["id"] != "perno"])
        p3.route("**/esercizi.json", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(monca)))
        p3.reload(); p3.wait_for_timeout(1500)
        check(p3.locator("ol.blocks > li").count() == NB and f"piano {VER}" in p3.locator(".settings").inner_text(),
              "libreria senza un esercizio richiamato: resta la sessione intera di prima")
        p3.unroute("**/esercizi.json"); p3.reload(); p3.wait_for_timeout(1200)
        p3.locator('[data-act="tab"][data-v="esercizi"]').click(); p3.wait_for_timeout(300)
        p3.locator('[data-act="lib"][data-id="armature"]').click(); p3.wait_for_timeout(300)
        p3.locator('[data-act="next"]').click(); p3.wait_for_timeout(300)
        p3.locator('.tabs [data-act="tab"][data-v="oggi"]').click(); p3.wait_for_timeout(300); p3.locator('[data-act="start"]').click(); p3.wait_for_timeout(300)
        for _ in range(NB + 2):
            if p3.locator('[data-act="salva"]').count(): break
            p3.locator('[data-act="next"]').click(); p3.wait_for_timeout(200)
        p3.locator('[data-act="salva"]').click(); p3.wait_for_timeout(500)
        d3 = p3.evaluate("JSON.parse(localStorage.getItem('leggio-diario') || '[]')")
        check(bool(d3) and "armature" in d3[0].get("libero", []), "diario: anche gli esercizi liberi di solo testo")
        c3.close()
        if CHIAVE:
            c4 = nuovo(); p4 = c4.new_page()
            p4.route("**/quaderno.cifrato.json", lambda r: r.abort())
            p4.goto(URL + "quaderno.html#chiave=" + CHIAVE); p4.wait_for_timeout(1500)
            check("Non riesco" in p4.locator("main").inner_text() and "chiave=" not in p4.url, "link con la chiave senza rete: lo dice")
            p4.unroute("**/quaderno.cifrato.json"); p4.locator("button.apri", has_text="Riprova").click(); p4.wait_for_timeout(1500)
            check(p4.locator(".toc > li.cap").count() >= 4 and p4.evaluate("localStorage.getItem('leggio-chiave')") == CHIAVE,
                  "«Riprova» apre con la chiave del link e la salva")
            p4.goto(URL + "quaderno.html#chiave=" + "AAAA" + CHIAVE[4:]); p4.wait_for_timeout(1500)
            check(p4.locator(".toc > li.cap").count() >= 4, "link con chiave sbagliata, ma quella giusta è salvata: si apre")
            c4.close()
        # un motore di Pattern che non arriva: la tavola resta in elenco, lo dice, e «Riprova» la carica
        c6 = nuovo(); p6 = c6.new_page(); m0 = TAV[0]["motore"]
        p6.route(f"**/pattern/motori/{m0}.js", lambda r: r.abort()); p6.goto(URL + "pattern.html"); p6.wait_for_timeout(1500)
        check(p6.locator("a.voce").count() == attese and "non caricata" in p6.locator("#view").inner_text(), "Pattern: un motore irraggiungibile non fa sparire la tavola dall'elenco")
        p6.goto(URL + "pattern.html#t-" + TAV[0]["id"]); p6.wait_for_timeout(700)
        check("non si è caricato" in p6.locator(".pt").inner_text() and p6.locator(".pt-graf svg").count() == 0, "Pattern: la tavola senza motore lo dice")
        p6.unroute(f"**/pattern/motori/{m0}.js"); p6.locator(".pt button", has_text="Riprova").click(); p6.wait_for_timeout(1200)
        check(p6.locator(".pt-graf svg").count() >= 1, "Pattern: «Riprova» carica il motore e disegna la tavola")
        c6.close()
        c5 = nuovo(); p5 = c5.new_page(); p5.goto(URL_V); p5.wait_for_timeout(1500)
        righe = p5.locator("ol.blocks > li")
        vuote = [i for i in range(righe.count()) if not righe.nth(i).locator(".bt b").inner_text().strip()]
        check(righe.count() > 0 and not vuote, f"app 1.0.1 con i dati nuovi: {righe.count()} righe, nessuna vuota")
        c5.close()
        b.close()
    # Le spie dello schema 3 devono saper diventare rosse: quaderno buono = zero problemi, quaderno guastato apposta = problema
    if CHIAVE:
        import copy
        check(QT.schema(QUADERNO) >= 3 and QT.problemi_schema3(QUADERNO) == [], "quaderno pubblicato: schema 3, controlli superati")
        def guasto(f):
            d = copy.deepcopy(QUADERNO); f(d); return QT.problemi_schema3(d)
        s0 = lambda d: d["lezioni"][-1]["sezioni"][0]
        check(any("voce" in x for x in guasto(lambda d: s0(d)["blocchi"].insert(0, {"tipo": "testo", "md": "Il maestro dice di rallentare."}))), "spia: «il maestro dice» nel testo viene fermato")
        check(any("verifica" in x for x in guasto(lambda d: s0(d).update(verifiche=[]))), "spia: paragrafo senza verifiche viene fermato")
        check(any("senza posto" in x for x in guasto(lambda d: d["manuale"]["parti"][0]["sezioni"].pop(0))), "spia: paragrafo fuori dall'ordine per argomento viene fermato")
        check(any("non ammesso" in x for x in guasto(lambda d: s0(d)["blocchi"].append({"tipo": "nota", "esito": "da_chiedere", "md": "x"}))), "spia: nota «da chiedere» viene fermata")
    r = subprocess.run([sys.executable, str(REPO / "tools" / "quaderno.py"), "cartelle", str(REPO)], capture_output=True, text=True, env=dict(os.environ))
    check(r.returncode != 0 and not (REPO / "lezioni").exists(), "il quaderno in chiaro non si può scrivere nel repository")
finally:
    srv.terminate(); srv_v.terminate(); shutil.rmtree(VECCHIA, ignore_errors=True)
print("TUTTO OK" if ok else "CI SONO ERRORI")
