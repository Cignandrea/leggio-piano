/* Motore «comma»: dodici quinte non fanno sette ottave. Tre accordature a confronto (pitagorica, mesotonica, equabile):
   dove finisce la catena delle quinte rispetto ai tasti, e come ciascuna distribuisce il comma sulle dodici quinte del cerchio.
   Parametri della tavola: { acc: "pitagorica" | "mesotonica" | "equabile" (default pitagorica) } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  // Il cerchio sulla tastiera: do sol re la mi si fa♯ do♯ sol♯, poi mi♭ si♭ fa e di nuovo do. Il lupo sta tra sol♯ e mi♭.
  const CERCHIO_Q = [0, 1, 2, 3, 4, 5, 6, 7, 8, -3, -2, -1, 0];
  const LUPO = 8;
  const NOMI = { pitagorica: "quinte pure", mesotonica: "mesotonica", equabile: "equabile" };
  const calcola = {
    ACCORDATURE: ["pitagorica", "mesotonica", "equabile"], LUPO, CERCHIO_Q,
    quintaPura: () => PN.cents(3 / 2),
    commaPitagorico: () => PN.cents(Math.pow(3, 12) / Math.pow(2, 19)),
    commaSintonico: () => PN.cents(81 / 80),
    terzaPura: () => PN.cents(5 / 4),
    // La quinta «regolare» di ogni accordatura (quella delle undici quinte uguali).
    quinta(nome) {
      if (nome === "pitagorica") return calcola.quintaPura();
      if (nome === "mesotonica") return calcola.quintaPura() - calcola.commaSintonico() / 4;
      return 700;
    },
    // Le dodici quinte del cerchio, in centesimi: undici uguali e l'ultima (sol♯–mi♭) che chiude le sette ottave.
    accordatura(nome) {
      const q = calcola.quinta(nome), v = [];
      for (let k = 0; k < 12; k++) v.push(k === LUPO ? 8400 - 11 * q : q);
      return v;
    },
    scarto: (nome, k) => calcola.accordatura(nome)[k] - calcola.quintaPura(),
    somma: (nome) => calcola.accordatura(nome).reduce((s, x) => s + x - calcola.quintaPura(), 0),
    totale: (nome) => calcola.accordatura(nome).reduce((s, x) => s + x, 0),
    // Terza maggiore: quattro quinte regolari meno due ottave.
    terzaMaggiore: (nome) => 4 * calcola.quinta(nome) - 2400,
    // Le dodici terze maggiori del cerchio (quattro quinte consecutive a partire da k), comprese quelle che contengono il lupo.
    terze: (nome) => { const a = calcola.accordatura(nome); return PN.intervallo(0, 11).map((k) => [0, 1, 2, 3].reduce((s, j) => s + a[(k + j) % 12], 0) - 2400); },
    // La catena delle quinte regolari: la nota a k quinte dal do (k < 0: in giù), in centesimi rispetto al suo tasto equabile.
    deriva: (nome, k) => k * (calcola.quinta(nome) - 700),
    // Mi♯ (undici quinte su) meno fa (una quinta giù): con le quinte pure è il comma pitagorico.
    miDiesisFa: (nome) => calcola.deriva(nome, 11) - calcola.deriva(nome, -1),
    nomeQuinta: (k) => PN.nomeQ(CERCHIO_Q[k]) + "–" + PN.nomeQ(CERCHIO_Q[k + 1]),
  };

  function disegna(ctx, param) {
    const PG = root.PG, C = calcola;
    let acc = C.ACCORDATURE.includes(param.acc) ? param.acc : "pitagorica";
    ctx.comandi.replaceChildren(PG.seg({ etichetta: "Accordatura", opzioni: C.ACCORDATURE.map((v) => ({ v, t: NOMI[v] })), valore: acc, su: (v) => { acc = v; ridisegna(); } }));
    const SER = { pitagorica: "s-a", mesotonica: "s-b", equabile: "s-c" }, FORMA = { pitagorica: "cerchio", mesotonica: "quadro", equabile: "rombo" };
    const n = (x, d) => PN.num(x, d === undefined ? 2 : d), seg = (x, d) => (x > 5e-13 ? "+" : "") + n(x, d);

    function catena() {
      const cls = SER[acc], forma = FORMA[acc], dev = (k) => C.deriva(acc, k), qu = C.quinta(acc);
      const P = PG.piano({
        h: 270, x: [-1.6, 12.6], y: [-56, 32], m: { l: 36, r: 10, t: 14, b: 44 },
        xt: PN.intervallo(-1, 12).map((k) => ({ v: k, t: "" })), yt: [-50, -40, -30, -20, -10, 0, 10, 20, 30].map((v) => ({ v, t: v > 0 ? "+" + v : PN.num(v) })),
        ylab: "centesimi sopra (+) o sotto (−) il tasto",
        aria: `Catena delle quinte, ${NOMI[acc]}: ogni quinta sposta la nota di ${seg(qu - 700)} centesimi rispetto al tasto. Dopo dodici quinte: ${seg(dev(12))}. Mi diesis ${seg(dev(11))}, fa ${seg(dev(-1))}.`,
      });
      // nomi delle note sotto l'asse, su due righe alterne perché non si tocchino
      PN.intervallo(-1, 12).forEach((k) => P.testo(P.sx(k), P.H - P.m.b + (PN.mod(k, 2) ? 26 : 14), PN.nomeQ(k), { px: true, cls: k === 11 || k === -1 || k === 12 ? "" : "m p" }));
      P.retta(-1.6, 0, 12.6, 0, "s-m");
      P.retta(-1, dev(-1), 12, dev(12), cls + " fine");
      const d11 = dev(11), dm1 = dev(-1);
      if (Math.abs(d11 - dm1) > 1e-9) {
        P.retta(-1, dm1, 11, dm1, "s-m tratt fine");
        P.retta(11, dm1, 11, d11, "grossa");
        P.testo(11, dm1, "mi♯ − fa = " + seg(d11 - dm1), { anc: "end", dx: -8, dy: d11 > dm1 ? 16 : -8 });   // dal lato opposto alla catena
      }
      PN.intervallo(-1, 12).forEach((k) => {
        const forte = k === 11 || k === -1 || k === 12;
        P.punto(k, dev(k), { cls, forma, r: forte ? 5.5 : 3.8, vuoto: !forte, tit: `${PN.nomeQ(k)}: ${seg(dev(k))} centesimi` });
      });
      const etich = (k, testo, sopra) => P.testo(k, dev(k), testo, { cls: cls + " p", dy: sopra ? -10 : 18, anc: k === 12 ? "end" : "middle", dx: k === 12 ? 6 : 0 });
      etich(12, seg(dev(12)), dev(12) >= 0);
      if (Math.abs(d11 - dm1) > 1e-9) P.testo(-1, dm1, seg(dm1), { cls: cls + " p", anc: "start", dx: 2, dy: dm1 > d11 ? -10 : 18 });
      return P.svg;
    }

    function barre() {
      const cls = SER[acc], sc = PN.intervallo(0, 11).map((k) => C.scarto(acc, k)), tot = C.somma(acc);
      const P = PG.piano({
        h: 214, x: [0.3, 12.7], y: [-30, 44], m: { l: 36, r: 10, t: 14, b: 34 },
        xt: PN.intervallo(1, 12).map((k) => ({ v: k, t: String(k), cls: k - 1 === LUPO && acc !== "equabile" ? "forte" : "" })), yt: [-20, -10, 0, 10, 20, 30, 40].map((v) => ({ v, t: v > 0 ? "+" + v : PN.num(v) })),
        xlab: "quinta del cerchio, da do–sol", ylab: "scarto dalla quinta pura, centesimi",
        aria: `Le dodici quinte, ${NOMI[acc]}: scarti dalla quinta pura ${sc.map((x) => seg(x)).join(", ")}. Somma ${seg(tot)} centesimi.`,
      });
      P.retta(0.3, 0, 12.7, 0, "s-m");
      sc.forEach((v, k) => {
        const x = k + 1, w = 0.34;
        if (Math.abs(v) > 1e-9) { const r = [[x - w, 0], [x - w, v], [x + w, v], [x + w, 0]]; P.area(r, cls); P.spezzata(r.concat([r[0]]), cls + " fine"); }
        P.punto(x, v, { cls, forma: FORMA[acc], r: 3.6, tit: `${C.nomeQuinta(k)}: ${seg(v)} centesimi` });
      });
      // etichette: la quinta regolare (sulla prima barra) e il lupo
      const reg = sc[0], lupo = sc[LUPO];
      if (Math.abs(reg - lupo) > 1e-9) {
        P.testo(LUPO + 1.45, lupo / 2, "lupo " + seg(lupo), { cls: cls + " p", anc: "start", dy: 4 });
        if (Math.abs(reg) > 1e-9) P.testo(2.5, reg, seg(reg), { cls: cls + " p", dy: reg > 0 ? -10 : 18 });
      } else P.testo(6.5, reg, "12 × " + seg(reg), { cls: cls + " p", dy: 18 });
      P.testo(P.m.l + 6, P.m.t + 14, "somma degli scarti: " + seg(tot), { px: true, anc: "start" });
      return P.svg;
    }

    function ridisegna() {
      const qu = C.quinta(acc), pura = C.quintaPura(), lupo = C.accordatura(acc)[LUPO], t3 = C.terzaMaggiore(acc), t3p = C.terzaPura();
      const tutte3 = C.terze(acc), pure3 = tutte3.filter((x) => Math.abs(x - t3p) < 1e-6).length;
      ctx.graf.replaceChildren(
        PG.h("h3", { text: "1. La catena delle quinte: dove finisce rispetto ai tasti" }), catena(),
        PG.legenda([{ cls: SER[acc], forma: FORMA[acc], t: NOMI[acc] + ": una nota ogni quinta" }, { cls: "", forma: "linea", t: "mi♯ − fa" }]),
        PG.h("h3", { text: "2. Il cerchio sulla tastiera: dove finisce il comma" }), barre(),
        PG.legenda([{ cls: SER[acc], forma: FORMA[acc], t: "scarto di ogni quinta (9 = sol♯–mi♭)" }]));
      const somma = `Somma degli scarti: **${seg(C.somma(acc))}**: il comma si sposta, non sparisce.`;
      if (acc === "pitagorica")
        ctx.lettura(`Quinte pure, **${n(pura)}** centesimi: dopo dodici il si♯ supera il do di **${n(C.deriva(acc, 12))}**, il comma pitagorico. Il mi♯ sta ${n(C.deriva(acc, 11))} sopra il suo tasto, il fa ${n(-C.deriva(acc, -1))} sotto: tra i due, ${n(C.miDiesisFa(acc))}. Sul cerchio il comma va tutto in sol♯–mi♭: ${n(lupo)}. Terza maggiore ${n(t3)} contro ${n(t3p)} pura: +${n(t3 - t3p)}, il comma sintonico. ${somma}`);
      else if (acc === "mesotonica")
        ctx.lettura(`Quinte strette di un quarto di comma sintonico: **${n(qu)}** (${seg(qu - pura)}). Così ${pure3} terze maggiori su 12 sono pure, ${n(t3)}; le altre ${12 - pure3} misurano ${n(Math.max(...tutte3))}. La quinta sol♯–mi♭ chiude il cerchio a **${n(lupo)}**: ${seg(lupo - pura)}, il lupo. Il mi♯ sta ${n(-C.miDiesisFa(acc))} sotto il fa. ${somma}`);
      else
        ctx.lettura(`Ogni quinta cede **${n(pura - qu)}** centesimi: ${n(qu, 0)} invece di ${n(pura)}. Il cerchio si chiude; nessuna quinta è pura. Terza maggiore ${n(t3, 0)}: ${seg(t3 - t3p)} sulla pura. Mi♯ e fa coincidono. ${somma}`);
    }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("comma", def);
})(typeof self !== "undefined" ? self : this);
