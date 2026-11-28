/* Motore «gradini»: la regola dei tre gradini del metronomo (60, 70, 80; se a 70 o a 80 non riesce si torna a 60) vista come
   processo a tre fasi con rilavorazione. È un MODELLO: ogni giro a un gradino riesce pulito con probabilità p, fissa e
   indipendente dagli altri giri. Conta i giri, non dice quale regola di studio sia migliore.
   Parametri della tavola: { p: probabilità iniziale a ogni gradino (default 0,8), diversi: [p60, p70, p80] iniziali } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const GRADINI = [60, 70, 80];
  const calcola = {
    GRADINI,
    // Giri attesi partendo da 60, fino al primo giro pulito a 80. Dal sistema
    //   E80 = 1 + (1 − p80)·E60;  E70 = 1 + p70·E80 + (1 − p70)·E60;  E60 = 1 + p60·E70 + (1 − p60)·E60
    // si ricava E60 = (1 + p60 + p60·p70) / (p60·p70·p80).
    attesi: (p0, p1, p2) => (1 + p0 + p0 * p1) / (p0 * p1 * p2),
    resa: (p0, p1, p2) => p0 * p1 * p2,                 // tre gradini puliti di fila, al primo colpo
    curva: (p) => (1 + p + p * p) / (p * p * p),         // la stessa probabilità ai tre gradini
  };

  function disegna(ctx, param) {
    const PG = root.PG, S = PG.s;
    const ok = (x) => typeof x === "number" && x >= 0.3 && x <= 1;
    let p = ok(param.p) ? param.p : 0.8, diversi = false;
    let pd = Array.isArray(param.diversi) && param.diversi.length === 3 && param.diversi.every(ok) ? param.diversi.slice() : [0.9, 0.8, 0.6];
    const su10 = (x) => PN.num(10 * x, Number.isInteger(Math.round(100 * x) / 10) ? 0 : 1);
    const giri = (e) => PN.num(e, 1);
    const pct = (x) => PN.num(100 * x, 0) + "%";
    // «nel 51%», ma «nell'8%», «nell'11%», «nell'80%»: l'articolo si elide davanti a una vocale
    const nel = (x) => { const n = Math.round(100 * x); return (n === 1 || n === 11 || String(n)[0] === "8" ? "nell'" : "nel ") + pct(x); };

    function comandi() {
      const c = [];
      if (!diversi) c.push(PG.cursore({ etichetta: "Giri puliti su 10", min: 3, max: 10, passo: 0.5, valore: 10 * p, mostra: (v) => su10(v / 10) + " su 10", su: (v) => { p = v / 10; ridisegna(); } }));
      else GRADINI.forEach((g, i) => c.push(PG.cursore({ etichetta: `Giri puliti su 10 a ${g}`, min: 3, max: 10, passo: 0.5, valore: 10 * pd[i], mostra: (v) => su10(v / 10) + " su 10", su: (v) => { pd[i] = v / 10; ridisegna(); } })));
      c.push(PG.interruttore({ etichetta: "Gradini diversi", valore: diversi, su: (v) => { diversi = v; comandi(); ridisegna(); } }));
      ctx.comandi.replaceChildren(...c);
    }

    // Schema del processo: tre caselle e la fine, frecce in avanti (p) e ritorni a 60 (1 − p), tratteggiati.
    function schema(q) {
      const W = 360, H = 150, X = [8, 104, 200, 296], w = 56, y = 48, h = 34, cy = y + h / 2;
      const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "g-svg", role: "img",
        "aria-label": `Schema del modello: da 60 a 70 con probabilità ${PN.num(q[0], 2)}, da 70 a 80 con ${PN.num(q[1], 2)}, da 80 alla fine con ${PN.num(q[2], 2)}; altrimenti si torna a 60.` });
      const testo = (x, yy, t, cls, anc) => S("text", { class: "g-testo " + (cls || ""), x, y: yy, "text-anchor": anc || "middle", text: t });
      const punta = (x, yy, dir) => {   // triangolo pieno: dir = destra | su | giu
        const a = 5, pts = dir === "destra" ? [[x, yy], [x - 2 * a, yy - a], [x - 2 * a, yy + a]] : dir === "su" ? [[x, yy], [x - a, yy + 2 * a], [x + a, yy + 2 * a]] : [[x, yy], [x - a, yy - 2 * a], [x + a, yy - 2 * a]];
        return S("polygon", { class: "g-punto", points: pts.map((v) => v.join(",")).join(" ") });
      };
      ["60", "70", "80", "fine"].forEach((t, i) => {
        svg.append(S("rect", { class: "g-linea " + (i === 3 ? "s-c grossa" : "fine"), x: X[i], y, width: w, height: h, rx: 6 }), testo(X[i] + w / 2, cy + 5, t, "g"));
      });
      for (let i = 0; i < 3; i++) {
        const x1 = X[i] + w + 3, x2 = X[i + 1] - 2;
        svg.append(S("line", { class: "g-linea fine", x1, x2: x2 - 8, y1: cy, y2: cy }), punta(x2, cy, "destra"), testo((x1 + x2) / 2, cy - 8, PN.num(q[i], 2), "p"));
      }
      // cappio su 60: si ripete a 60
      const a0 = X[0] + 16, b0 = X[0] + w - 16;
      svg.append(S("path", { class: "g-linea fine tratt", d: `M${a0},${y - 2} C${a0 - 6},${y - 34} ${b0 + 6},${y - 34} ${b0},${y - 12}` }), punta(b0, y - 2, "giu"), testo(X[0] + w / 2, y - 30, PN.num(1 - q[0], 2), "p"));
      // ritorni da 70 e da 80
      const r70 = X[1] + w / 2, r80 = X[2] + w / 2, t60a = X[0] + w - 14, t60b = X[0] + 14, fondo = y + h;
      svg.append(S("path", { class: "g-linea fine tratt", d: `M${r70},${fondo + 2} C${r70},${fondo + 30} ${t60a},${fondo + 30} ${t60a},${fondo + 12}` }), punta(t60a, fondo + 2, "su"),
        testo((r70 + t60a) / 2, fondo + 18, PN.num(1 - q[1], 2), "p"));
      svg.append(S("path", { class: "g-linea fine tratt", d: `M${r80},${fondo + 2} C${r80},${fondo + 62} ${t60b},${fondo + 62} ${t60b},${fondo + 12}` }), punta(t60b, fondo + 2, "su"),
        testo((r80 + t60b) / 2, fondo + 60, PN.num(1 - q[2], 2), "p"));
      svg.append(testo(W - 4, 14, "in avanti: p · indietro a 60: 1 − p", "m p", "end"));
      return svg;
    }

    function ridisegna() {
      const q = diversi ? pd : [p, p, p], E = calcola.attesi(...q), R = calcola.resa(...q);
      /* 2. Giri attesi in funzione di p, scala logaritmica */
      const P = PG.piano({
        h: 240, x: [0.3, 1], y: [1, 60], ylog: true, m: { l: 34, r: 12, t: 22, b: 34 },
        xt: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((v) => ({ v, t: PN.num(10 * v, 0), cls: !diversi && Math.abs(v - p) < 1e-9 ? "forte" : "" })),
        yt: [1, 2, 3, 5, 10, 20, 50].map((v) => ({ v, t: String(v) })),
        xlab: "giri puliti su 10, uguali ai tre gradini", ylab: "giri attesi (scala logaritmica)",
        aria: `Modello dei tre gradini. Giri attesi: con 9 su 10 ${giri(calcola.curva(0.9))}, con 8 su 10 ${giri(calcola.curva(0.8))}, con 5 su 10 ${giri(calcola.curva(0.5))}, con 3 su 10 ${giri(calcola.curva(0.3))}. Minimo 3. Scelta attuale: ${giri(E)} giri.`,
      });
      P.retta(0.3, 3, 1, 3, "s-c tratt");
      P.testo(0.31, 3, "minimo: 3 giri, uno per gradino", { cls: "s-c p", anc: "start", dy: -5 });
      P.curva(calcola.curva, diversi ? "s-m" : "", 200);
      if (!diversi) P.punto(p, E, { cls: "s-a", r: 6, t: giri(E) + " giri", pos: p > 0.85 ? "no" : E > 30 ? "se" : "ne", tcls: "g" });
      else if (E <= 60) {
        P.retta(0.3, E, 1, E, "s-a tratt");
        P.testo(0.99, E, "gradini diversi: " + giri(E) + " giri", { cls: "s-a", anc: "end", dy: -5 });
      }
      ctx.graf.replaceChildren(
        PG.h("h3", { text: "Il modello: tre gradini e un ritorno a 60" }), schema(q),
        PG.h("h3", { text: "Giri attesi per chiudere a 80" }), P.svg,
        PG.legenda(diversi
          ? [{ cls: "s-m", forma: "linea", t: "stessa p ai tre gradini" }, { cls: "s-a tratt", forma: "linea", t: "i tre valori scelti" }, { cls: "s-c tratt", forma: "linea", t: "minimo: 3" }]
          : [{ cls: "", forma: "linea", t: "E(p) = (1 + p + p²) / p³" }, { cls: "s-a", forma: "cerchio", t: "scelta" }, { cls: "s-c tratt", forma: "linea", t: "minimo: 3" }]));

      let r;
      if (!diversi) {
        r = `Con ${su10(p)} giri puliti su 10 a ogni gradino: in media **${giri(E)} giri** per chiudere a 80; tre di fila al primo colpo ${nel(R)} dei casi.`;
        if (p < 1) { const p2 = Math.min(1, p + 0.1); r += ` Con ${su10(p2)} su 10: ${giri(calcola.curva(p2))} giri.`; }
      } else {
        r = `Con ${q.slice(0, 2).map(su10).join(", ")} e ${su10(q[2])} giri puliti su 10 a 60, 70 e 80: in media **${giri(E)} giri** per chiudere a 80; tre di fila al primo colpo ${nel(R)} dei casi.`;
        if (E > 60) r += " Il valore esce dal grafico.";
      }
      ctx.lettura(r + " È un modello: p fissa, giri indipendenti.");
    }
    comandi(); ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("gradini", def);
})(typeof self !== "undefined" ? self : this);
