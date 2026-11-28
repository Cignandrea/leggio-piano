/* Pattern — grafico: piano cartesiano in SVG, tastiera, comandi e suono.
   Le tavole disegnano solo attraverso queste funzioni, così tutte hanno lo stesso aspetto e reggono il tema chiaro e scuro.
   Unità: il piano è largo 360 unità (un telefono a 390 px lo mostra quasi 1:1); i testi non scendono sotto 10 unità. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  function attr(e, a) {
    for (const k in a) {
      const v = a[k]; if (v == null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on" && typeof v === "function") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    return e;
  }
  function figli(e, kids) { for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k); return e; }
  const s = (tag, a, ...kids) => figli(attr(document.createElementNS(NS, tag), a || {}), kids);
  const h = (tag, a, ...kids) => figli(attr(document.createElement(tag), a || {}), kids);
  const r1 = (v) => Math.round(v * 10) / 10;
  let seq = 0;

  /* ---------- Piano cartesiano ----------
     opts: { w, h, x:[min,max], y:[min,max], m:{l,r,t,b}, xt, yt (tacche: numeri oppure {v, t}), xlab, ylab,
             griglia (default true), xlog, ylog, assi: "bordo" (default) | "origine", aria: descrizione per chi non vede } */
  function piano(o) {
    const W = o.w || 360, H = o.h || 250, m = Object.assign({ l: 38, r: 12, t: 14, b: 34 }, o.m || {});
    const fx = o.xlog ? Math.log : (v) => v, fy = o.ylog ? Math.log : (v) => v;
    const [x0, x1] = o.x.map(fx), [y0, y1] = o.y.map(fy);
    const sx = (v) => m.l + (fx(v) - x0) / (x1 - x0) * (W - m.l - m.r);
    const sy = (v) => H - m.b - (fy(v) - y0) / (y1 - y0) * (H - m.t - m.b);
    const id = "gclip" + (++seq);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "g-svg", role: "img", "aria-label": o.aria || "Grafico" });
    svg.append(s("defs", {}, s("clipPath", { id }, s("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }))));
    const gGriglia = s("g", { class: "g-griglia" }), gAssi = s("g", { class: "g-assi" }), gDati = s("g", { "clip-path": `url(#${id})` }), gSopra = s("g", {});
    svg.append(s("rect", { class: "g-fondo", x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b }), gGriglia, gDati, gAssi, gSopra);
    const tacche = (v) => (v || []).map((t) => (typeof t === "number" ? { v: t, t: String(t).replace(".", ",").replace("-", "−") } : t));
    const xt = tacche(o.xt), yt = tacche(o.yt), grid = o.griglia !== false;
    const origine = o.assi === "origine";
    const ax = origine && o.y[0] <= 0 && o.y[1] >= 0 ? sy(0) : H - m.b, ay = origine && o.x[0] <= 0 && o.x[1] >= 0 ? sx(0) : m.l;
    for (const t of xt) {
      const X = r1(sx(t.v));
      if (grid) gGriglia.append(s("line", { x1: X, x2: X, y1: m.t, y2: H - m.b }));
      gAssi.append(s("line", { class: "g-tacca", x1: X, x2: X, y1: H - m.b, y2: H - m.b + 4 }));
      if (t.t !== "") gAssi.append(s("text", { class: "g-num" + (t.cls ? " " + t.cls : ""), x: X, y: H - m.b + 16, "text-anchor": "middle", text: t.t }));
    }
    for (const t of yt) {
      const Y = r1(sy(t.v));
      if (grid) gGriglia.append(s("line", { x1: m.l, x2: W - m.r, y1: Y, y2: Y }));
      gAssi.append(s("line", { class: "g-tacca", x1: m.l - 4, x2: m.l, y1: Y, y2: Y }));
      if (t.t !== "") gAssi.append(s("text", { class: "g-num" + (t.cls ? " " + t.cls : ""), x: m.l - 7, y: Y + 3.5, "text-anchor": "end", text: t.t }));
    }
    gAssi.append(s("line", { class: "g-asse", x1: m.l, x2: W - m.r, y1: r1(ax), y2: r1(ax) }), s("line", { class: "g-asse", x1: r1(ay), x2: r1(ay), y1: m.t, y2: H - m.b }));
    if (o.xlab) gAssi.append(s("text", { class: "g-lab", x: W - m.r, y: H - 4, "text-anchor": "end", text: o.xlab }));
    if (o.ylab) gAssi.append(s("text", { class: "g-lab", x: 4, y: 11, "text-anchor": "start", text: o.ylab }));

    const P = { svg, W, H, m, sx, sy, s, dati: gDati, sopra: gSopra };
    P.retta = (xa, ya, xb, yb, cls) => { const e = s("line", { class: "g-linea " + (cls || ""), x1: r1(sx(xa)), y1: r1(sy(ya)), x2: r1(sx(xb)), y2: r1(sy(yb)) }); gDati.append(e); return e; };
    P.spezzata = (pts, cls) => { const e = s("polyline", { class: "g-linea " + (cls || ""), points: pts.map(([x, y]) => r1(sx(x)) + "," + r1(sy(y))).join(" ") }); gDati.append(e); return e; };
    P.curva = (fn, cls, n, tratto) => { const N = n || 240, a = tratto ? tratto[0] : o.x[0], b = tratto ? tratto[1] : o.x[1], pts = []; for (let i = 0; i <= N; i++) { const x = o.xlog ? a * Math.pow(b / a, i / N) : a + (b - a) * i / N, y = fn(x); if (isFinite(y)) pts.push([x, y]); } return P.spezzata(pts, cls); };
    P.area = (pts, cls) => { const e = s("polygon", { class: "g-area " + (cls || ""), points: pts.map(([x, y]) => r1(sx(x)) + "," + r1(sy(y))).join(" ") }); gDati.append(e); return e; };
    P.fasciaX = (xa, xb, cls) => { const e = s("rect", { class: "g-fascia " + (cls || ""), x: r1(sx(xa)), y: m.t, width: r1(sx(xb) - sx(xa)), height: H - m.t - m.b }); gDati.append(e); return e; };
    P.fasciaY = (ya, yb, cls) => { const e = s("rect", { class: "g-fascia " + (cls || ""), x: m.l, y: r1(sy(yb)), width: W - m.l - m.r, height: r1(sy(ya) - sy(yb)) }); gDati.append(e); return e; };
    // Testo in coordinate del piano. o: { cls, anc: start|middle|end, dx, dy, px: true se x e y sono già in unità del disegno }
    P.testo = (x, y, str, t) => { t = t || {}; const e = s("text", { class: "g-testo " + (t.cls || ""), x: r1((t.px ? x : sx(x)) + (t.dx || 0)), y: r1((t.px ? y : sy(y)) + (t.dy || 0)), "text-anchor": t.anc || "middle", text: str }); gSopra.append(e); return e; };
    // Punto. p: { r, cls, forma: cerchio|quadro|rombo|tri, vuoto, t: etichetta, pos: n|s|e|o|ne|no|se|so, tcls, su: funzione al tocco, tit: nome per chi non vede }
    P.punto = (x, y, p) => {
      p = p || {}; const X = r1(sx(x)), Y = r1(sy(y)), r = p.r || 5, cls = "g-punto " + (p.cls || "") + (p.vuoto ? " vuoto" : "");
      let e;
      if (p.forma === "quadro") e = s("rect", { class: cls, x: X - r, y: Y - r, width: 2 * r, height: 2 * r, rx: 1.5 });
      else if (p.forma === "rombo") e = s("polygon", { class: cls, points: `${X},${Y - r * 1.25} ${X + r * 1.25},${Y} ${X},${Y + r * 1.25} ${X - r * 1.25},${Y}` });
      else if (p.forma === "tri") e = s("polygon", { class: cls, points: `${X},${Y - r * 1.2} ${X + r * 1.15},${Y + r * 0.9} ${X - r * 1.15},${Y + r * 0.9}` });
      else e = s("circle", { class: cls, cx: X, cy: Y, r });
      const g = s("g", {}, e);
      let et = null;
      if (p.t != null) {
        const d = r + 4, pos = p.pos || "n", dx = /e/.test(pos) ? d : /o/.test(pos) ? -d : 0, dy = /n/.test(pos) ? -d : /s/.test(pos) ? d + 8 : 3.5;
        et = s("text", { class: "g-testo " + (p.tcls || ""), x: X + dx, y: Y + dy, "text-anchor": /e/.test(pos) ? "start" : /o/.test(pos) ? "end" : "middle", text: p.t });
      }
      if (p.su) {
        if (et) g.append(et);
        g.append(s("circle", { class: "g-tocco", cx: X, cy: Y, r: Math.max(20, r + 8) }));
        attr(g, { class: "g-premi", tabindex: 0, role: "button", "aria-label": p.tit || p.t || "punto", onclick: p.su, onkeydown: (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); p.su(ev); } } });
        gSopra.append(g);
      } else {
        if (p.tit) g.append(s("title", { text: p.tit }));
        gDati.append(g); if (et) gSopra.append(et);   // la forma resta dentro il piano, l'etichetta non viene tagliata dal bordo
      }
      return g;
    };
    return P;
  }

  /* ---------- Tastiera ----------
     o: { da, a (numeri MIDI, estremi su tasti bianchi), w, h, segna: { midi: { cls: "f-a"|"f-b"|…, t: etichetta } }, aria } */
  const NERO = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  function tastiera(o) {
    const W = o.w || 360, H = o.h || 78, bianchi = [];
    for (let mi = o.da; mi <= o.a; mi++) if (!NERO[((mi % 12) + 12) % 12]) bianchi.push(mi);
    const lw = W / bianchi.length, svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "g-svg g-tast", role: "img", "aria-label": o.aria || "Tastiera" });
    const gB = s("g", {}), gN = s("g", {}), gS = s("g", {}), segna = o.segna || {};
    const xB = {}; bianchi.forEach((mi, i) => { xB[mi] = i * lw; gB.append(s("rect", { class: "g-tb", x: r1(i * lw + 0.5), y: 0.5, width: r1(lw - 1), height: H - 1, rx: 2 })); });
    const centro = (mi) => (NERO[((mi % 12) + 12) % 12] ? xB[mi - 1] + lw : xB[mi] + lw / 2);
    for (let mi = o.da; mi <= o.a; mi++) if (NERO[((mi % 12) + 12) % 12] && xB[mi - 1] != null && xB[mi + 1] != null) gN.append(s("rect", { class: "g-tn", x: r1(xB[mi - 1] + lw - lw * 0.3), y: 0.5, width: r1(lw * 0.6), height: r1(H * 0.6), rx: 1.5 }));
    for (const k in segna) {
      const mi = Number(k), v = segna[k], nero = NERO[((mi % 12) + 12) % 12]; if (mi < o.da || mi > o.a) continue;
      const X = r1(centro(mi)), Y = nero ? r1(H * 0.6 - 11) : H - 13, rr = Math.min(9, lw * 0.36);
      gS.append(s("circle", { class: "g-segno " + (v.cls || "f-a"), cx: X, cy: Y, r: r1(rr) }));
      if (v.t != null) gS.append(s("text", { class: "g-segno-t", x: X, y: Y + 3.2, "text-anchor": "middle", text: v.t }));
    }
    svg.append(gB, gN, gS); return svg;
  }

  /* ---------- Comandi ---------- */
  // Scelta tra poche opzioni. o: { etichetta, opzioni: [{ v, t }], valore, su(v) }
  function seg(o) {
    const g = h("div", { class: "seg", role: "group", "aria-label": o.etichetta });
    const bs = o.opzioni.map((op) => h("button", { type: "button", "aria-pressed": String(op.v === o.valore), text: op.t, onclick: () => { bs.forEach((b, i) => b.setAttribute("aria-pressed", String(o.opzioni[i].v === op.v))); o.su(op.v); } }));
    g.append(...bs);
    return h("div", { class: "pt-com" }, o.mostraEtichetta === false ? null : h("span", { class: "pt-com-l", text: o.etichetta }), g);
  }
  // Valore su un intervallo. o: { etichetta, min, max, passo, valore, mostra(v) → testo, su(v) }
  function cursore(o) {
    const passo = o.passo || 1, mostra = o.mostra || String, out = h("output", { class: "pt-val", text: mostra(o.valore) });
    const inp = h("input", { type: "range", min: o.min, max: o.max, step: passo, value: o.valore, "aria-label": o.etichetta });
    const metti = (v, avvisa) => { v = Math.min(o.max, Math.max(o.min, Math.round(v / passo) * passo)); v = Math.round(v * 1e6) / 1e6; inp.value = v; out.textContent = mostra(v); if (avvisa) o.su(v); };
    inp.addEventListener("input", () => metti(Number(inp.value), true));
    const meno = h("button", { type: "button", class: "btn sq44", "aria-label": o.etichetta + ": meno", text: "−", onclick: () => metti(Number(inp.value) - passo, true) });
    const piu = h("button", { type: "button", class: "btn sq44", "aria-label": o.etichetta + ": più", text: "+", onclick: () => metti(Number(inp.value) + passo, true) });
    const el = h("div", { class: "pt-com pt-cur" }, h("div", { class: "pt-cur-t" }, h("span", { class: "pt-com-l", text: o.etichetta }), out), h("div", { class: "pt-cur-r" }, meno, inp, piu));
    el.metti = (v) => metti(v, false); return el;
  }
  // Acceso/spento. o: { etichetta, valore, su(bool) }
  function interruttore(o) {
    const b = h("button", { type: "button", class: "tog", "aria-pressed": String(!!o.valore), text: o.etichetta, onclick: () => { const v = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(v)); o.su(v); } });
    return b;
  }
  const pulsante = (o) => h("button", { type: "button", class: "btn s " + (o.cls || ""), text: o.t, onclick: o.su, "aria-label": o.aria || null });
  const riga = (...els) => h("div", { class: "pt-riga" }, els);
  // Legenda: voci = [{ cls: "s-a", forma: "linea"|"cerchio"|"quadro"|"rombo"|"tri", t }]
  function legenda(voci) {
    return h("ul", { class: "pt-leg" }, voci.map((v) => {
      const sv = s("svg", { viewBox: "0 0 22 12", class: "pt-leg-i", "aria-hidden": "true" });
      if (v.forma === "linea" || !v.forma) sv.append(s("line", { class: "g-linea " + v.cls, x1: 1, x2: 21, y1: 6, y2: 6 }));
      else if (v.forma === "quadro") sv.append(s("rect", { class: "g-punto " + v.cls, x: 6, y: 1, width: 10, height: 10, rx: 1.5 }));
      else if (v.forma === "rombo") sv.append(s("polygon", { class: "g-punto " + v.cls, points: "11,0 17,6 11,12 5,6" }));
      else if (v.forma === "tri") sv.append(s("polygon", { class: "g-punto " + v.cls, points: "11,0.5 17,11 5,11" }));
      else sv.append(s("circle", { class: "g-punto " + v.cls, cx: 11, cy: 6, r: 5 }));
      return h("li", {}, sv, h("span", { text: v.t }));
    }));
  }

  /* ---------- Suono ----------
     suona([{ f: hertz, g: volume 0–1 }], secondi): somma di sinusoidi, con attacco e rilascio morbidi. Torna la funzione che ferma il suono. */
  let actx = null, fermaUltimo = null;
  function suona(parziali, durata) {
    try {
      const C = root.AudioContext || root.webkitAudioContext; if (!C) return () => {};
      if (!actx) actx = new C(); if (actx.state === "suspended") actx.resume();
      if (fermaUltimo) fermaUltimo();
      const t0 = actx.currentTime + 0.03, d = durata || 2, out = actx.createGain();
      out.gain.setValueAtTime(0.0001, t0); out.gain.exponentialRampToValueAtTime(1, t0 + 0.05); out.gain.setValueAtTime(1, t0 + d - 0.25); out.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      out.connect(actx.destination);
      const osc = parziali.map((p) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = p.tipo || "sine"; o.frequency.value = p.f; g.gain.value = p.g == null ? 0.2 : p.g; o.connect(g).connect(out); o.start(t0); o.stop(t0 + d + 0.05); return o; });
      const ferma = () => { try { out.gain.cancelScheduledValues(actx.currentTime); out.gain.setTargetAtTime(0.0001, actx.currentTime, 0.02); osc.forEach((o) => o.stop(actx.currentTime + 0.15)); } catch (e) { /* già fermo */ } if (fermaUltimo === ferma) fermaUltimo = null; };
      fermaUltimo = ferma; return ferma;
    } catch (e) { return () => {}; }
  }
  const zitto = () => { if (fermaUltimo) fermaUltimo(); };

  root.PG = { s, h, piano, tastiera, seg, cursore, interruttore, pulsante, riga, legenda, suona, zitto };
})(typeof self !== "undefined" ? self : this);
