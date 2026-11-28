/* Motore «rivolti-costo»: scegliere il rivolto come minimo di una funzione di costo.
   Modello: una triade in posizione stretta è una terna di tasti (MIDI) dal basso; il costo di un cambio è la somma dei semitoni
   di cui si spostano le tre voci (bassa con bassa, media con media, alta con alta). Conta solo la distanza, non la comodità.
   Parametri: { da: grado di partenza 0…6, a: grado d'arrivo 0…6, pos: rivolto di partenza 0|1|2 } (tonalità di do maggiore) */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const RIVOLTI = ["stato fondamentale", "primo rivolto", "secondo rivolto"], BREVI = ["fond.", "1º riv.", "2º riv."];
  const nome = (m) => PN.nomeMidi(m).replace(/-?\d+$/, "");
  const calcola = {
    RIVOLTI,
    triadeDo: (g) => PN.triade(0, g).q.map(PN.pcQ),                 // pc di fondamentale, terza, quinta
    nomeAccordo: (g) => PN.triade(0, g).breve,
    // Una posizione stretta: la nota al basso nell'ottava del do centrale (60–71), le altre due subito sopra.
    posizione(g, b) {
      const pc = calcola.triadeDo(g), v = [PN.MIDI_DO4 + pc[b]];
      [1, 2].forEach((i) => { let m = PN.MIDI_DO4 + pc[(b + i) % 3]; while (m <= v[v.length - 1]) m += 12; v.push(m); });
      return v;
    },
    costo: (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0),
    // I tre rivolti dell'accordo g, ciascuno all'ottava che costa meno partendo dalla terna «da».
    posizioni(g, da) {
      return [0, 1, 2].map((b) => {
        const base = calcola.posizione(g, b);
        let best = null;
        for (let k = -3; k <= 3; k++) { const v = base.map((m) => m + 12 * k), c = calcola.costo(da, v); if (!best || c < best.costo) best = { b, midi: v, costo: c }; }
        return best;
      });
    },
    comuni: (g1, g2) => calcola.triadeDo(g1).filter((p) => calcola.triadeDo(g2).includes(p)).length,
    migliore(da, a, pos) {
      const partenza = calcola.posizione(da, pos), riv = calcola.posizioni(a, partenza), min = Math.min(...riv.map((r) => r.costo));
      const vinti = riv.filter((r) => r.costo === min), m = vinti[0];
      return { partenza, rivolti: riv, min, vinti: vinti.map((r) => r.b), midi: m.midi, b: m.b, ferme: m.midi.filter((x, i) => x === partenza[i]) };
    },
    tabella: (da, pos) => PN.intervallo(0, 6).map((a) => ({ a, costo: calcola.migliore(da, a, pos).min, comuni: calcola.comuni(da, a) })),
    frase(da, a, pos) {
      const M = calcola.migliore(da, a, pos), A = calcola.nomeAccordo(a), D = calcola.nomeAccordo(da);
      if (da === a) return `Da **${D}** a **${D}**: stesso accordo, costo minimo 0. Scegli un altro accordo d'arrivo.`;
      const valori = M.rivolti.map((r) => `${RIVOLTI[r.b]} ${r.costo}`).join(", ");
      const note = M.midi.map(nome).join("-"), ferme = M.ferme.map(nome);
      const art = ferme.map((x) => "il " + x), coda = ferme.length ? `, con ${art.length === 1 ? art[0] + " fermo" : art.slice(0, -1).join(", ") + " e " + art[art.length - 1] + " fermi"}` : ", senza note ferme";
      return `Da **${D}** a **${A}**: ${valori} semitoni. Minimo: **${note}** (${RIVOLTI[M.b]})${coda}.` + (M.vinti.length > 1 ? ` Stesso costo anche con il ${RIVOLTI[M.vinti[1]]}.` : "");
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    const ok = (v, n) => Number.isInteger(v) && v >= 0 && v < n;
    let da = ok(param.da, 7) ? param.da : 0, a = ok(param.a, 7) ? param.a : 3, pos = ok(param.pos, 3) ? param.pos : 0;
    const gradi = PN.intervallo(0, 6).map((g) => ({ v: g, t: PN.ROMANI[g] }));
    let segA;
    const faiSegA = () => PG.seg({ etichetta: "A", opzioni: gradi, valore: a, su: (v) => { a = v; ridisegna(); } });
    segA = faiSegA();
    ctx.comandi.replaceChildren(
      PG.seg({ etichetta: "Da", opzioni: gradi, valore: da, su: (v) => { da = v; ridisegna(); } }), segA,
      PG.seg({ etichetta: "Posizione di partenza", opzioni: BREVI.map((t, i) => ({ v: i, t })), valore: pos, su: (v) => { pos = v; ridisegna(); } }));
    const scegliA = (v) => { a = v; const n = faiSegA(); segA.replaceWith(n); segA = n; ridisegna(); };
    const forma = (c) => (c === 2 ? "cerchio" : c === 1 ? "quadro" : "rombo");

    function ridisegna() {
      const M = calcola.migliore(da, a, pos), tab = calcola.tabella(da, pos), A = calcola.nomeAccordo(a), D = calcola.nomeAccordo(da);
      /* 1. I tre rivolti d'arrivo */
      const yMax = Math.max(6, ...M.rivolti.map((r) => r.costo)) + 4;
      const P = PG.piano({
        h: 216, x: [-0.6, 2.6], y: [0, yMax], m: { l: 34, r: 10, t: 24, b: 34 },
        xt: [0, 1, 2].map((b) => ({ v: b, t: ["fondamentale", "1º rivolto", "2º rivolto"][b], cls: M.vinti.includes(b) ? "forte" : "" })), yt: PN.intervallo(0, Math.floor(yMax / 5)).map((i) => 5 * i),
        ylab: "semitoni spostati (somma delle tre voci)",
        aria: `Da ${D} a ${A}: ${M.rivolti.map((r) => RIVOLTI[r.b] + " " + r.costo).join(", ")} semitoni. Minimo ${M.min}.`,
      });
      M.rivolti.forEach((r) => {
        const min = M.vinti.includes(r.b), X0 = P.sx(r.b - 0.28), X1 = P.sx(r.b + 0.28), Y = P.sy(r.costo), Y0 = P.sy(0);
        P.dati.append(P.s("rect", { class: "g-punto " + (min ? "s-a" : "s-m vuoto"), x: X0, y: Math.min(Y, Y0 - 1.5), width: X1 - X0, height: Math.max(1.5, Y0 - Y), rx: 2 }));
        P.testo(r.b, r.costo, PN.num(r.costo), { cls: min ? "s-a g" : "g", dy: -6 });
        if (min) P.testo(r.b, r.costo, "minimo", { cls: "s-a p", dy: -21 });
      });
      /* La tastiera: partenza e arrivo migliore */
      const tutte = M.partenza.concat(M.midi), lo = 12 * Math.floor(Math.min(...tutte) / 12), hi = 12 * Math.floor(Math.max(...tutte) / 12) + 11;
      const segna = {};
      M.partenza.forEach((m) => { segna[m] = { cls: "f-b", t: "p" }; });
      M.midi.forEach((m) => { segna[m] = segna[m] ? { cls: "f-i", t: "=" } : { cls: "f-a", t: "a" }; });
      const tast = PG.tastiera({ da: lo, a: hi, h: 70, segna, aria: `Partenza ${M.partenza.map(PN.nomeMidi).join(", ")}; arrivo ${M.midi.map(PN.nomeMidi).join(", ")}.` });
      /* 2. Dal grado «Da» verso tutti gli altri */
      const y2 = Math.max(...tab.map((r) => r.costo)) + 2;
      const Q = PG.piano({
        h: 206, x: [-0.6, 6.6], y: [0, y2], m: { l: 34, r: 10, t: 24, b: 34 },
        xt: gradi.map((g) => ({ v: g.v, t: g.t, cls: g.v === a ? "forte" : "" })), yt: PN.intervallo(0, Math.floor(y2 / 2)).map((i) => 2 * i),
        xlab: "accordo d'arrivo", ylab: "costo minimo (semitoni)",
        aria: `Da ${D}, ${RIVOLTI[pos]}: costo minimo verso ${tab.filter((r) => r.a !== da).map((r) => PN.ROMANI[r.a] + " " + r.costo).join(", ")}.`,
      });
      tab.forEach((r) => {
        if (r.a === da) { Q.testo(r.a, 0, "da qui", { cls: "m p", dy: -6 }); return; }
        Q.retta(r.a, 0, r.a, r.costo, "s-m fine");
        Q.punto(r.a, r.costo, { cls: r.comuni === 2 ? "s-a" : "s-b", forma: forma(r.comuni), r: r.a === a ? 7 : 5, t: PN.num(r.costo), pos: "n", tcls: r.a === a ? "g" : "",
          tit: `${PN.ROMANI[r.a]}, ${calcola.nomeAccordo(r.a)}: costo ${r.costo}, ${r.comuni} note in comune`, su: () => scegliA(r.a) });
      });
      ctx.graf.replaceChildren(
        PG.h("h3", { text: `Da ${D} (${RIVOLTI[pos]}) a ${A}: i tre rivolti` }), P.svg,
        PG.h("h3", { text: "Sulla tastiera: p partenza, a arrivo, = nota ferma" }), tast,
        PG.h("h3", { text: `Da ${D} verso gli altri accordi: il costo minimo` }), Q.svg,
        PG.legenda([{ cls: "s-a", forma: "cerchio", t: "2 note in comune" }, { cls: "s-b", forma: "quadro", t: "1 nota in comune" }, { cls: "s-b", forma: "rombo", t: "0 note in comune" }]));
      ctx.lettura(calcola.frase(da, a, pos));
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("rivolti-costo", def);
})(typeof self !== "undefined" ? self : this);
