"""Collaudo del Leggio in Chrome vero (headless), telefono 390 px, chiaro e scuro.
Uso: LEGGIO_CHIAVE=<chiave del quaderno> python3 tests/collaudo.py
Senza LEGGIO_CHIAVE le prove che aprono il quaderno vengono saltate (e il collaudo non è completo)."""
import json, os, shutil, socket, subprocess, sys, tempfile, time, pathlib
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

        # 4. Basso a tre note e discesa (blocco 6)
        pg.locator('[data-act="open"][data-i="5"]').click(); pg.wait_for_timeout(500)
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
        pg.locator('[data-act="home"]').click(); pg.wait_for_timeout(300)
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
        pg.locator('[data-act="rate"][data-id="perno"][data-v="bene"]').click()
        pg.fill("#nota", "Prova del collaudo")
        pg.locator('[data-act="salva"]').click(); pg.wait_for_timeout(500)
        check(pg.locator("#dstat").inner_text().startswith("Salvato sul telefono alle"), "salvato sul telefono")
        diary = pg.evaluate("JSON.parse(localStorage.getItem('leggio-diario') || '[]')")
        check(len(diary) == 1 and diary[0]["piano"] == VER and diary[0]["nota"] == "Prova del collaudo", "diario: una sessione completa")
        pg.locator("#perclaude").click(); pg.wait_for_timeout(800)
        check(pg.evaluate("navigator.clipboard.readText()").startswith("Leggio del piano, 1 sessione da registrare:"), "testo copiato per Claude")
        fine = pg.locator(".app").inner_text()
        check("Let It Be" in fine and "Quattro accordi" not in fine, "Fine: solo i brani")
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
            pg.screenshot(path=str(shots / "4-capitolo4.png"))
            pg.locator("nav.views button", has_text="Indice analitico").click(); pg.wait_for_timeout(600)
            check(pg.locator(".voce").count() >= 30, "indice analitico")
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

        # 7. Senza rete: app e piano dalla cache
        ctx.set_offline(True); pg.goto(URL + "index.html#oggi"); pg.wait_for_timeout(1500)
        check(pg.locator("ol.blocks > li").count() == NB, "senza rete: app e piano dalla cache")
        ctx.set_offline(False)
        check(not [e for e in errs if "favicon" not in e and "INTERNET_DISCONNECTED" not in e], f"nessun errore in console {errs[:3]}")

        # 8. Tema scuro
        ctx2 = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark")
        p2 = ctx2.new_page(); p2.goto(URL); p2.wait_for_timeout(1500)
        p2.locator('[data-act="tab"][data-v="esercizi"]').click(); p2.wait_for_timeout(400)
        p2.screenshot(path=str(shots / "5-esercizi-scuro.png"), full_page=True)
        if CHIAVE:
            p2.goto(URL + "quaderno.html#chiave=" + CHIAVE); p2.wait_for_timeout(2000)
            p2.screenshot(path=str(shots / "6-quaderno-scuro.png"))
            check(p2.locator(".toc > li.cap").count() >= 4, "quaderno scuro")

        # 9. Robustezza (senza service worker, per controllare la rete richiesta per richiesta)
        nuovo = lambda: b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, service_workers="block")
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
        c5 = nuovo(); p5 = c5.new_page(); p5.goto(URL_V); p5.wait_for_timeout(1500)
        righe = p5.locator("ol.blocks > li")
        vuote = [i for i in range(righe.count()) if not righe.nth(i).locator(".bt b").inner_text().strip()]
        check(righe.count() > 0 and not vuote, f"app 1.0.1 con i dati nuovi: {righe.count()} righe, nessuna vuota")
        c5.close()
        b.close()
    r = subprocess.run([sys.executable, str(REPO / "tools" / "quaderno.py"), "cartelle", str(REPO)], capture_output=True, text=True, env=dict(os.environ))
    check(r.returncode != 0 and not (REPO / "lezioni").exists(), "il quaderno in chiaro non si può scrivere nel repository")
finally:
    srv.terminate(); srv_v.terminate(); shutil.rmtree(VECCHIA, ignore_errors=True)
print("TUTTO OK" if ok else "CI SONO ERRORI")
