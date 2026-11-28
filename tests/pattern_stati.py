"""Prova a fondo delle tavole di Pattern: per ogni tavola tutte le combinazioni dei comandi (scelte × interruttori,
cursori al minimo, a metà e al massimo), e in ogni stato le misure che l'occhio farebbe: scritte sovrapposte o fuori dal disegno,
NaN negli attributi o nei testi, pagina che esce dallo schermo, errori.
Uso: python3 tests/pattern_stati.py [--w=390] [--h=844] [--scuro] [--solo=id,id] [--foto=anomalie|tutte] [--tutte]
  --tutte fa le tre passate: 390 px chiaro, 390 px scuro, 360 px chiaro. Esce con 1 se trova difetti. Le foto vanno in /tmp.
Nato dalla verifica indipendente del 28/11/2026, che con queste misure ha trovato i difetti sfuggiti alle foto dello stato iniziale."""
import sys, socket, subprocess, time, pathlib, json, itertools, tempfile
from playwright.sync_api import sync_playwright

REPO = pathlib.Path(__file__).resolve().parent.parent
opt = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
solo = opt.get("solo", "").split(",") if opt.get("solo") else None
foto = opt.get("foto", "anomalie")
GRAVI = ("overlap", "fuori", "nan", "sfora", "errori")   # «bersagli» resta un'informazione: nei grafici fitti i punti da toccare sono più piccoli dei comandi

MISURA = r"""
() => {
  const r = { overlap: [], fuori: [], nan: [], piccoli: [], lettH: 0, svgW: [] };
  const graf = document.querySelector('.pt-graf'); if (!graf) return r;
  graf.querySelectorAll('svg.g-svg').forEach((svg, si) => {
    const vb = svg.viewBox.baseVal, sc = svg.getBoundingClientRect().width / vb.width; r.svgW.push(Math.round(svg.getBoundingClientRect().width));
    const T = [...svg.querySelectorAll('text')].map(t => ({ t, b: t.getBBox(), s: t.textContent }));
    for (const x of T) {
      const fs = parseFloat(getComputedStyle(x.t).fontSize) * sc; if (fs < 9.5) r.piccoli.push(`svg${si} «${x.s}» ${fs.toFixed(1)}px`);
      if (x.b.width === 0) continue;
      if (x.b.x < vb.x - 0.5 || x.b.y < vb.y - 0.5 || x.b.x + x.b.width > vb.x + vb.width + 0.5 || x.b.y + x.b.height > vb.y + vb.height + 0.5) r.fuori.push(`svg${si} «${x.s}» [${x.b.x.toFixed(0)},${x.b.y.toFixed(0)},${(x.b.x + x.b.width).toFixed(0)},${(x.b.y + x.b.height).toFixed(0)}] vb ${vb.width}x${vb.height}`);
    }
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const a = T[i].b, b = T[j].b; if (!a.width || !b.width) continue;
      const ox = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x), oy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (ox > 2 && oy > 3) r.overlap.push(`svg${si} «${T[i].s}» × «${T[j].s}» (${ox.toFixed(1)}×${oy.toFixed(1)})`);
    }
    svg.querySelectorAll('*').forEach(e => { for (const at of e.attributes) if (/NaN|Infinity|undefined/.test(at.value)) r.nan.push(`svg${si} <${e.tagName} ${at.name}="${at.value.slice(0, 60)}">`); });
    svg.querySelectorAll('text').forEach(e => { if (/\b(NaN|undefined|null|Infinity)\b/.test(e.textContent)) r.nan.push(`svg${si} testo «${e.textContent}»`); });
  });
  const l = document.querySelector('.pt-lettura'); r.lettH = l ? Math.round(l.getBoundingClientRect().height) : 0;
  r.lettura = l ? l.textContent : ''; if (/\b(NaN|undefined|null|Infinity)\b/.test(r.lettura)) r.nan.push('lettura: ' + r.lettura.slice(0, 120));
  r.sfora = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  // comandi fuori dallo schermo o bersagli piccoli
  r.bersagli = [...document.querySelectorAll('.pt-comandi button, .pt-comandi input, .g-premi')].map(e => { const b = e.getBoundingClientRect(); return { w: b.width, h: b.height, x: b.x, r: b.right, t: e.textContent || e.getAttribute('aria-label') || '' }; })
    .filter(b => (b.h < 40 || b.w < 40 || b.r > innerWidth + 0.5 || b.x < -0.5)).map(b => `${b.t.slice(0, 30)} ${b.w.toFixed(0)}×${b.h.toFixed(0)} x${b.x.toFixed(0)}-${b.r.toFixed(0)}`);
  return r;
}
"""
# Imposta lo stato: cursori (indice → valore), seg (indice → indice dell'opzione), tog (indice → bool)
IMPOSTA = r"""
(st) => {
  const curs = () => [...document.querySelectorAll('.pt-comandi input[type=range]')];
  for (const [k, v] of Object.entries(st.seg || {})) { const g = [...document.querySelectorAll('.pt-comandi .seg')][k]; if (g) { const b = g.querySelectorAll('button')[v]; if (b && b.getAttribute('aria-pressed') !== 'true') b.click(); } }
  for (const [k, v] of Object.entries(st.tog || {})) { const t = [...document.querySelectorAll('.pt-comandi .tog')][k]; if (t && (t.getAttribute('aria-pressed') === 'true') !== v) t.click(); }
  for (const [k, v] of Object.entries(st.cur || {})) { const c = curs()[k]; if (c) { const val = v === 'min' ? c.min : v === 'max' ? c.max : v === 'mid' ? String((Number(c.min) + Number(c.max)) / 2) : String(v); c.value = val; c.dispatchEvent(new Event('input', { bubbles: true })); } }
  return true;
}
"""
DESCR = r"""() => ({
  seg: [...document.querySelectorAll('.pt-comandi .seg')].map(g => [...g.querySelectorAll('button')].length),
  tog: [...document.querySelectorAll('.pt-comandi .tog')].length,
  cur: [...document.querySelectorAll('.pt-comandi input[type=range]')].length })"""


def passata(W, H, scuro):
    tag = f"{W}x{H}" + ("-scuro" if scuro else "")
    out = pathlib.Path(tempfile.gettempdir()) / "leggio-pattern-stati" / tag; out.mkdir(parents=True, exist_ok=True)
    so = socket.socket(); so.bind(("127.0.0.1", 0)); port = so.getsockname()[1]; so.close()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "-d", str(REPO)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8); rapporto = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
            ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, is_mobile=True, has_touch=True, color_scheme="dark" if scuro else "light", service_workers="block")
            ctx.route("https://fonts.googleapis.com/**", lambda r: r.fulfill(status=200, content_type="text/css", body=""))
            ctx.route("https://fonts.gstatic.com/**", lambda r: r.fulfill(status=200, content_type="font/woff2", body=b""))
            pg = ctx.new_page(); errs = []
            pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
            pg.on("console", lambda m: errs.append("CONSOLE " + m.text) if m.type == "error" else None)
            U = f"http://127.0.0.1:{port}/pattern.html"
            pg.goto(U); pg.wait_for_timeout(1200)
            ids = solo or pg.evaluate("tavole().map(t => t.id)")
            for tid in ids:
                pg.goto(U + "#t-" + tid); pg.wait_for_timeout(500)
                pg.reload(); pg.wait_for_timeout(900)
                d = pg.evaluate(DESCR)
                segopts = [range(n) for n in d["seg"]]; togopts = [[False, True]] * d["tog"]
                combos = list(itertools.product(*segopts, *togopts))
                curopts = list(itertools.product(["min", "mid", "max"], repeat=d["cur"])) if d["cur"] else [()]
                if len(combos) * len(curopts) > 160:
                    curopts = [c for c in curopts if len(set(c)) == 1] + ([("min", "max", "min"), ("max", "min", "max")][:1] if d["cur"] >= 2 else [])
                    curopts = [c[:d["cur"]] for c in curopts]
                stati = [{"seg": {str(i): cb[i] for i in range(len(d["seg"]))}, "tog": {str(i): cb[len(d["seg"]) + i] for i in range(d["tog"])}, "cur": {str(i): co[i] for i in range(len(co))}}
                         for cb in combos for co in curopts]
                if len(stati) > 220: stati = stati[::max(1, len(stati) // 220)]
                guasti = 0
                for k, st in enumerate(stati):
                    e0 = len(errs)
                    pg.evaluate("(i) => renderTavola(i)", tid); pg.wait_for_timeout(40 if tid != "esercizi-grafico" else 250)
                    pg.evaluate(IMPOSTA, {"seg": st["seg"], "tog": st["tog"]}); pg.wait_for_timeout(30)   # un interruttore può ricostruire i comandi: due passate
                    pg.evaluate(IMPOSTA, {"cur": st["cur"]}); pg.wait_for_timeout(60)
                    m = pg.evaluate(MISURA)
                    prob = {k2: m[k2] for k2 in ("overlap", "fuori", "nan") if m[k2]}
                    if m["sfora"] > 0: prob["sfora"] = m["sfora"]
                    if len(errs) > e0: prob["errori"] = errs[e0:]
                    if prob or foto == "tutte": pg.locator(".pt").screenshot(path=str(out / f"{tid}-{k:03d}.png"))
                    if prob: guasti += 1; rapporto.append({"id": tid, "k": k, "stato": st, "prob": prob, "foto": str(out / f"{tid}-{k:03d}.png")})
                print(("OK  " if not guasti else "ERR ") + f"{tid}: {len(stati)} stati a {tag}" + (f", difetti in {guasti}" if guasti else ""), flush=True)
            b.close()
    finally:
        srv.terminate()
    for r in rapporto[:12]: print("   ", r["id"], json.dumps(r["stato"], ensure_ascii=False), json.dumps(r["prob"], ensure_ascii=False)[:260], r["foto"])
    return rapporto

if __name__ == "__main__":
    passate = [(390, 844, False), (390, 844, True), (360, 780, False)] if "tutte" in opt else [(int(opt.get("w", 390)), int(opt.get("h", 844)), "scuro" in opt)]
    tot = sum(len(passata(*x)) for x in passate)
    print("TUTTO OK" if not tot else f"CI SONO ERRORI: {tot} stati con difetti"); sys.exit(1 if tot else 0)
