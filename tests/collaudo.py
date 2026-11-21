"""Collaudo della PWA in Chrome vero (headless), telefono 390 px, chiaro e scuro.
Uso: python3 collaudo.py  (serve dist/ su localhost:8765)"""
import json, subprocess, sys, time, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1", "-d", str(ROOT.parent)],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
URL = "http://127.0.0.1:8765/"
ok = True
def check(c, msg):
    global ok
    print(("OK  " if c else "ERR ") + msg); ok &= bool(c)

shots = ROOT / "shots"; shots.mkdir(exist_ok=True)
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

        # 1. Piano da piano.json
        eyebrow = pg.locator(".home-h .eyebrow").inner_text()
        check("verso la lezione 5" in eyebrow.lower() and "oggi, sabato 21 nov" in eyebrow.lower(), f"intestazione: {eyebrow!r}")
        n = pg.locator("ol.blocks > li").count()
        check(n == 10, f"blocchi in elenco: {n}")
        check("piano lezione-4-b" in pg.locator(".settings").inner_text(), "versione del piano visibile nelle impostazioni")
        check("claude.ai" not in pg.locator("#diario").inner_text(), "nessun messaggio «apri su claude.ai» nel diario")
        pg.screenshot(path=str(shots / "1-oggi-chiaro.png"), full_page=True)

        # 2. Manifest e service worker
        man = pg.evaluate("fetch('manifest.webmanifest').then(r => r.json())")
        check(man["display"] == "standalone" and man["start_url"] == "./" and len(man["icons"]) == 3, "manifest: standalone, start_url, 3 icone")
        for ic in man["icons"]:
            st = pg.evaluate(f"fetch('{ic['src']}').then(r => r.status)")
            check(st == 200, f"icona {ic['src']} raggiungibile")
        pg.wait_for_timeout(1500)
        sw = pg.evaluate("navigator.serviceWorker.getRegistration().then(r => !!(r && (r.active || r.waiting || r.installing)))")
        check(sw, "service worker registrato")

        # 3. Sessione simulata: blocco a figura avviato, poi tutti i blocchi fino a Fine
        pg.locator('[data-act="start"]').click(); pg.wait_for_timeout(600)
        check("Terzo esercizio" in pg.locator(".bhead h1").inner_text(), "Inizia apre il blocco 1")
        check(pg.locator("#kb-r svg").count() == 1, "tastiera della destra disegnata")
        pg.locator('[data-act="play"]').click(); pg.wait_for_timeout(5500)
        hot = pg.locator("#kb-r .mk circle[class^='hot']").count()
        check(hot >= 1, "il metronomo fa avanzare la nota rossa")
        pg.locator('[data-act="play"]').click()
        pg.screenshot(path=str(shots / "2-blocco-chiaro.png"), full_page=True)
        titles = []
        for i in range(12):
            h = pg.locator(".bhead h1").inner_text(); titles.append(h)
            if "giro" in pg.locator("#stage").inner_html()[:0] : pass
            pg.locator('[data-act="next"]').click(); pg.wait_for_timeout(350)
            if pg.locator('[data-act="salva"]').count(): break
        check(len(titles) == 10 and titles[-1].startswith("Prima di andare"), f"percorsi {len(titles)} blocchi, ultimo: {titles[-1]!r}")
        pg.locator('[data-act="rate"][data-id="perno"][data-v="bene"]').click()
        pg.locator('[data-act="rate"][data-id="scala-sol"][data-v="cosi"]').click()
        pg.fill("#nota", "Prova del collaudo")
        check(pg.locator("#perclaude").count() == 1, "pulsante «Copia per Claude» presente")
        pg.locator('[data-act="salva"]').click(); pg.wait_for_timeout(500)
        st = pg.locator("#dstat").inner_text()
        check(st.startswith("Salvato sul telefono alle"), f"stato salvataggio: {st!r}")
        diary = pg.evaluate("JSON.parse(localStorage.getItem('leggio-diario') || '[]')")
        check(len(diary) == 1 and diary[0]["piano"] == "lezione-4-b" and diary[0]["valutazioni"]["perno"] == "bene" and diary[0]["nota"] == "Prova del collaudo", "diario sul telefono: 1 sessione completa")
        pg.locator("#perclaude").click(); pg.wait_for_timeout(800)
        clip = pg.evaluate("navigator.clipboard.readText()")
        check(clip.startswith("Leggio del piano, 1 sessione da registrare:") and '"piano": "lezione-4-b"' not in clip and '"piano":"lezione-4-b"' in clip, "testo copiato per Claude")
        check(pg.locator("#perclaude").inner_text().startswith("Copiato"), "conferma «Copiato»")
        pg.screenshot(path=str(shots / "3-fine-chiaro.png"), full_page=True)
        pg.locator('[data-act="home"]').click(); pg.wait_for_timeout(400)
        check("Prova del collaudo" in pg.locator("#diario").inner_text(), "la sessione compare in «Ultime sessioni»")

        # 4. Riapertura senza rete: pagina e piano dalla cache
        ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500)
        check(pg.locator("ol.blocks > li").count() == 10 and "verso la lezione 5" in pg.locator(".home-h .eyebrow").inner_text().lower(), "senza rete: app e piano dalla cache")
        ctx.set_offline(False)

        # 5. Aggiornamento del piano: cambio piano.json e riapro
        pj = ROOT.parent / "piano.json"; orig = pj.read_text(encoding="utf-8")
        d = json.loads(orig); d["quando"] = "PROVA AGGIORNAMENTO"; pj.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
        pg.reload(); pg.wait_for_timeout(1500)
        check("prova aggiornamento" in pg.locator(".home-h .eyebrow").inner_text().lower(), "un piano.json nuovo arriva da solo alla riapertura")
        pj.write_text(orig, encoding="utf-8")
        check(not [e for e in errs if "favicon" not in e and "INTERNET_DISCONNECTED" not in e], f"nessun errore in console {errs[:3]}")

        # 6. Tema scuro
        ctx2 = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark")
        p2 = ctx2.new_page(); p2.goto(URL); p2.wait_for_timeout(1500)
        p2.screenshot(path=str(shots / "4-oggi-scuro.png"), full_page=True)
        p2.locator('[data-act="open"][data-i="5"]').click(); p2.wait_for_timeout(600)
        check("basso" in p2.locator(".bhead h1").inner_text().lower(), "scuro: blocco del basso")
        p2.screenshot(path=str(shots / "5-basso-scuro.png"), full_page=True)
        p2.locator('[data-act="open"][data-i="3"]').count()
        b.close()
finally:
    srv.terminate()
print("TUTTO OK" if ok else "CI SONO ERRORI")
