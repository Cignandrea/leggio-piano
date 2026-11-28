/* Motore «giri-rette»: un giro di accordi scritto in più tonalità, sul piano «tonalità × fondamentale».
   Ogni grado è una retta di pendenza 1; cambiare tonalità è scorrere lungo le rette.
   Parametri: { giri: [{ id, nome, gradi: [0…6] }], tonalita: [posti q delle toniche], t: tonalità iniziale, giro: id iniziale } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const GIRI = [{ id: "pop", nome: "Giro pop", gradi: [0, 4, 5, 3] }, { id: "arm", nome: "Giro armonico", gradi: [0, 5, 1, 4] }];
  const calcola = {
    GIRI,
    // Gli accordi del giro nella tonalità t: grado, fondamentale (posto q), spostamento dalla tonica in quinte, tipo e sigla.
    accordi: (gradi, t) => gradi.map((g) => { const a = PN.triade(t, g); return { g, romano: a.romano, q: a.q[0], d: PN.Q_GRADO[g], tipo: a.tipo, sigla: a.sigla, nome: a.breve }; }),
    // Dove compare la fondamentale q tra i gradi del giro, nelle tonalità date: [{ t, g }]
    stessaNota: (gradi, tonalita, q) => tonalita.flatMap((t) => gradi.filter((g) => t + PN.Q_GRADO[g] === q).map((g) => ({ t, g }))),
    // Il ritorno all'inizio: di quante quinte si muove la fondamentale dall'ultimo accordo al primo.
    ritorno: (gradi) => PN.Q_GRADO[gradi[0]] - PN.Q_GRADO[gradi[gradi.length - 1]],
    nomeGiro: (gradi) => gradi.map((g) => PN.ROMANI[g]).join("–"),
  };

  function disegna(ctx, param) {
    const PG = root.PG, giri = param.giri && param.giri.length ? param.giri : GIRI, ton = param.tonalita && param.tonalita.length ? param.tonalita : [0, 1, 2, 3, 4];
    let giro = giri.find((x) => x.id === param.giro) || giri[0], t = ton.includes(param.t) ? param.t : ton[0], scelta = null, timer = [];
    const SERIE = ["s-a", "s-b", "s-c", "s-d", "s-m", "s-m", "s-m"];
    const forma = (tipo) => (tipo === "magg" ? "cerchio" : tipo === "min" ? "quadro" : "rombo");
    const com = [];
    if (giri.length > 1) com.push(PG.seg({ etichetta: "Giro", opzioni: giri.map((x) => ({ v: x.id, t: x.nome })), valore: giro.id, su: (v) => { giro = giri.find((x) => x.id === v); scelta = null; ridisegna(); } }));
    com.push(PG.seg({ etichetta: "Tonalità", opzioni: ton.map((q) => ({ v: q, t: PN.nomeQ(q) })), valore: t, su: (v) => { t = v; scelta = null; ridisegna(); } }));
    com.push(PG.riga(PG.pulsante({ t: "▶ Ascolta il giro", su: ascolta })));
    ctx.comandi.replaceChildren(...com);

    function ascolta() {
      timer.forEach(clearTimeout); timer = [];
      calcola.accordi(giro.gradi, t).concat(calcola.accordi([giro.gradi[0]], t)).forEach((a, i) => {
        timer.push(setTimeout(() => {
          const tr = PN.triade(t, a.g), base = 48 + PN.pcQ(tr.q[0]), midi = [base - 12, base, base + PN.TIPI[tr.tipo].semitoni[1], base + PN.TIPI[tr.tipo].semitoni[2]];
          PG.suona(midi.flatMap((mi) => [{ f: PN.freqMidi(mi), g: 0.16, tipo: "triangle" }, { f: 2 * PN.freqMidi(mi), g: 0.03 }]), 1.05);
        }, i * 1000));
      });
    }

    function ridisegna() {
      const gradi = giro.gradi, acc = calcola.accordi(gradi, t), ds = gradi.map((g) => PN.Q_GRADO[g]);
      const x0 = ton[0], x1 = ton[ton.length - 1], yMin = x0 + Math.min(...ds), yMax = x1 + Math.max(...ds);
      /* 1. La tabella: tonalità × fondamentale */
      const P = PG.piano({
        h: Math.max(220, 26 * (yMax - yMin + 2) + 50), x: [x0 - 0.45, x1 + 0.75], y: [yMin - 0.7, yMax + 0.7], m: { l: 36, r: 10, t: 14, b: 34 },
        xt: ton.map((q) => ({ v: q, t: PN.nomeQ(q), cls: q === t ? "forte" : "" })), yt: PN.intervallo(yMin, yMax).map((q) => ({ v: q, t: PN.nomeQ(q) })),
        xlab: "tonalità (ogni passo: una quinta)", ylab: "fondamentale dell'accordo (per quinte)",
        aria: `${giro.nome}, ${calcola.nomeGiro(gradi)}, nelle tonalità ${ton.map(PN.nomeQ).join(", ")}. In ${PN.nomeQ(t)}: ${acc.map((a) => a.sigla).join(", ")}.`,
      });
      P.fasciaX(t - 0.32, t + 0.32, "");
      if (scelta != null) P.retta(x0 - 0.45, scelta, x1 + 0.75, scelta, "tratt fine");
      gradi.forEach((g, i) => {
        const d = PN.Q_GRADO[g];
        P.retta(x0 - 0.3, x0 - 0.3 + d, x1 + 0.3, x1 + 0.3 + d, SERIE[i] + " fine");
        P.testo(x1 + 0.42, x1 + 0.3 + d, PN.ROMANI[g], { cls: SERIE[i] + " g", anc: "start", dy: 4 });
        ton.forEach((tq) => {
          const a = PN.triade(tq, g), q = tq + d, attivo = tq === t, stessa = scelta === q;
          P.punto(tq, q, { cls: SERIE[i], forma: forma(a.tipo), r: attivo || stessa ? 6.5 : 4.5, vuoto: !attivo && !stessa, t: attivo ? a.sigla : null, pos: tq === x1 ? "no" : "e", tcls: "g",
            tit: `${a.romano} di ${PN.nomeQ(tq)}: ${a.nome}`, su: () => { scelta = scelta === q ? null : q; ridisegna(); } });
        });
      });
      /* 2. Il giro nel tempo: quante quinte sopra la tonica sta ogni accordo */
      const n = gradi.length, rit = calcola.ritorno(gradi), lo = Math.min(...ds, 0) - 0.9, hi = Math.max(...ds, 0) + 0.9;
      const Q = PG.piano({
        h: 168, x: [0.5, n + 1.6], y: [lo, hi], m: { l: 36, r: 10, t: 12, b: 32 },
        xt: PN.intervallo(1, n + 1).map((b) => ({ v: b, t: b <= n ? String(b) : "1" })), yt: PN.intervallo(Math.ceil(lo), Math.floor(hi)).map((v) => ({ v, t: (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v) })),
        xlab: "battuta", ylab: "quinte sopra la tonica",
        aria: `Il giro nel tempo: ${acc.map((a) => a.sigla + " a " + a.d).join(", ")}, poi il ritorno alla tonica.`,
      });
      Q.retta(0.5, 0, n + 1.6, 0, "s-m");
      Q.spezzata(acc.map((a, i) => [i + 1, a.d]), "");
      Q.retta(n, acc[n - 1].d, n + 1, acc[0].d, "s-a grossa");
      acc.forEach((a, i) => Q.punto(i + 1, a.d, { forma: forma(a.tipo), r: 5.5, t: a.sigla, pos: a.d >= (acc[i + 1] ? acc[i + 1].d : acc[0].d) ? "ne" : "se", tcls: "g" }));
      Q.punto(n + 1, acc[0].d, { forma: forma(acc[0].tipo), r: 5.5, vuoto: true, t: acc[0].sigla, pos: "e", tcls: "g" });

      ctx.graf.replaceChildren(
        PG.h("h3", { text: "La tabella: ogni grado è una retta" }), P.svg,
        PG.legenda(gradi.map((g, i) => ({ cls: SERIE[i], forma: "linea", t: PN.ROMANI[g] })).concat([{ cls: "", forma: "cerchio", t: "maggiore" }, { cls: "", forma: "quadro", t: "minore" }])),
        PG.h("h3", { text: "Il giro nel tempo: in rosso il ritorno all'inizio" }), Q.svg);

      if (scelta != null) {
        const dove = calcola.stessaNota(gradi, ton, scelta);
        ctx.lettura(`Fondamentale **${PN.nomeQ(scelta)}**: ` + dove.map((w) => `${PN.ROMANI[w.g]} di ${PN.nomeQ(w.t)} (${PN.triade(w.t, w.g).sigla})`).join(", ") + ". Stessa riga orizzontale: stessa nota, tonalità vicine.");
      } else {
        const come = rit === -1 ? "la fondamentale scende di una quinta: dominante → tonica" : rit === 1 ? "la fondamentale sale di una quinta: sottodominante → tonica (cadenza plagale)" : `la fondamentale si sposta di ${Math.abs(rit)} quinte`;
        ctx.lettura(`In **${PN.nomeQ(t)}**: ${acc.map((a) => a.sigla).join(" · ")}. Ritorno da ${acc[n - 1].sigla} a ${acc[0].sigla}: ${come}. Tocca un punto per vedere dove torna la stessa nota.`);
      }
    }
    ridisegna();
    return { smonta() { timer.forEach(clearTimeout); } };
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("giri-rette", def);
})(typeof self !== "undefined" ? self : this);
