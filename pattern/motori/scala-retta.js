/* Motore «scala-retta»: i gradi di una scala come punti interi sotto una retta di pendenza 12/7.
   Parametri della tavola: { c: intercetta iniziale (default 5 = maggiore) } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const BIANCHI = ["do", "re", "mi", "fa", "sol", "la", "si"], PC_BIANCHI = [0, 2, 4, 5, 7, 9, 11];
  const calcola = {
    // Gli otto punti (dalla tonica all'ottava): grado k, valore della retta, semitoni (parte intera).
    punti: (c) => PN.intervallo(0, 7).map((k) => ({ k, retta: (12 * k + c) / 7, semitoni: PN.semitoniRetta(k, c) })),
    passi: (c) => PN.passiScala(c).map((p) => (p === 2 ? "T" : "S")),
    modo: (c) => PN.MODI.find((m) => m.c === c),
    // Le note sui tasti bianchi: nome e numero MIDI di ogni grado, partendo dalla nota da cui il modo si legge.
    note(c) {
      const da = BIANCHI.indexOf(calcola.modo(c).da), base = 60 + PC_BIANCHI[da] - (PC_BIANCHI[da] > 7 ? 12 : 0);
      return calcola.punti(c).map((p) => ({ k: p.k, midi: base + p.semitoni, nome: BIANCHI[(da + p.k) % 7] }));
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    let c = Number.isInteger(param.c) && param.c >= 0 && param.c <= 6 ? param.c : PN.C_MAGGIORE;
    const cur = PG.cursore({ etichetta: "Intercetta c", min: 0, max: 6, passo: 1, valore: c, mostra: (v) => "c = " + v, su: (v) => { c = v; ridisegna(); } });
    const scelte = PG.riga(
      PG.pulsante({ t: "Maggiore (c = 5)", su: () => { c = 5; cur.metti(5); ridisegna(); } }),
      PG.pulsante({ t: "Minore naturale (c = 2)", su: () => { c = 2; cur.metti(2); ridisegna(); } }));
    ctx.comandi.replaceChildren(cur, scelte);

    function ridisegna() {
      const pt = calcola.punti(c), passi = calcola.passi(c), modo = calcola.modo(c), note = calcola.note(c);
      const P = PG.piano({
        h: 268, x: [-0.8, 7.45], y: [-0.8, 13.6], m: { l: 30, r: 10, t: 14, b: 34 },
        xt: pt.map((p) => ({ v: p.k, t: p.k === 7 ? "VIII" : PN.ROMANI[p.k] })), yt: [0, 2, 4, 6, 8, 10, 12],
        xlab: "grado della scala", ylab: "semitoni dalla tonica",
        aria: `Scala con intercetta ${c}: ${modo.nome}. Semitoni dalla tonica: ${pt.map((p) => p.semitoni).join(", ")}.`,
      });
      P.retta(-0.8, (12 * -0.8 + c) / 7, 7.45, (12 * 7.45 + c) / 7, "s-m tratt");
      pt.forEach((p) => P.retta(p.k, p.retta, p.k, p.semitoni, "s-a fine"));
      pt.forEach((p, i) => { if (i) P.testo(p.k - 0.5, (pt[i - 1].semitoni + p.semitoni) / 2, passi[i - 1], { cls: passi[i - 1] === "S" ? "s-b g" : "m", dx: 9, dy: 12 }); });
      pt.forEach((p, i) => P.punto(p.k, p.semitoni, { cls: "s-a", r: 5.5, t: note[i].nome, pos: "no", tit: `${p.k === 7 ? "ottava" : PN.ROMANI[p.k] + " grado"}: ${p.semitoni} semitoni, ${note[i].nome}` }));
      const segna = {}; note.forEach((n) => { segna[n.midi] = { cls: "f-a" }; });
      const tast = PG.tastiera({ da: 57, a: 84, h: 62, segna, aria: "Le otto note sui tasti bianchi, da " + modo.da });
      ctx.graf.replaceChildren(P.svg,
        PG.legenda([{ cls: "s-m tratt", forma: "linea", t: "retta: (12·k + c) / 7" }, { cls: "s-a", forma: "cerchio", t: "nota: la parte intera" }]), tast);
      const coda = c === 5 ? "Sui tasti bianchi è la scala di **do**." : c === 2 ? "Sui tasti bianchi si legge da **la**: è la relativa di do maggiore." : `Sui tasti bianchi si legge da **${modo.da}**: un modo che il quaderno non ha ancora incontrato.`;
      ctx.lettura(`**${passi.join(" ")}**: ${modo.nome}. ${coda}`);
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("scala-retta", def);
})(typeof self !== "undefined" ? self : this);
