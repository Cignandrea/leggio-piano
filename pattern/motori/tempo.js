/* Motore «tempo»: battiti al minuto e secondi per battito sono inversi, T = 60 / BPM; una curva (iperbole), non una retta.
   Parametri della tavola: { bpm: valore iniziale (default 60), divisione: "pari" | "shuffle" } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const MIN = 40, MAX = 180, GRADINI = [60, 70, 80], ALTRI = [90, 120];
  const calcola = {
    MIN, MAX, GRADINI, ALTRI,
    durata: (bpm) => 60 / bpm,                                                     // secondi per un tempo (una semiminima in 4/4)
    valori: (bpm) => ({ semiminima: 60 / bpm, minima: 2 * 60 / bpm, semibreve: 4 * 60 / bpm }),
    // Quanto tempo perde ogni nota se il metronomo sale di «delta» battiti: in secondi e in percentuale della durata di partenza.
    guadagno(bpm, delta) {
      const a = calcola.durata(bpm), b = calcola.durata(bpm + delta);
      return { secondi: a - b, percento: 100 * (a - b) / a };
    },
    pendenza: (bpm) => -60 / (bpm * bpm),                                          // derivata di 60/x: secondi per ogni BPM in più
    // Un tempo diviso in due: pari = metà e metà; shuffle = prima e terza nota di una terzina, 2/3 e 1/3 (il rapporto vero varia).
    divisione(bpm, tipo) {
      const T = calcola.durata(bpm);
      return tipo === "shuffle" ? [2 * T / 3, T / 3] : [T / 2, T / 2];
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    let bpm = Number.isInteger(param.bpm) && param.bpm >= MIN && param.bpm <= MAX ? param.bpm : 60, div = param.divisione === "shuffle" ? "shuffle" : "pari";
    const s = (x, d) => PN.num(x, d === undefined ? 2 : d) + "\u00a0s";   // spazio che non va a capo
    const cur = PG.cursore({ etichetta: "Metronomo", min: MIN, max: MAX, passo: 1, valore: bpm, mostra: (v) => v + " BPM", su: (v) => { bpm = v; ridisegna(); } });
    const salta = (v) => { bpm = v; cur.metti(v); ridisegna(); };
    ctx.comandi.replaceChildren(cur,
      PG.riga(...GRADINI.map((v) => PG.pulsante({ t: v + " BPM", aria: "Metronomo a " + v, su: () => salta(v) }))),
      PG.seg({ etichetta: "Divisione", opzioni: [{ v: "pari", t: "pari" }, { v: "shuffle", t: "shuffle" }], valore: div, su: (v) => { div = v; ridisegna(); } }));

    function ridisegna() {
      const T = calcola.durata(bpm), v = calcola.valori(bpm), g = calcola.guadagno(bpm, 10), m = calcola.pendenza(bpm);
      const dieci = bpm + 10;

      /* 1. L'iperbole T = 60 / BPM */
      const P = PG.piano({
        h: 250, x: [MIN, MAX], y: [0, 1.6], m: { l: 38, r: 12, t: 22, b: 34 },
        xt: [40, 60, 80, 100, 120, 140, 160, 180].map((x) => ({ v: x, t: String(x), cls: x === bpm ? "forte" : "" })),
        yt: [0, 0.5, 1, 1.5].map((y) => ({ v: y, t: PN.num(y, 1) })),
        xlab: "battiti al minuto (BPM)", ylab: "secondi per tempo",
        aria: `Curva T = 60 / BPM. A ${bpm} BPM un tempo dura ${s(T)}; dieci battiti in più tolgono ${s(g.secondi)}, il ${PN.num(g.percento, 1)} per cento. Gradini del metronomo: ${GRADINI.map((b) => b + " BPM " + s(calcola.durata(b))).join(", ")}.`,
      });
      P.retta(MIN, T, bpm, T, "s-m tratt fine"); P.retta(bpm, 0, bpm, T, "s-m tratt fine");
      P.curva(calcola.durata, "");
      // tangente: segmento corto con la pendenza calcolata
      const dx = 16; P.retta(bpm - dx, T - m * dx, bpm + dx, T + m * dx, "s-a tratt");
      // dieci battiti in più: il gradino orizzontale e la perdita in verticale
      if (dieci) { const T2 = calcola.durata(dieci); P.retta(bpm, T, dieci, T, "s-c fine"); P.retta(dieci, T, dieci, T2, "s-c grossa"); }
      ALTRI.forEach((b) => P.punto(b, calcola.durata(b), { cls: "s-m", r: 4, tit: `${b} BPM: ${s(calcola.durata(b))}` }));
      GRADINI.forEach((b) => P.punto(b, calcola.durata(b), { cls: "s-d", forma: "rombo", r: 4.5, tit: `gradino ${b} BPM: ${s(calcola.durata(b))}` }));
      P.punto(bpm, T, { cls: "s-a", r: 6, t: s(T), pos: bpm > 140 ? "no" : bpm < 50 ? "e" : "ne", tcls: "g" });

      /* 2. Un tempo diviso in due */
      const [d1, d2] = calcola.divisione(bpm, div), W = 360, L = 14, R = 346, H = 74, y0 = 20, hb = 30, xs = (t) => L + (R - L) * t / T;
      const S = PG.s, bar = S("svg", { viewBox: `0 0 ${W} ${H}`, class: "g-svg", role: "img", "aria-label": `Un tempo a ${bpm} BPM, ${div === "pari" ? "pari" : "shuffle"}: ${s(d1)} e ${s(d2)}.` });
      const parte = (a, b, cls, testo) => [
        S("rect", { class: "g-area " + cls, x: xs(a), y: y0, width: xs(b) - xs(a), height: hb }),
        S("text", { class: "g-testo", x: (xs(a) + xs(b)) / 2, y: y0 + hb / 2 + 4, "text-anchor": "middle", text: testo })];
      bar.append(...parte(0, d1, "s-c", (div === "shuffle" ? "lunga " : "") + s(d1)), ...parte(d1, T, "s-d", (div === "shuffle" ? "corta " : "") + s(d2)));
      // la griglia della terzina: tacche sopra e sotto la barra, che non coprono le scritte
      if (div === "shuffle") [1, 2].forEach((k) => bar.append(
        S("line", { class: "g-linea s-m", x1: xs(k * T / 3), x2: xs(k * T / 3), y1: y0 - 7, y2: y0 }), S("line", { class: "g-linea s-m", x1: xs(k * T / 3), x2: xs(k * T / 3), y1: y0 + hb, y2: y0 + hb + 7 })));
      bar.append(S("rect", { class: "g-linea fine", x: L, y: y0, width: R - L, height: hb }), S("line", { class: "g-linea", x1: xs(d1), x2: xs(d1), y1: y0 - 6, y2: y0 + hb + 6 }));
      bar.append(S("text", { class: "g-num", x: L, y: 12, "text-anchor": "start", text: "0 s" }), S("text", { class: "g-num", x: R, y: 12, "text-anchor": "end", text: "un tempo = " + s(T) }));
      if (div === "shuffle") bar.append(S("text", { class: "g-testo m p", x: (L + R) / 2, y: y0 + hb + 17, "text-anchor": "middle", text: "tacche: la terzina, tre parti uguali" }));
      else bar.append(S("text", { class: "g-testo m p", x: (L + R) / 2, y: y0 + hb + 17, "text-anchor": "middle", text: "due parti uguali" }));

      ctx.graf.replaceChildren(
        PG.h("h3", { text: "Secondi per tempo: T = 60 / BPM" }), P.svg,
        PG.legenda([{ cls: "s-d", forma: "rombo", t: "gradini 60, 70, 80 (§5.3)" }, { cls: "s-m", forma: "cerchio", t: "90 e 120" }, { cls: "s-a tratt", forma: "linea", t: "tangente" }, { cls: "s-c grossa", forma: "linea", t: "10 BPM in più" }]),
        PG.h("h3", { text: div === "shuffle" ? "Un tempo in shuffle: lunga e corta, circa 2 : 1" : "Un tempo in ritmo pari: metà e metà" }), bar);

      let r = `**${bpm} BPM**: un tempo dura ${s(T)} · minima ${s(v.minima)} · semibreve ${s(v.semibreve)}.`;
      if (dieci) r += ` Dieci battiti in più tolgono ${s(g.secondi)} a ogni tempo (−${PN.num(g.percento, 1)}%).`;
      r += ` Pendenza della tangente: ${PN.num(m, 4)} s per ogni battito in più.`;
      ctx.lettura(r);
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("tempo", def);
})(typeof self !== "undefined" ? self : this);
