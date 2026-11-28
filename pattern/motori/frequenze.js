/* Motore «frequenze»: le frequenze degli 88 tasti come funzione esponenziale del numero del tasto.
   In scala lineare la curva sale sempre più ripida; in scala logaritmica è una retta: ogni semitono moltiplica per 2^(1/12).
   Parametri della tavola: { tasto: tasto iniziale (1…88, default 40 = do4), log: true per partire in scala logaritmica } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const NERI = { 1: "do♯/re♭", 3: "re♯/mi♭", 6: "fa♯/sol♭", 8: "sol♯/la♭", 10: "la♯/si♭" };
  const calcola = {
    PRIMO: 1, ULTIMO: 88, LA4: 49, DO4: 40,
    frequenza: (n) => PN.freqTasto(n),
    fattoreSemitono: () => Math.pow(2, 1 / 12),
    tassoPercento: () => (Math.pow(2, 1 / 12) - 1) * 100,
    ottave: (f1, f2) => Math.log2(f2 / f1),
    decadi: (f1, f2) => Math.log10(f2 / f1),
    // Nome del tasto n: i tasti neri con i due nomi enarmonici (§4.8).
    nome(n) {
      const m = n + 20, pc = PN.mod(m, 12), ott = Math.floor(m / 12) - 1;
      return NERI[pc] ? NERI[pc].split("/").map((x) => x + ott).join("/") : PN.nomeMidi(m);
    },
    // I la del pianoforte: tasti 1, 13 … 85 (la0 … la7).
    la: () => PN.intervallo(0, 7).map((k) => ({ k, tasto: 1 + 12 * k, nome: "la" + k, f: PN.freqTasto(1 + 12 * k) })),
    estensione() {
      const a = PN.freqTasto(1), b = PN.freqTasto(88);
      return { fMin: a, fMax: b, ottave: calcola.ottave(a, b), decadi: calcola.decadi(a, b), semitoni: 87 };
    },
    // L'ottava tra il la k e il la k+1 (k = 0…6), confrontata con la crescita lineare (la corda tra i due la).
    ottavaDi: (n) => Math.min(6, Math.floor((n - 1) / 12)),
    corda(k, x) {   // retta che unisce i due la: crescita lineare a pari estremi
      const a = 1 + 12 * k, fa = PN.freqTasto(a), fb = PN.freqTasto(a + 12);
      return fa + (fb - fa) * (x - a) / 12;
    },
    meta(k) {
      const a = 1 + 12 * k, fa = PN.freqTasto(a), fm = PN.freqTasto(a + 6), fl = calcola.corda(k, a + 6);
      return { tasto: a + 6, nome: calcola.nome(a + 6), la: "la" + k, laSu: "la" + (k + 1), fLa: fa, fLaSu: PN.freqTasto(a + 12), f: fm, fLineare: fl, rapporto: fm / fa, rapportoLineare: fl / fa };
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG, C = calcola;
    let n = Number.isInteger(param.tasto) && param.tasto >= 1 && param.tasto <= 88 ? param.tasto : C.DO4, log = !!param.log, lin = false;
    const cur = PG.cursore({ etichetta: "Tasto", min: 1, max: 88, passo: 1, valore: n, mostra: (v) => v + " · " + C.nome(v), su: (v) => { n = v; ridisegna(); } });
    ctx.comandi.replaceChildren(
      PG.seg({ etichetta: "Asse delle frequenze", opzioni: [{ v: false, t: "lineare" }, { v: true, t: "logaritmico" }], valore: log, su: (v) => { log = v; ridisegna(); } }),
      cur,
      PG.riga(PG.interruttore({ etichetta: "Confronta con la crescita lineare", valore: lin, su: (v) => { lin = v; ridisegna(); } })));

    // Un'ottava ingrandita: x = semitoni sopra il la, y = multiplo della frequenza del la (da × 1 a × 2).
    function zoom(k, me) {
      const a = 1 + 12 * k, fa = C.frequenza(a), mult = [1, 1.25, 1.5, 1.75, 2];
      const Z = PG.piano({
        h: 210, x: [-0.6, 12.6], y: [0.94, 2.06], m: { l: 46, r: 12, t: 12, b: 34 },
        xt: [0, 3, 6, 9, 12].map((v) => ({ v, t: v === 0 ? me.la : v === 12 ? me.laSu : "+" + v })), yt: mult.map((v) => ({ v, t: "× " + PN.num(v, v === 1 || v === 2 || v === 1.5 ? (v === 1.5 ? 1 : 0) : 2) })),
        xlab: "semitoni sopra il la", ylab: "frequenza ÷ frequenza del la",
        aria: `Da ${me.la} a ${me.laSu}: a metà ottava l'esponenziale vale ${PN.num(me.rapporto, 3)} volte la frequenza del la, la crescita lineare ${PN.num(me.rapportoLineare, 1)}.`,
      });
      Z.retta(0, 1, 12, 2, "s-m tratt");
      const pts = []; for (let i = 0; i <= 120; i++) pts.push([i / 10, C.frequenza(a + i / 10) / fa]);
      Z.spezzata(pts, "grossa");
      for (let j = 0; j <= 12; j++) if (j !== 6) Z.punto(j, C.frequenza(a + j) / fa, { cls: j === 0 || j === 12 ? "s-b" : "", forma: j === 0 || j === 12 ? "quadro" : "cerchio", r: j === 0 || j === 12 ? 4 : 2.6 });
      Z.retta(6, me.rapporto, 6, me.rapportoLineare, "s-d fine");
      Z.punto(6, me.rapportoLineare, { cls: "s-m", r: 4.5, t: "× " + PN.num(me.rapportoLineare, 1), pos: "no", tcls: "m" });
      Z.punto(6, me.rapporto, { cls: "s-d", forma: "rombo", r: 5, t: "× " + PN.num(me.rapporto, 3), pos: "se", tcls: "s-d", tit: `${me.nome}: ${PN.num(me.f, 2)} Hz` });
      if (n > a && n < a + 12 && n !== a + 6) Z.punto(n - a, C.frequenza(n) / fa, { cls: "s-a", r: 4.5 });
      return Z.svg;
    }

    function ridisegna() {
      const est = C.estensione(), las = C.la(), f = C.frequenza(n), k = C.ottavaDi(n), me = C.meta(k);
      const yt = log ? las.slice(0, 8).map((l) => ({ v: l.f, t: PN.num(l.f, l.f < 50 ? 1 : 0) }))
        : [0, 1000, 2000, 3000, 4000].map((v) => ({ v, t: String(v) }));
      const P = PG.piano({
        h: 280, x: [-1, 90], y: log ? [20, 6000] : [0, 4400], ylog: log, m: { l: 40, r: 12, t: 14, b: 34 },
        xt: las.map((l) => ({ v: l.tasto, t: l.nome })), yt,
        xlab: "tasto (1 … 88)", ylab: log ? "frequenza, Hz (scala logaritmica)" : "frequenza, Hz",
        aria: `Frequenze degli 88 tasti, da ${PN.num(est.fMin, 1)} a ${PN.num(est.fMax, 2)} hertz, in scala ${log ? "logaritmica: una retta" : "lineare: una curva esponenziale"}. Tasto ${n}, ${C.nome(n)}: ${PN.num(f, 2)} hertz.`,
      });
      if (lin) P.fasciaX(1 + 12 * k, 13 + 12 * k, "");
      const curva = []; for (let i = 0; i <= 87 * 4; i++) { const x = 1 + i / 4; curva.push([x, C.frequenza(x)]); }
      P.spezzata(curva, "grossa");
      las.forEach((l) => P.punto(l.tasto, l.f, { cls: "s-b", forma: "quadro", r: 3.6, tit: `${l.nome}: ${PN.num(l.f, 1)} Hz` }));
      const y0 = log ? 20 : 0;
      P.retta(n, y0, n, f, "s-a tratt fine"); P.retta(-1, f, n, f, "s-a tratt fine");
      // etichetta del punto: sopra a sinistra, oppure a destra se il punto è vicino al bordo sinistro
      P.punto(n, f, { cls: "s-a", r: 5.5, t: PN.num(f, 2) + " Hz", pos: n < 18 ? "ne" : "no", tcls: "s-a", tit: `${C.nome(n)}: ${PN.num(f, 2)} Hz` });

      const leg = [{ cls: "", forma: "linea", t: "88 tasti (equabile)" }, { cls: "s-b", forma: "quadro", t: "i la: ogni ottava × 2" }, { cls: "s-a", forma: "cerchio", t: "tasto scelto" }];
      const pezzi = [PG.h("h3", {}, `88 tasti, da ${PN.num(est.fMin, 1)} a ${PN.num(est.fMax, 2)} Hz:`, PG.h("br"), `${PN.num(est.ottave, 2)} ottave, ${PN.num(est.decadi, 2)} decadi`), P.svg, PG.legenda(leg)];
      if (lin) pezzi.push(PG.h("h3", { text: `Dentro l'ottava in grigio, da ${me.la} a ${me.laSu}: esponenziale contro crescita lineare` }), zoom(k, me), PG.legenda([
        { cls: "", forma: "linea", t: "esponenziale (i tasti)" }, { cls: "s-m tratt", forma: "linea", t: "crescita lineare" },
        { cls: "s-d", forma: "rombo", t: "metà ottava: × √2" }, { cls: "s-m", forma: "cerchio", t: "lineare: × 1,5" }]));
      ctx.graf.replaceChildren(...pezzi);

      const r = C.fattoreSemitono(), f1 = C.frequenza(n + 1), f12 = C.frequenza(n + 12);
      const extra = n === C.DO4 ? " (do centrale)" : n === C.LA4 ? " (la del diapason)" : "";
      let t = `Tasto ${n}, **${C.nome(n)}**${extra}: ${PN.num(f, 2)} Hz. Un semitono sopra: × ${PN.num(r, 4)} → ${PN.num(f1, 2)} Hz${n === 88 ? " (oltre l'ultimo tasto)" : ""}. Un'ottava sopra: × 2 → ${PN.num(f12, 2)} Hz${n + 12 > 88 ? " (oltre l'ultimo tasto)" : ""}.`;
      if (lin) t += ` Tra ${me.la} (${PN.num(me.fLa, 2)} Hz) e ${me.laSu} (${PN.num(me.fLaSu, 2)} Hz), il tasto a metà, **${me.nome}**, sta a × ${PN.num(me.rapporto, 3)} (√2): ${PN.num(me.f, 2)} Hz, non a × ${PN.num(me.rapportoLineare, 1)} (${PN.num(me.fLineare, 2)} Hz) come vorrebbe la crescita lineare.`;
      ctx.lettura(t);
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("frequenze", def);
})(typeof self !== "undefined" ? self : this);
