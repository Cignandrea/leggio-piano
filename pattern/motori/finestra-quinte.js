/* Motore «finestra-quinte»: una tonalità maggiore è una finestra di sette posti consecutivi sulla retta delle quinte.
   Dentro la finestra: grado, tipo dell'accordo, funzione; oltre le due linee fisse, le alterazioni dell'armatura.
   Parametri della tavola: { t: tonalità iniziale (posto q della tonica, da −6 a 6), relativa: true|false } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const Q_MIN = -7, Q_MAX = 11, T_MIN = -6, T_MAX = 6;
  const DIESIS_DA = 6, BEMOLLE_DA = -2;            // le note naturali occupano i posti da −1 a +5
  const calcola = {
    Q_MIN, Q_MAX, T_MIN, T_MAX,
    // Ogni posto mostrato: nome, se sta nella finestra, grado (0…6 o −1), numero romano, tipo dell'accordo, funzione, alterazione.
    righe(t) {
      const arm = PN.armatura(t);
      return PN.intervallo(Q_MIN, Q_MAX).map((q) => {
        const g = PN.gradoDiQ(t, q), dentro = g >= 0, tr = dentro ? PN.triade(t, g) : null;
        return { q, nome: PN.nomeQ(q), dentro, g, romano: dentro ? PN.ROMANI[g] : "", tipo: tr ? tr.tipo : null, funzione: dentro ? PN.FUNZIONI[g] : "",
          alterata: q >= DIESIS_DA ? "♯" : q <= BEMOLLE_DA ? "♭" : "", ordine: dentro ? arm.note.indexOf(q) + 1 : 0 };
      });
    },
    armatura: (t) => PN.armatura(t),
    // I due estremi della finestra (IV in basso, VII in alto): sei quinte di distanza, cioè 6·7 = 42 ≡ 6 semitoni.
    tritono(t) { const basso = t - 1, alto = t + 5; return { basso, alto, quinte: alto - basso, semitoni: PN.mod(PN.pcQ(alto) - PN.pcQ(basso), 12) }; },
    relativa: (t) => t + 3,                         // la tonica della relativa minore è il VI grado
    ultimaAlterazione(t) { const a = PN.armatura(t); return a.n ? a.note[a.n - 1] : null; },
    // Semitoni dall'ultimo diesis alla tonica (mod 12): la regola del §4.7 vuole 1.
    sopraUltimo: (t) => PN.mod(PN.pcQ(t) - PN.pcQ(calcola.ultimaAlterazione(t)), 12),
    penultimo(t) { const a = PN.armatura(t); return a.segno === "♭" && a.n >= 2 ? a.note[a.n - 2] : null; },
    // La finestra enarmonica: dodici quinte più in là, stessi tasti con nomi diversi (solo se entra nella retta mostrata).
    enarmonica(t) { const e = t > 0 ? t - 12 : t + 12; return e - 1 >= Q_MIN && e + 5 <= Q_MAX ? e : null; },
    stessiTasti: (a, b) => PN.finestraQ(a).map(PN.pcQ).sort((x, y) => x - y).join() === PN.finestraQ(b).map(PN.pcQ).sort((x, y) => x - y).join(),
    // La tastiera: le sette note dalla tonica in su, dal do4.
    tasti: (t) => PN.intervallo(0, 6).map((g) => ({ g, midi: PN.MIDI_DO4 + PN.pcQ(t) + PN.semitoniRetta(g, PN.C_MAGGIORE), nome: PN.nomeQ(PN.scalaQ(t)[g]) })),
    mostra(t) { const a = PN.armatura(t); return PN.nomeQ(t) + " maggiore · " + (a.n ? a.n + " " + a.segno : "nessuna alterazione"); },
    frase(t, rel) {
      const a = PN.armatura(t), nomi = a.note.map(PN.nomeQ), ton = PN.nomeQ(t);
      let f = `**${ton} maggiore**: `;
      if (a.n === 0) f += "nessuna alterazione, la finestra sta tutta tra le due linee.";
      else if (a.segno === "♯") {
        const u = nomi[a.n - 1], gu = PN.ROMANI[PN.gradoDiQ(t, a.note[a.n - 1])];
        f += (a.n === 1 ? `un diesis, il ${u}. È` : `${a.n} diesis (${nomi.join(", ")}). L'ultimo, ${u}, è`) + ` il ${gu} grado: la tonica sta ${calcola.sopraUltimo(t) === 1 ? "un semitono" : calcola.sopraUltimo(t) + " semitoni"} sopra.`;
      } else if (a.n === 1) f += `un bemolle, il ${nomi[0]} (è il ${PN.ROMANI[PN.gradoDiQ(t, a.note[0])]} grado).`;
      else f += `${a.n} bemolle (${nomi.join(", ")}). La tonica, ${ton}, è il penultimo bemolle.`;
      const e = calcola.enarmonica(t);
      if (e != null && calcola.stessiTasti(t, e)) f += ` La finestra grigia, dodici quinte più ${e < t ? "in basso" : "in alto"}, è **${PN.nomeQ(e)} maggiore**: stessi sette tasti, nomi diversi (enarmonia).`;
      if (rel) f += ` Relativa minore: **${PN.nomeQ(calcola.relativa(t))} minore**, stessa finestra, tonica sul VI grado.`;
      return f;
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    let t = Number.isInteger(param.t) && param.t >= T_MIN && param.t <= T_MAX ? param.t : 0, rel = !!param.relativa;
    const forma = (tipo) => (tipo === "magg" ? "cerchio" : tipo === "min" ? "quadro" : "rombo");
    const cur = PG.cursore({ etichetta: "Tonalità", min: T_MIN, max: T_MAX, passo: 1, valore: t, mostra: calcola.mostra, su: (v) => { t = v; ridisegna(); } });
    const tog = PG.interruttore({ etichetta: "Relativa minore", valore: rel, su: (v) => { rel = v; ridisegna(); } });
    ctx.comandi.replaceChildren(cur, PG.riga(tog));

    // Colonne, in unità del disegno (il piano va da x = 40 a x = 356, quindi sx(x) = x).
    const X = { tipo: 60, grado: 92, funz: 124, arm: 156, graffa: 178, nota: 188 }, RIGA = 18;
    function ridisegna() {
      const righe = calcola.righe(t), arm = calcola.armatura(t), tri = calcola.tritono(t), r6 = calcola.relativa(t), enar = calcola.enarmonica(t);
      const m = { l: 40, r: 4, t: 28, b: 8 }, H = Math.round((Q_MAX - Q_MIN + 1.2) * RIGA + m.t + m.b);
      const P = PG.piano({
        h: H, x: [m.l, 360 - m.r], y: [Q_MIN - 0.6, Q_MAX + 0.6], m, griglia: false,
        yt: righe.map((r) => ({ v: r.q, t: r.nome, cls: r.dentro ? "forte" : "" })),
        aria: `Retta delle quinte da ${PN.nomeQ(Q_MIN)} a ${PN.nomeQ(Q_MAX)}. ${calcola.mostra(t)}: finestra da ${PN.nomeQ(t - 1)} a ${PN.nomeQ(t + 5)}. ` +
          `Accordi: ${righe.filter((r) => r.dentro).map((r) => r.romano + " " + PN.TIPI[r.tipo].accordo).join(", ")}. Il IV e il VII grado, agli estremi, distano ${tri.semitoni} semitoni: un tritono.`,
      });
      const sy = P.sy;
      // Intestazioni delle colonne
      [["tipo", X.tipo], ["grado", X.grado], ["funz.", X.funz], ["♯ / ♭", X.arm]].forEach(([s, x]) => P.testo(x, m.t - 10, s, { px: true, cls: "m p" }));
      // La finestra enarmonica (tratteggiata) e la finestra della tonalità
      if (enar != null) P.fasciaY(enar - 1.5, enar + 5.5, "");
      P.fasciaY(t - 1.5, t + 5.5, "s-b");
      // Le due linee fisse
      // (la scritta sta sulla linea, a destra: tra due righe, quindi lontana dalle scritte delle righe)
      P.retta(m.l, 5.5, 300, 5.5, "s-m tratt"); P.retta(m.l, -1.5, 300, -1.5, "s-m tratt");
      P.testo(304, sy(5.5) + 3.5, "diesis ↑", { px: true, anc: "start", cls: "m p" });
      P.testo(304, sy(-1.5) + 3.5, "bemolle ↓", { px: true, anc: "start", cls: "m p" });
      if (enar != null) P.testo(346, sy(enar + 2) + 4, "stessi tasti:", { px: true, anc: "end", cls: "p" }), P.testo(346, sy(enar + 1) + 4, PN.nomeQ(enar) + " maggiore", { px: true, anc: "end", cls: "p" });
      // Le righe della finestra
      righe.filter((r) => r.dentro).forEach((r) => {
        if (rel && r.q === r6) P.punto(X.tipo, r.q, { r: 9.5, vuoto: true, cls: "s-a" });
        P.punto(X.tipo, r.q, { forma: forma(r.tipo), r: 5, tit: `${r.romano} grado, ${r.nome}: ${PN.TIPI[r.tipo].accordo}, funzione ${r.funzione}` });
        P.testo(X.grado, sy(r.q) + 4, r.romano, { px: true, cls: "g" });
        P.testo(X.funz, sy(r.q) + 4, r.funzione, { px: true });
        if (r.ordine) P.testo(X.arm, sy(r.q) + 4, r.ordine + "º " + r.alterata, { px: true, cls: "s-b" });
      });
      // Gli estremi: il tritono
      const ya = sy(tri.alto), yb = sy(tri.basso);
      P.sopra.append(P.s("path", { class: "g-linea s-a", d: `M${X.graffa - 5},${ya} H${X.graffa} V${yb} H${X.graffa - 5}` }));
      // Le scritte stanno al centro delle righe, così le linee tratteggiate (a metà tra due righe) non le attraversano.
      P.testo(X.nota, sy(t + 1) + 4, `tritono: ${tri.semitoni} semitoni`, { px: true, anc: "start", cls: "s-a" });
      if (rel) P.testo(X.nota, sy(r6) + 4, `← ${PN.nomeQ(r6)} minore`, { px: true, anc: "start" });

      const segna = {};
      calcola.tasti(t).forEach((k) => { segna[k.midi] = { cls: k.g === 0 ? "f-a" : rel && k.g === 5 ? "f-c" : "f-b", t: k.g === 0 ? "I" : rel && k.g === 5 ? "i" : PN.ROMANI[k.g] }; });
      const tast = PG.tastiera({ da: 60, a: 83, h: 70, segna, aria: `Scala di ${PN.nomeQ(t)} maggiore sulla tastiera: ${calcola.tasti(t).map((k) => k.nome).join(", ")}.` });
      ctx.graf.replaceChildren(P.svg,
        PG.legenda([{ cls: "", forma: "cerchio", t: "maggiore" }, { cls: "", forma: "quadro", t: "minore" }, { cls: "", forma: "rombo", t: "diminuito" }, { cls: "s-a", forma: "linea", t: "tritono IV–VII" }]),
        PG.h("h3", { text: rel ? "Sulla tastiera: I tonica, i relativa minore" : "Sulla tastiera: I è la tonica" }), tast);
      ctx.lettura(calcola.frase(t, rel));
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("finestra-quinte", def);
})(typeof self !== "undefined" ? self : this);
