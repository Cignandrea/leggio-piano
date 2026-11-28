/* Motore «orologio»: le dodici classi di altezza su un cerchio, come le ore; do in alto, un semitono per ora in senso orario.
   Parametri: { modo: "intervalli" | "triadi", n: intervallo iniziale, ripeti: bool, tipo, fond: indice cromatico 0…11, basso: 0|1|2 } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const NOMI_PC = PN.intervallo(0, 11).map((pc) => PN.nomeMidi(60 + pc).replace(/\d+$/, ""));   // do, do♯, re, mi♭ …
  // La nota a n semitoni sopra il do, scritta come l'intervallo che porta quel nome (posti sulla retta delle quinte):
  // seconda minore = re♭ (non do♯, che dal do sarebbe un unisono aumentato), tritono = quarta aumentata, fa♯.
  const Q_INT = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5], NOMI_INT = Q_INT.map(PN.nomeQ);
  const INTERVALLI = ["", "seconda minore", "seconda maggiore", "terza minore", "terza maggiore", "quarta giusta", "tritono",
    "quinta giusta", "sesta minore", "sesta maggiore", "settima minore", "settima maggiore"];
  // Triadi: posti sulla retta delle quinte delle tre note rispetto alla fondamentale (terza maggiore +4, minore −3, quinta giusta +1…)
  const TRIADI = {
    magg: { nome: "maggiore", sigla: "", d: [0, 4, 1], ruoli: ["1", "3", "5"], seconda: "terza" },
    min: { nome: "minore", sigla: "m", d: [0, -3, 1], ruoli: ["1", "3", "5"], seconda: "terza" },
    dim: { nome: "diminuito", sigla: "°", d: [0, -3, -6], ruoli: ["1", "3", "5"], seconda: "terza" },
    aum: { nome: "aumentato", sigla: "+", d: [0, 4, 8], ruoli: ["1", "3", "5"], seconda: "terza" },
    sus4: { nome: "sus4", sigla: "sus4", d: [0, -1, 1], ruoli: ["1", "4", "5"], seconda: "quarta" },
    sus2: { nome: "sus2", sigla: "sus2", d: [0, 2, 1], ruoli: ["1", "2", "5"], seconda: "seconda" },
  };
  const ORDINE_TIPI = ["magg", "min", "dim", "aum", "sus4", "sus2"];
  // Le dodici fondamentali in ordine cromatico, ciascuna con il suo posto q (da −5, re♭, a +6, fa♯)
  const FONDAMENTALI = PN.intervallo(0, 11).map((pc) => PN.intervallo(-5, 6).find((q) => PN.pcQ(q) === pc));
  const BASSI = ["stato fondamentale", "primo rivolto", "secondo rivolto"];

  const mcd = (a, b) => (b === 0 ? Math.abs(a) : mcd(b, a % b));
  const calcola = {
    NOMI_PC, Q_INT, NOMI_INT, INTERVALLI, TRIADI, ORDINE_TIPI, FONDAMENTALI, mcd,
    nomeIntervallo: (n) => INTERVALLI[n],
    rivoltoIntervallo: (n) => 12 - n,
    // Le classi toccate ripetendo l'intervallo n a partire dal do, finché si torna al do.
    orbita(n) { const v = [0]; let x = PN.mod(n, 12); while (x !== 0) { v.push(x); x = PN.mod(x + n, 12); } return v; },
    // Una triade: posti q, classi di altezza, nomi scritti rispetto alla fondamentale, lati (semitoni tra note vicine in senso orario).
    triade(q, tipo) {
      const T = TRIADI[tipo], qs = T.d.map((d) => q + d), pc = qs.map(PN.pcQ);
      const lati = [PN.mod(pc[1] - pc[0], 12), PN.mod(pc[2] - pc[1], 12), PN.mod(pc[0] - pc[2], 12)];
      return { q: qs, pc, nomi: qs.map(PN.nomeQ), lati, somma: lati[0] + lati[1] + lati[2], nome: PN.nomeQ(q) + " " + T.nome, sigla: PN.letteraQ(q) + T.sigla };
    },
    // Disposizione reale dal basso (MIDI): la nota al basso nell'ottava del do centrale, le altre due sopra, in posizione stretta.
    rivoltoTriade(q, tipo, basso) {
      const tr = calcola.triade(q, tipo), ordine = [0, 1, 2].map((i) => (basso + i) % 3), b = PN.MIDI_DO4 + tr.pc[basso];
      const midi = [b]; ordine.slice(1).forEach((i) => { let m = PN.MIDI_DO4 + tr.pc[i]; while (m <= midi[midi.length - 1]) m += 12; midi.push(m); });
      return { midi, ordine, nomi: midi.map((m, j) => calcola.nomeOttava(tr.q[ordine[j]], m)), nomeBasso: tr.nomi[basso], sigla: tr.sigla + (basso ? "/" + PN.letteraQ(tr.q[basso]) : ""), stato: BASSI[basso] };
    },
    // Nome con l'ottava, scritto rispetto alla fondamentale: l'ottava si conta sul nome della nota, non sul tasto (do♭5 è il tasto si4).
    nomeOttava: (q, midi) => PN.nomeQ(q) + (Math.floor((midi - PN.alterazioniQ(q)) / 12) - 1),
    stessoInsieme: (a, b) => [...new Set(a.map((x) => PN.mod(x, 12)))].sort((x, y) => x - y).join() === [...new Set(b.map((x) => PN.mod(x, 12)))].sort((x, y) => x - y).join(),
    // La triade «gemella» con le stesse note: sus4 su q = sus2 su q − 1 (la quarta), sus2 su q = sus4 su q + 1 (la quinta).
    gemella(q, tipo) {
      const g = tipo === "sus4" ? { q: q - 1, tipo: "sus2" } : tipo === "sus2" ? { q: q + 1, tipo: "sus4" } : null;
      return g && calcola.stessoInsieme(calcola.triade(q, tipo).pc, calcola.triade(g.q, g.tipo).pc) ? g : null;
    },
    fraseIntervallo(n, ripeti) {
      const r = 12 - n, a = NOMI_INT[n];
      let f = n === 6 ? `6 semitoni: **tritono** (do–${a}). Il rivolto misura 12 − 6 = 6: il tritono è il rivolto di sé stesso, metà esatta dell'ottava.`
        : `${n} ${n === 1 ? "semitono" : "semitoni"}: **${INTERVALLI[n]}** (do–${a}). Il rivolto misura 12 − ${n} = ${r}: **${INTERVALLI[r]}** (${a}–do).`;
      if (ripeti) {
        const o = calcola.orbita(n), k = mcd(n, 12);
        f += ` Ripetuto: MCD(${n}, 12) = ${k}, quindi tocca 12 / ${k} = **${o.length} note**`;
        if (o.length === 12 && (n === 7 || n === 5)) f += `, tutte: è il circolo delle quinte${n === 5 ? " letto per quarte" : ""} (${o.slice(0, 5).map((p) => NOMI_PC[p]).join(", ")}…).`;
        else if (o.length === 12) f += ", tutte e dodici.";
        else if (n === 4 || n === 8) { const a = calcola.triade(0, "aum"); f += ` (${o.map((p) => NOMI_PC[p]).join(", ")}): sono le note di **${a.nomi.join("–")}**, la triade aumentata (il ${a.nomi[2]} sta sul tasto del la♭).`; }
        else f += ` (${o.map((p) => NOMI_PC[p]).join(", ")}).`;
      }
      return f;
    },
    fraseTriade(q, tipo, basso) {
      const tr = calcola.triade(q, tipo), rv = calcola.rivoltoTriade(q, tipo, basso), T = TRIADI[tipo];
      let f = `**${tr.nome}**, ${tr.nomi.join("–")}: lati ${tr.lati.join(" + ")} = ${tr.somma}. `;
      if (tipo.startsWith("sus")) f += basso ? `Al basso ${rv.nomeBasso}: ${rv.sigla}. Stesse tre note, stesso triangolo.` : `Al basso ${rv.nomeBasso}: ${rv.sigla}.`;
      else f += basso ? `Al basso ${rv.nomeBasso}: ${rv.stato}, ${rv.sigla}. Stesse tre note, stesso triangolo.` : `Al basso ${rv.nomeBasso}: ${rv.stato}, ${rv.sigla}.`;
      if (tipo === "aum") f += ` Il triangolo è equilatero: ruotato di 4 semitoni torna su sé stesso, e la triade aumentata costruita su ognuno dei suoi tre tasti (${tr.pc.map((p) => NOMI_PC[p]).join(", ")}) ha gli stessi tre tasti.`;
      const g = calcola.gemella(q, tipo);
      if (g) { const a = PN.nomeQ(q); f += ` **${a.charAt(0).toUpperCase() + a.slice(1)} ${T.nome}** e **${PN.nomeQ(g.q)} ${TRIADI[g.tipo].nome}** sono lo stesso triangolo.`; }
      return f;
    },
  };

  /* ---------- Disegno ---------- */
  function disegna(ctx, param) {
    const PG = root.PG, s = PG.s;
    const modo = param.modo === "triadi" ? "triadi" : "intervalli";
    let n = Number.isInteger(param.n) && param.n >= 1 && param.n <= 11 ? param.n : 7, ripeti = !!param.ripeti;
    let tipo = TRIADI[param.tipo] ? param.tipo : "magg", fi = Number.isInteger(param.fond) ? PN.mod(param.fond, 12) : 0, basso = [0, 1, 2].includes(param.basso) ? param.basso : 0;
    const W = 360, CX = 180, CY = 138, R = 100;
    const ang = (pc) => (-90 + 30 * pc) * Math.PI / 180, r1 = (v) => Math.round(v * 10) / 10;
    const P = (pc, r) => [r1(CX + r * Math.cos(ang(pc))), r1(CY + r * Math.sin(ang(pc)))];
    const arco = (a, L, r, cls) => { const [x0, y0] = P(a, r), [x1, y1] = P(a + L, r); return s("path", { class: "g-linea " + cls, d: `M${x0},${y0} A${r},${r} 0 ${L > 6 ? 1 : 0} 1 ${x1},${y1}` }); };
    const testo = (x, y, t, cls, anc) => s("text", { class: "g-testo " + (cls || ""), x: r1(x), y: r1(y), "text-anchor": anc || "middle", text: t });
    const nome = (pc, t, cls) => { const [x, y] = P(pc, R + 19); return testo(x, y + 4, t, cls); };

    // Comandi
    if (modo === "intervalli") {
      const cur = PG.cursore({ etichetta: "Intervallo", min: 1, max: 11, passo: 1, valore: n, mostra: (v) => v + (v === 1 ? " semitono" : " semitoni"), su: (v) => { n = v; ridisegna(); } });
      ctx.comandi.replaceChildren(cur, PG.riga(PG.interruttore({ etichetta: "Ripeti l'intervallo", valore: ripeti, su: (v) => { ripeti = v; ridisegna(); } })));
      ctx.cur = cur;
    } else {
      const segBasso = () => PG.seg({ etichetta: "Al basso", opzioni: [{ v: 0, t: "fondamentale" }, { v: 1, t: TRIADI[tipo].seconda }, { v: 2, t: "quinta" }], valore: basso, su: (v) => { basso = v; ridisegna(); } });
      let sb = segBasso();
      const st = PG.seg({ etichetta: "Tipo", opzioni: ORDINE_TIPI.map((k) => ({ v: k, t: { magg: "magg.", min: "min.", dim: "dim.", aum: "aum.", sus4: "sus4", sus2: "sus2" }[k] })), valore: tipo,
        su: (v) => { const cambia = TRIADI[v].seconda !== TRIADI[tipo].seconda; tipo = v; if (cambia) { const nb = segBasso(); sb.replaceWith(nb); sb = nb; } ridisegna(); } });
      const cur = PG.cursore({ etichetta: "Fondamentale", min: 0, max: 11, passo: 1, valore: fi, mostra: (v) => PN.nomeQ(FONDAMENTALI[v]), su: (v) => { fi = v; ridisegna(); } });
      ctx.comandi.replaceChildren(st, cur, sb);
    }

    function quadrante(svg, evidenzia) {
      svg.append(s("circle", { class: "g-linea s-m fine", cx: CX, cy: CY, r: R }));
      PN.intervallo(0, 11).forEach((pc) => { const [x, y] = P(pc, R); svg.append(s("circle", { class: "g-punto s-m", cx: x, cy: y, r: 2.5 })); if (!evidenzia[pc]) svg.append(nome(pc, (modo === "intervalli" ? NOMI_INT : NOMI_PC)[pc], "m")); });
    }

    function intervalli() {
      const r = 12 - n, o = calcola.orbita(n), k = mcd(n, 12);
      const svg = s("svg", { viewBox: `0 0 ${W} 300`, class: "g-svg", role: "img",
        "aria-label": `Orologio delle dodici note. ${n} semitoni da do a ${NOMI_INT[n]}: ${INTERVALLI[n]}; il resto del giro, ${r} semitoni, è il rivolto: ${INTERVALLI[r]}.` + (ripeti ? ` Ripetendo l'intervallo si toccano ${o.length} note.` : "") });
      const ev = {}; ev[0] = ev[n] = true; if (ripeti) o.forEach((p) => { ev[p] = true; });
      quadrante(svg, ev);
      svg.append(arco(0, n, R, "s-a grossa"), arco(n, r, R, "s-b grossa tratt"));
      if (ripeti) {
        svg.append(s("polygon", { class: "g-linea s-c fine", points: o.map((p) => P(p, R).join(",")).join(" ") }));
        // ogni nota toccata porta il numero del passo (0 = il do di partenza)
        o.forEach((p, i) => { const [x, y] = P(p, R); svg.append(s("circle", { class: "g-segno f-c", cx: x, cy: y, r: 8.5 }), s("text", { class: "g-segno-t", x, y: y + 3.2, "text-anchor": "middle", text: String(i) })); });
      } else {
        const [xa, ya] = P(0, R), [xb, yb] = P(n, R);
        svg.append(s("line", { class: "g-linea s-a fine", x1: xa, y1: ya, x2: xb, y2: yb }));
        const [x1, y1] = P(n / 2, R - 24), [x2, y2] = P(n + r / 2, R - 24);
        svg.append(testo(x1, y1 + 5, String(n), "s-a g"), testo(x2, y2 + 5, String(r), "s-b g"));
      }
      o.forEach((p) => { if (ev[p]) svg.append(nome(p, NOMI_INT[p], p === 0 || p === n ? "g" : "")); });
      if (!ripeti) [0, n].forEach((p, i) => { const [x, y] = P(p, R); svg.append(s("circle", { class: "g-punto " + (i ? "s-a" : ""), cx: x, cy: y, r: 6 })); });
      // Toccare una nota sceglie l'intervallo dal do
      PN.intervallo(1, 11).forEach((p) => {
        const [x, y] = P(p, R);
        const g = s("g", { class: "g-premi", tabindex: 0, role: "button", "aria-label": `${NOMI_INT[p]}: ${p} semitoni dal do`,
          onclick: () => { n = p; if (ctx.cur) ctx.cur.metti(p); ridisegna(); }, onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); n = p; if (ctx.cur) ctx.cur.metti(p); ridisegna(); } } });
        g.append(s("circle", { class: "g-tocco", cx: x, cy: y, r: 16 })); svg.append(g);
      });
      svg.append(testo(CX, 290, ripeti ? `MCD(${n}, 12) = ${k}  →  12 / ${k} = ${o.length} note` : `${n} + ${r} = 12 semitoni: un giro, un'ottava`, ""));
      ctx.graf.replaceChildren(svg,
        PG.legenda([{ cls: "s-a grossa", forma: "linea", t: `intervallo: ${n}` }, { cls: "s-b grossa tratt", forma: "linea", t: `rivolto: ${r}` }].concat(ripeti ? [{ cls: "s-c", forma: "cerchio", t: "passi ripetuti: 0, 1, 2 …" }] : [])));
      ctx.lettura(calcola.fraseIntervallo(n, ripeti));
    }

    function triadi() {
      const q = FONDAMENTALI[fi], tr = calcola.triade(q, tipo), rv = calcola.rivoltoTriade(q, tipo, basso), T = TRIADI[tipo];
      const svg = s("svg", { viewBox: `0 0 ${W} 296`, class: "g-svg", role: "img",
        "aria-label": `${tr.nome}: ${tr.nomi.join(", ")}. Lati del triangolo ${tr.lati.join(", ")} semitoni, somma ${tr.somma}. Al basso ${rv.nomeBasso}: ${rv.sigla}.` });
      const ev = {}; tr.pc.forEach((p) => { ev[p] = true; });
      quadrante(svg, ev);
      const pts = tr.pc.map((p) => P(p, R));
      svg.append(s("polygon", { class: "g-area s-a", points: pts.map((p) => p.join(",")).join(" ") }), s("polygon", { class: "g-linea s-a", points: pts.map((p) => p.join(",")).join(" ") }));
      // Lati: il numero di semitoni sull'arco, tra il lato e il cerchio (dentro il triangolo se l'arco è corto)
      tr.lati.forEach((L, i) => {
        const a = tr.pc[i], mid = a + L / 2, corda = R * Math.cos(Math.PI * L / 12), rr = L <= 2 ? corda - 15 : (corda + R) / 2;
        const [x, y] = P(mid, rr); svg.append(testo(x, y + 5, String(L), "g"));
      });
      tr.pc.forEach((p, i) => {
        const [x, y] = P(p, R), b = i === basso;
        svg.append(b ? s("rect", { class: "g-segno f-b", x: x - 10, y: y - 10, width: 20, height: 20, rx: 2 }) : s("circle", { class: "g-segno f-a", cx: x, cy: y, r: 10 }));
        svg.append(s("text", { class: "g-segno-t", x, y: y + 3.2, "text-anchor": "middle", text: T.ruoli[i] }));
        svg.append(nome(p, tr.nomi[i], "g"));
      });
      svg.append(testo(CX, 290, `${tr.lati.join(" + ")} = ${tr.somma}`, "g"));
      const segna = {}; rv.midi.forEach((m, j) => { const i = rv.ordine[j]; segna[m] = { cls: i === basso ? "f-b" : "f-a", t: T.ruoli[i] }; });
      const tast = PG.tastiera({ da: 60, a: 83, h: 70, segna, aria: `${rv.sigla}: dal basso ${rv.nomi.join(", ")}.` });
      ctx.graf.replaceChildren(svg,
        PG.legenda([{ cls: "s-a", forma: "cerchio", t: `nota della triade (${T.ruoli.join(", ")})` }, { cls: "s-b", forma: "quadro", t: "nota al basso" }]),
        PG.h("h3", { text: `${rv.sigla}: ${rv.nomi.join(" – ")}, dal basso` }), tast);
      ctx.lettura(calcola.fraseTriade(q, tipo, basso));
    }

    function ridisegna() { if (modo === "intervalli") intervalli(); else triadi(); }
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("orologio", def);
})(typeof self !== "undefined" ? self : this);
