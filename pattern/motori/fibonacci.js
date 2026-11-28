/* Motore «fibonacci»: i rapporti tra termini consecutivi della successione di Fibonacci, letti come intervalli.
   r(n) = F(n+2) / F(n+1): 2/1, 3/2, 5/3, 8/5, 13/8 … Oscillano attorno a φ = (1 + √5)/2 e ci convergono.
   Parametri della tavola: { n: rapporto iniziale (1…12, default 4 = 8/5), asse: "cents" | "valore" } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  // Intervalli puri della tabella del §4.10 (A.2), con il loro rapporto.
  const PURI = [{ a: 2, b: 1, nome: "ottava" }, { a: 3, b: 2, nome: "quinta" }, { a: 4, b: 3, nome: "quarta" }, { a: 5, b: 4, nome: "terza maggiore" },
    { a: 6, b: 5, nome: "terza minore" }, { a: 5, b: 3, nome: "sesta maggiore" }, { a: 8, b: 5, nome: "sesta minore" }];
  // Tasti del pianoforte tra la quinta e l'ottava, in centesimi sopra la nota di partenza.
  const TASTI = { 700: "quinta", 800: "sesta minore", 900: "sesta maggiore", 1000: "settima minore", 1100: "settima maggiore", 1200: "ottava" };
  const BREVI = { 700: "5ª", 800: "6ª min.", 900: "6ª magg.", 1000: "7ª min.", 1100: "7ª magg.", 1200: "8ª" };
  const N_MAX = 12;
  const calcola = {
    N_MAX, PURI, TASTI,
    PHI: (1 + Math.sqrt(5)) / 2,
    centsPhi: () => PN.cents((1 + Math.sqrt(5)) / 2),
    fib(n) { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; },   // F(0) = 0, F(1) = F(2) = 1
    num: (n) => calcola.fib(n + 2), den: (n) => calcola.fib(n + 1),
    frazione: (n) => calcola.num(n) + "/" + calcola.den(n),
    rapporto: (n) => calcola.num(n) / calcola.den(n),
    cents: (n) => PN.cents(calcola.rapporto(n)),
    sopraSotto: (n) => Math.sign(calcola.rapporto(n) - calcola.PHI),   // +1 sopra, −1 sotto
    distanza: (n) => Math.abs(calcola.rapporto(n) - calcola.PHI),
    // L'intervallo puro che il rapporto è esattamente (confronto tra interi: a·den = b·num), oppure null.
    puro: (n) => PURI.find((p) => p.a * calcola.den(n) === p.b * calcola.num(n)) || null,
    // I tasti più vicini sotto e sopra (multipli di 100 centesimi).
    tasti: (n) => { const c = calcola.cents(n); return { sotto: Math.floor(c / 100 + 1e-9) * 100, sopra: Math.ceil(c / 100 - 1e-9) * 100, vicino: Math.round(c / 100) * 100 }; },
  };
  // Un rapporto scritto senza zeri inutili: 2 · 1,5 · 1,6 · 1,625 · 1,6154
  const dec = (x) => PN.num(x, 4).replace(/,?0+$/, "");

  function disegna(ctx, param) {
    const PG = root.PG, C = calcola, n1 = PN.intervallo(1, N_MAX);
    let n = Number.isInteger(param.n) && param.n >= 1 && param.n <= N_MAX ? param.n : 4, asse = param.asse === "valore" ? "valore" : "cents";
    const cur = PG.cursore({ etichetta: "Rapporto n", min: 1, max: N_MAX, passo: 1, valore: n, mostra: (v) => "n = " + v + " · " + C.frazione(v), su: (v) => { n = v; ridisegna(); } });
    ctx.comandi.replaceChildren(cur,
      PG.seg({ etichetta: "Asse", opzioni: [{ v: "cents", t: "centesimi" }, { v: "valore", t: "valore" }], valore: asse, su: (v) => { asse = v; ridisegna(); } }));

    function ridisegna() {
      const val = asse === "cents", y = (k) => (val ? C.cents(k) : C.rapporto(k)), yPhi = val ? C.centsPhi() : C.PHI;
      const P = PG.piano({
        h: 300, x: [0.4, N_MAX + 0.6], y: val ? [650, 1250] : [1.4, 2.1], m: { l: 40, r: val ? 50 : 12, t: 14, b: 34 },
        xt: n1.map((k) => ({ v: k, t: String(k), cls: k === n ? "forte" : "" })),
        yt: val ? [700, 800, 900, 1000, 1100, 1200] : [1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2].map((v) => ({ v, t: PN.num(v, 1) })),
        xlab: "n (rapporto n-esimo)", ylab: val ? "centesimi" : "valore del rapporto",
        aria: `Rapporti di Fibonacci da 2/1 a ${C.frazione(N_MAX)}: ${n1.slice(0, 6).map((k) => C.frazione(k) + " = " + PN.num(C.cents(k), 0) + " centesimi").join(", ")}… Limite φ = ${PN.num(C.PHI, 3)}, ${PN.num(C.centsPhi(), 2)} centesimi.`,
      });
      if (val) {
        P.fasciaY(800, 900, "");
        Object.keys(BREVI).forEach((c) => P.testo(P.W - P.m.r + 5, P.sy(Number(c)) + 3.5, BREVI[c], { px: true, anc: "start", cls: "m p" }));
      }
      P.retta(0.4, yPhi, N_MAX + 0.6, yPhi, "s-d tratt");
      P.testo(0.5, yPhi, "φ = " + (val ? PN.num(yPhi, 2) : PN.num(yPhi, 3)), { anc: "start", cls: "s-d p", dy: -6 });
      P.spezzata(n1.map((k) => [k, y(k)]), "s-m");
      n1.forEach((k) => {
        const p = C.puro(k), sel = k === n;
        P.punto(k, y(k), { cls: p ? "s-a" : "s-b", forma: p ? "cerchio" : "quadro", vuoto: !p && !sel, r: sel ? 7 : 4.5,
          t: k <= 4 || sel ? C.frazione(k) : null, pos: (C.sopraSotto(k) > 0 ? "n" : "s") + (k >= 10 ? "o" : "e"), tcls: sel ? "" : "m p",
          tit: `${C.frazione(k)}: ${PN.num(C.cents(k), 1)} centesimi`, su: () => { n = k; cur.metti(k); ridisegna(); } });
      });
      ctx.graf.replaceChildren(
        PG.h("h3", { text: val ? "I rapporti in centesimi, accanto ai tasti" : "I rapporti come numeri: sopra e sotto φ" }), P.svg,
        PG.legenda([{ cls: "s-a", forma: "cerchio", t: "intervallo puro" }, { cls: "s-b", forma: "quadro", t: "nessun intervallo" }, { cls: "s-d tratt", forma: "linea", t: "limite φ" }]));

      const c = C.cents(n), p = C.puro(n), ta = C.tasti(n), dove = C.sopraSotto(n) > 0 ? "sopra" : "sotto";
      const d = C.distanza(n), cifre = Math.max(4, Math.ceil(-Math.log10(d)) + 1);
      const coda = ` ${dove[0].toUpperCase() + dove.slice(1)} φ di ${PN.num(d, cifre)}.`;
      if (p) ctx.lettura(`**${C.frazione(n)}** = ${dec(C.rapporto(n))} → ${PN.num(c, 1)} centesimi: ${p.nome} pura (il tasto è a ${ta.vicino}).${coda}`);
      else ctx.lettura(`**${C.frazione(n)}** = ${dec(C.rapporto(n))} → ${PN.num(c, 1)} centesimi: tra la ${TASTI[ta.sotto]} (${ta.sotto}) e la ${TASTI[ta.sopra]} (${ta.sopra}): nessun tasto, nessun intervallo puro.${coda}`);
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("fibonacci", def);
})(typeof self !== "undefined" ? self : this);
