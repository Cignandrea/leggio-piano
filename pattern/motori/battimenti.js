/* Motore «battimenti»: due armonici quasi uguali si sommano in un'onda che pulsa.
   sin a + sin b = 2·cos((a − b)/2)·sin((a + b)/2): la portante sta a metà tra le due frequenze, l'inviluppo pulsa Δf volte al secondo.
   Modello a due armonici esatti, sulle frequenze dell'equabile (la4 = 440 Hz).
   Parametri della tavola: { int: "quinta" | "quarta" | "terza" | "terzamin" (default quinta) } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  // Intervalli sopra do4 (MIDI 60): nota alta e rapporto puro a/b. Si confrontano l'armonico a della bassa e l'armonico b dell'alta.
  const INTERVALLI = [
    { id: "quinta", nome: "quinta", alta: 67, a: 3, b: 2 },
    { id: "quarta", nome: "quarta", alta: 65, a: 4, b: 3 },
    { id: "terza", nome: "terza maggiore", alta: 64, a: 5, b: 4 },
    { id: "terzamin", nome: "terza minore", alta: 63, a: 6, b: 5 },
  ];
  const calcola = {
    INTERVALLI, BASSA: PN.MIDI_DO4,
    intervallo: (id) => INTERVALLI.find((x) => x.id === id) || INTERVALLI[0],
    coppia(id) {
      const it = calcola.intervallo(id), fBassa = PN.freqMidi(calcola.BASSA), fAlta = PN.freqMidi(it.alta);
      const f1 = it.a * fBassa, f2 = it.b * fAlta;
      return { id: it.id, nome: it.nome, nomeBassa: PN.nomeMidi(calcola.BASSA), nomeAlta: PN.nomeMidi(it.alta), fBassa, fAlta, armBasso: it.a, armAlto: it.b,
        f1, f2, battimenti: Math.abs(f1 - f2), periodo: 1 / Math.abs(f1 - f2), scartoCents: PN.cents(fAlta / fBassa) - PN.cents(it.a / it.b), portante: (f1 + f2) / 2 };
    },
    somma: (f1, f2, t) => Math.sin(2 * Math.PI * f1 * t) + Math.sin(2 * Math.PI * f2 * t),
    inviluppo: (df, t) => 2 * Math.abs(Math.cos(Math.PI * df * t)),
    // I massimi dell'inviluppo tra 0 e T secondi: t = k / Δf.
    massimi: (df, T) => { const v = []; for (let k = 0; k / df <= T + 1e-12; k++) v.push(k / df); return v; },
  };

  function disegna(ctx, param) {
    const PG = root.PG, C = calcola;
    let id = C.intervallo(param.int).id, fase = true;
    ctx.comandi.replaceChildren(
      PG.seg({ etichetta: "Intervallo", opzioni: INTERVALLI.map((x) => ({ v: x.id, t: x.nome.replace("terza maggiore", "3ª magg.").replace("terza minore", "3ª min.") })), valore: id, su: (v) => { id = v; ridisegna(); } }),
      PG.seg({ etichetta: "Zoom", opzioni: [{ v: true, t: "in fase" }, { v: false, t: "in opposizione" }], valore: fase, su: (v) => { fase = v; ridisegna(); } }),
      PG.riga(
        PG.pulsante({ t: "▶ Ascolta il pianoforte", su: () => { const c = C.coppia(id); PG.suona([{ f: c.f1, g: 0.12 }, { f: c.f2, g: 0.12 }], 3); } }),
        PG.pulsante({ t: "▶ Ascolta l'intervallo puro", su: () => { const c = C.coppia(id); PG.suona([{ f: c.f1, g: 0.12 }, { f: c.f1, g: 0.12 }], 3); } })));

    const n = PN.num;
    function ridisegna() {
      const c = C.coppia(id), df = c.battimenti, T = 2, mx = C.massimi(df, T);
      /* 1. L'inviluppo su due secondi */
      const P = PG.piano({
        h: 200, x: [0, T], y: [-2.45, 2.45], m: { l: 30, r: 12, t: 14, b: 34 },
        xt: [0, 0.5, 1, 1.5, 2].map((v) => ({ v, t: n(v, v % 1 ? 1 : 0) })), yt: [-2, -1, 0, 1, 2].map((v) => ({ v, t: v > 0 ? "+" + v : n(v) })),
        xlab: "tempo, secondi", ylab: "ampiezza della somma",
        aria: `Inviluppo della somma di due sinusoidi a ${n(c.f1, 2)} e ${n(c.f2, 2)} hertz: ${n(df, 2)} battiti al secondo, un massimo ogni ${n(c.periodo, 3)} secondi.`,
      });
      const N = 1600, su = [], giu = [];
      for (let i = 0; i <= N; i++) { const t = T * i / N, e = C.inviluppo(df, t); su.push([t, e]); giu.push([t, -e]); }
      P.area(su.concat(giu.slice().reverse()), "s-d");
      P.spezzata(su, "s-d"); P.spezzata(giu, "s-d");
      P.retta(0, 0, T, 0, "s-m");
      const tz = fase ? (mx[1] !== undefined ? mx[1] : 0) : 0.5 / df;
      P.retta(tz, -2.45, tz, 2.45, "tratt fine");
      mx.forEach((t) => P.punto(t, 2, { cls: "s-d", forma: "tri", r: mx.length > 6 ? 2.6 : 4, tit: `massimo a ${n(t, 3)} s` }));
      if (mx.length > 1 && mx.length <= 6) {   // un periodo dei battimenti, tra i primi due massimi
        P.retta(mx[0], 2.25, mx[1], 2.25, "fine");
        P.testo((mx[0] + mx[1]) / 2, 2.25, `1/Δf = ${n(c.periodo, 2)} s`, { dy: 14, cls: "p" });
      }
      /* 2. Lo zoom: pochi millisecondi attorno a tz */
      const w = 2 / c.f1, ms = 1000;
      const Z = PG.piano({
        h: 190, x: [-w * ms, w * ms], y: [-2.3, 2.3], m: { l: 30, r: 12, t: 14, b: 34 },
        xt: (() => { const st = w * ms > 2 ? 1 : 0.5, v = []; for (let x = -Math.floor(w * ms / st) * st; x <= w * ms + 1e-9; x += st) v.push({ v: x, t: (x > 1e-9 ? "+" : "") + n(x, st < 1 ? 1 : 0) }); return v; })(), yt: [-2, -1, 0, 1, 2].map((v) => ({ v, t: v > 0 ? "+" + v : n(v) })),
        xlab: `millisecondi attorno a ${n(tz, 3)} s`, ylab: fase ? "in fase: le due onde si sommano" : "in opposizione: le due onde si annullano",
        aria: `Zoom di ${n(2 * w * ms, 1)} millisecondi attorno a ${n(tz, 3)} secondi: le due sinusoidi sono ${fase ? "in fase e la somma arriva quasi a 2" : "in opposizione e la somma resta vicina a zero"}.`,
      });
      const pts = (fn) => { const v = []; for (let i = 0; i <= 400; i++) { const x = -w + 2 * w * i / 400; v.push([x * ms, fn(tz + x)]); } return v; };
      Z.retta(-w * ms, 0, w * ms, 0, "s-m");
      Z.spezzata(pts((t) => Math.sin(2 * Math.PI * c.f1 * t)), "s-a fine");
      Z.spezzata(pts((t) => Math.sin(2 * Math.PI * c.f2 * t)), "s-b tratt");
      Z.spezzata(pts((t) => C.somma(c.f1, c.f2, t)), "grossa");
      ctx.graf.replaceChildren(
        PG.h("h3", { text: `${c.nomeBassa} + ${c.nomeAlta}: l'inviluppo della somma, due secondi` }), P.svg,
        PG.legenda([{ cls: "s-d", forma: "linea", t: "inviluppo ±2·|cos(π·Δf·t)|" }, { cls: "s-d", forma: "tri", t: "massimi: ogni 1/Δf" }]),
        PG.h("h3", { text: "Zoom: le due onde e la loro somma" }), Z.svg,
        PG.legenda([{ cls: "s-a fine", forma: "linea", t: `${c.armBasso}º armonico di ${c.nomeBassa}` }, { cls: "s-b tratt", forma: "linea", t: `${c.armAlto}º armonico di ${c.nomeAlta}` }, { cls: "grossa", forma: "linea", t: "somma" }]));
      const verso = c.scartoCents > 0 ? "larga" : "stretta";
      ctx.lettura(`${c.armBasso}º armonico di ${c.nomeBassa}: ${n(c.f1, 2)} Hz · ${c.armAlto}º armonico di ${c.nomeAlta}: ${n(c.f2, 2)} Hz · differenza: **${n(df, 2)} battiti al secondo**, uno ogni ${n(c.periodo, 3)} s. La ${c.nome} del pianoforte è ${verso} di ${n(Math.abs(c.scartoCents), 2)} centesimi.`);
    }
    ridisegna();
    return { smonta() { PG.zitto(); } };
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("battimenti", def);
})(typeof self !== "undefined" ? self : this);
