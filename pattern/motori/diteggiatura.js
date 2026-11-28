/* Motore «diteggiatura»: le dita delle due mani nella scala, nota per nota, come due funzioni periodiche di periodo 7.
   Vale per le scale di do, sol, re, la e mi maggiore, che hanno la stessa diteggiatura (quaderno §1.2).
   Parametri della tavola: { t: tonalità iniziale (posto q: 0 do … 4 mi), ottave: 1 | 2, moto: "parallelo" | "contrario", nota: nota iniziale (da 1) } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const TONALITA = [0, 1, 2, 3, 4];                       // do, sol, re, la, mi
  const NOME_DITO = ["", "pollice", "indice", "medio", "anulare", "mignolo"];
  const ART_DITO = ["", "il pollice", "l'indice", "il medio", "l'anulare", "il mignolo"];
  const NERI = [1, 3, 6, 8, 10];                          // classi di altezza dei tasti neri
  // Il motivo di sette dita che si ripete, salendo, per il grado k mod 7; agli estremi entra il mignolo.
  const MOTIVO = { d: [1, 2, 3, 1, 2, 3, 4], s: [1, 4, 3, 2, 1, 3, 2] };

  const calcola = {
    TONALITA, NOME_DITO,
    n: (ottave) => 7 * ottave + 1,
    // Dita della mano («d» destra, «s» sinistra), una per nota, salendo; con verso «giu» la stessa scala letta scendendo.
    dita(mano, ottave, verso) {
      const n = calcola.n(ottave);
      const su = PN.intervallo(0, n - 1).map((k) => (mano === "d" && k === n - 1) || (mano === "s" && k === 0) ? 5 : MOTIVO[mano][k % 7]);
      return verso === "giu" ? su.reverse() : su;
    },
    // Passaggi: dove la mano esce dalla sua posizione. La successione naturale delle dita è crescente per la destra che sale
    // e per la sinistra che scende (pollice verso mignolo), decrescente negli altri casi; il passaggio è un salto contro quel verso.
    // Torna le note (da 1) con il dito che arriva e quello di prima: [{ nota, dito, prima, tipo: "sotto" | "sopra" }]
    passaggi(mano, ottave, verso) {
      const f = calcola.dita(mano, ottave, verso), cresce = (mano === "d") === (verso !== "giu"), out = [];
      for (let k = 1; k < f.length; k++) {
        const d = f[k] - f[k - 1];
        if (cresce ? d < 0 : d > 0) out.push({ nota: k + 1, dito: f[k], prima: f[k - 1], tipo: f[k] === 1 ? "sotto" : "sopra" });
      }
      return out;
    },
    // Le dita delle due mani nello stesso istante: in parallelo salgono tutte e due, in contrario la sinistra scende.
    coppie(ottave, moto) {
      const d = calcola.dita("d", ottave), s = calcola.dita("s", ottave, moto === "contrario" ? "giu" : "su");
      return d.map((x, i) => ({ nota: i + 1, d: x, s: s[i] }));
    },
    coincidenze: (ottave, moto) => calcola.coppie(ottave, moto).filter((c) => c.d === c.s).map((c) => ({ nota: c.nota, dito: c.d })),
    // Note dove le due mani passano nello stesso istante.
    passaggiInsieme(ottave, moto) {
      const sd = calcola.passaggi("d", ottave).map((p) => p.nota), ss = calcola.passaggi("s", ottave, moto === "contrario" ? "giu" : "su").map((p) => p.nota);
      return sd.filter((x) => ss.includes(x));
    },
    // Le note della scala di t: k-esima nota salendo dalla tonica (k da 0), con nome e numero MIDI a partire da «base».
    nota(t, k, base) {
      const g = PN.mod(k, 7), ott = Math.floor(k / 7), q = PN.scalaQ(t)[g];
      return { g, q, nome: PN.nomeQ(q), midi: base + 12 * ott + PN.semitoniRetta(g, PN.C_MAGGIORE), nero: NERI.includes(PN.pcQ(q)) };
    },
    tonicaMidi: (t) => 60 + PN.pcQ(t),                   // la tonica sopra il do centrale (do4 … si4)
    // Le note di una mano: destra dalla tonica in su; sinistra un'ottava sotto, in su (parallelo) o in giù (contrario).
    note(t, ottave, mano, moto) {
      const n = calcola.n(ottave), b = calcola.tonicaMidi(t);
      if (mano === "d") return PN.intervallo(0, n - 1).map((k) => calcola.nota(t, k, b));
      if (moto === "contrario") return PN.intervallo(0, n - 1).map((k) => calcola.nota(t, -k, b - 12));
      return PN.intervallo(0, n - 1).map((k) => calcola.nota(t, k, b - 12));
    },
    // La tabella del §1.2: dove riparte il pollice della destra (IV grado), dove scavalca il medio della sinistra (VI grado), i tasti neri in ordine di scala.
    tabella(t) {
      const s = PN.scalaQ(t);
      return { scala: PN.nomeQ(t), pollice: PN.nomeQ(s[3]), medio: PN.nomeQ(s[5]), neri: s.filter((q) => NERI.includes(PN.pcQ(q))).map(PN.nomeQ) };
    },
    suTastoNero: (t, grado) => NERI.includes(PN.pcQ(PN.scalaQ(t)[PN.mod(grado, 7)])),
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    let t = TONALITA.includes(param.t) ? param.t : 0, ottave = param.ottave === 2 ? 2 : 1, moto = param.moto === "contrario" ? "contrario" : "parallelo";
    let nota = Number.isInteger(param.nota) ? param.nota : 4;

    function comandi() {
      const n = calcola.n(ottave); nota = Math.min(Math.max(1, nota), n);
      ctx.comandi.replaceChildren(
        PG.cursore({ etichetta: "Nota", min: 1, max: n, passo: 1, valore: nota, mostra: (v) => v + " di " + n, su: (v) => { nota = v; ridisegna(); } }),
        PG.seg({ etichetta: "Tonalità", opzioni: TONALITA.map((q) => ({ v: q, t: PN.nomeQ(q) })), valore: t, su: (v) => { t = v; ridisegna(); } }),
        PG.seg({ etichetta: "Estensione", opzioni: [{ v: 1, t: "1 ottava" }, { v: 2, t: "2 ottave" }], valore: ottave, su: (v) => { ottave = v; comandi(); ridisegna(); } }),
        PG.seg({ etichetta: "Moto", opzioni: [{ v: "parallelo", t: "parallelo" }, { v: "contrario", t: "contrario" }], valore: moto, su: (v) => { moto = v; ridisegna(); } }));
    }

    function ridisegna() {
      const n = calcola.n(ottave), verso = moto === "contrario" ? "giu" : "su";
      const cp = calcola.coppie(ottave, moto), co = calcola.coincidenze(ottave, moto);
      const pd = calcola.passaggi("d", ottave), ps = calcola.passaggi("s", ottave, verso), insieme = calcola.passaggiInsieme(ottave, moto);
      const nd = calcola.note(t, ottave, "d", moto), ns = calcola.note(t, ottave, "s", moto);
      const ugualeA = (i) => co.some((c) => c.nota === i);

      /* 1. Il grafico: nota × dito */
      const P = PG.piano({
        h: 270, x: [0.4, n + 0.6], y: [0.15, 6.2], m: { l: 26, r: 8, t: 22, b: 34 },
        // su un'ottava le tacche dicono il nome della nota; su due, dove i nomi non ci stanno, il numero (la tonica in nero)
        xt: nd.map((x, i) => ({ v: i + 1, t: ottave === 1 ? x.nome : String(i + 1), cls: x.g === 0 ? "forte" : "" })), yt: [1, 2, 3, 4, 5],
        xlab: (ottave === 1 ? (moto === "contrario" ? "nota della destra" : "nota della scala, salendo") : "nota (1, 8, 15: la tonica)") + (moto === "contrario" ? "; la sinistra scende" : ""),
        ylab: "dito: 1 pollice … 5 mignolo",
        aria: `Scala di ${PN.nomeQ(t)} maggiore, ${ottave === 1 ? "un'ottava" : "due ottave"}, moto ${moto}. Destra: ${cp.map((c) => c.d).join(" ")}. Sinistra: ${cp.map((c) => c.s).join(" ")}. `
          + `Stesso dito alle note ${co.map((c) => c.nota).join(", ") || "nessuna"}. Passaggi della destra alle note ${pd.map((p) => p.nota).join(", ")}; della sinistra alle note ${ps.map((p) => p.nota).join(", ")}.`,
      });
      P.fasciaX(nota - 0.42, nota + 0.42, "");
      pd.forEach((p) => { P.fasciaX(p.nota - 0.62, p.nota - 0.38, "s-a"); P.testo(p.nota - 0.5, 5.78, "↓" + p.dito, { cls: "s-a p", dy: 4 }); });
      ps.forEach((p) => { P.fasciaX(p.nota - 0.62, p.nota - 0.38, "s-b"); P.testo(p.nota - 0.5, 0.5, (p.tipo === "sotto" ? "↓" : "↑") + p.dito, { cls: "s-b p", dy: 4 }); });
      P.spezzata(cp.map((c) => [c.nota, c.d]), "s-a");
      P.spezzata(cp.map((c) => [c.nota, c.s]), "s-b tratt");
      const grande = (i) => (i === nota ? 6.5 : 4.8);
      cp.forEach((c) => {
        if (c.d === c.s) { P.punto(c.nota, c.d, { forma: "rombo", r: grande(c.nota), tit: `nota ${c.nota}: stesso dito, ${NOME_DITO[c.d]}` }); return; }
        P.punto(c.nota, c.d, { cls: "s-a", r: grande(c.nota), tit: `nota ${c.nota}, destra: ${NOME_DITO[c.d]}` });
        P.punto(c.nota, c.s, { cls: "s-b", forma: "quadro", r: grande(c.nota) - 0.6, tit: `nota ${c.nota}, sinistra: ${NOME_DITO[c.s]}` });
      });

      /* 2. Le due tastiere, con i numeri delle dita */
      const tast = (note, dita, cls, titolo) => {
        const mid = note.map((x) => x.midi), da = Math.min(...mid), a = Math.max(...mid), segna = {};
        note.forEach((x, i) => { segna[x.midi] = { cls: i + 1 === nota ? "f-i" : cls, t: String(dita[i]) }; });
        return PG.tastiera({ da, a, h: ottave === 1 ? 70 : 62, segna, aria: `${titolo}: ${note.map((x, i) => x.nome + " " + dita[i]).join(", ")}. Nota scelta: ${note[nota - 1].nome}.` });
      };
      const dd = cp.map((c) => c.d), ds = cp.map((c) => c.s);
      ctx.graf.replaceChildren(
        PG.h("h3", { text: "Le dita, nota per nota" }), P.svg,
        PG.legenda([
          { cls: "s-a", forma: "cerchio", t: "destra" }, { cls: "s-b", forma: "quadro", t: "sinistra" }, { cls: "", forma: "rombo", t: "stesso dito" },
          { cls: "s-a", forma: "linea", t: "↓1 il pollice passa sotto" }, { cls: "s-b tratt", forma: "linea", t: moto === "contrario" ? "↓1 il pollice passa sotto" : "↑3 ↑4 il dito scavalca" },
        ]),
        PG.h("h3", { text: "Mano destra" + (moto === "contrario" ? ", sale" : "") }), tast(nd, dd, "f-a", "Mano destra"),
        PG.h("h3", { text: "Mano sinistra, un'ottava sotto" + (moto === "contrario" ? ", scende" : "") }), tast(ns, ds, "f-b", "Mano sinistra"));

      /* 3. La riga di lettura */
      const c = cp[nota - 1], a = nd[nota - 1], b = ns[nota - 1];
      const pD = pd.find((p) => p.nota === nota), pS = ps.find((p) => p.nota === nota);
      const descr = (dito, p) => {
        if (!p) return NOME_DITO[dito];
        if (p.tipo === "sotto") return `${NOME_DITO[dito]}, appena passato sotto ${ART_DITO[p.prima]}`;
        return `${NOME_DITO[dito]}, che scavalca il pollice`;
      };
      const nero = (x) => `${x.nome}, un tasto nero`;
      let r;
      if (moto === "contrario") {
        // le dita coincidono a ogni nota (verificato dal collaudo): si dicono una volta sola
        r = `Nota ${nota}: destra **${a.nome}**, sinistra **${b.nome}**, tutte e due con ${ART_DITO[c.d]}` + (c.d === c.s ? "" : ` (sinistra: ${NOME_DITO[c.s]})`);
        if (pD && pS) r += `, appena passato sotto ${ART_DITO[pD.prima]}: le mani passano insieme.`;
        else r += ". Nel moto contrario le due mani usano le stesse dita a ogni nota.";
        const neri = [];
        if (pD && nd[nota - 2].nero) neri.push("a destra su " + nd[nota - 2].nome);
        if (pS && ns[nota - 2].nero) neri.push("a sinistra su " + ns[nota - 2].nome);
        if (neri.length) r += ` ${ART_DITO[pD ? pD.prima : pS.prima].replace(/^./, (x) => x.toUpperCase())} che precede il passaggio è ${neri.join(" e ")}: ${neri.length > 1 ? "due tasti neri" : "un tasto nero"}.`;
      } else {
        r = `Nota ${nota} (**${a.nome}**): destra ${descr(c.d, pD)}; sinistra ${descr(c.s, pS)}.`;
        if (ugualeA(nota)) r += ` Stesso dito nelle due mani: ${ART_DITO[c.d]}.`;
        if (pD && pS) r += " Qui le due mani passano insieme.";
        else if (pD || pS) r += " L'altra mano non passa: cammina.";
        if (pD && nd[nota - 2].nero) r += ` In ${PN.nomeQ(t)} il pollice passa sotto ${ART_DITO[pD.prima]}, che è su ${nero(nd[nota - 2])}.`;
        if (pS && b.nero) r += ` La sinistra scavalca su ${nero(b)}.`;
      }
      ctx.lettura(r);
    }
    comandi(); ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("diteggiatura", def);
})(typeof self !== "undefined" ? self : this);
