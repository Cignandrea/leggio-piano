/* Motore «rigo-asse»: il pentagramma come asse. Posizione p sul rigo (0 = primo rigo, 1 = primo spazio … 8 = quinto rigo)
   e nota in gradi sopra il do centrale (do4 = 0, re4 = 1 …): la chiave è una retta di pendenza 1, e ne fissa l'intercetta.
   Parametri: { p: posizione iniziale (−2…10), diesis: numero iniziale di diesis in armatura (0…7) } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  const LETTERE = ["do", "re", "mi", "fa", "sol", "la", "si"];
  // I due fatti del quaderno (§2.3): la chiave di violino fissa il sol4 sul secondo rigo, quella di basso il fa3 sul quarto rigo.
  const FATTI = { violino: { p: 2, nota: 4 }, basso: { p: 6, nota: -4 } };
  const INTERCETTA = { violino: FATTI.violino.nota - FATTI.violino.p, basso: FATTI.basso.nota - FATTI.basso.p };   // +2 e −10
  // Posti dei diesis in armatura, chiave di violino: convenzione di scrittura (dato dichiarato, ricontrollato dal collaudo).
  const POSTI_DIESIS = [8, 5, 9, 6, 3, 7, 4];
  const NEL_QUADERNO = 4;   // il §5.1 dà i posti dei primi quattro
  const P_MIN = -2, P_MAX = 10;
  const POS = { "-2": "taglio addizionale sotto il rigo", "-1": "spazio sotto il primo rigo", 9: "spazio sopra il quinto rigo", 10: "taglio addizionale sopra il rigo" };
  const ORD = ["primo", "secondo", "terzo", "quarto", "quinto"];
  const TACCA = { "-2": "tag", "-1": "sp", 9: "sp", 10: "tag" };

  const calcola = {
    FATTI, INTERCETTA, POSTI_DIESIS, NEL_QUADERNO, P_MIN, P_MAX,
    nota: (p, chiave) => p + INTERCETTA[chiave],
    nomeGrado: (d) => LETTERE[PN.mod(d, 7)] + (4 + Math.floor(d / 7)),
    lettera: (d) => LETTERE[PN.mod(d, 7)],
    nomePosizione: (p) => POS[p] || (PN.mod(p, 2) === 0 ? ORD[p / 2] + " rigo" : ORD[(p - 1) / 2] + " spazio"),
    // La posizione con la sua preposizione: «sul quinto rigo», «nel terzo spazio», «nello spazio sopra il quinto rigo».
    inPosizione: (p) => (p === -1 || p === 9 ? "nello " : PN.mod(p, 2) === 1 ? "nel " : "sul ") + calcola.nomePosizione(p),
    tacca: (p) => TACCA[p] || (PN.mod(p, 2) === 0 ? "r" + (p / 2 + 1) : "s" + (p + 1) / 2),
    // Differenza tra le due chiavi: in gradi e nei nomi (mod 7).
    scarto() { const g = INTERCETTA.basso - INTERCETTA.violino; return { gradi: g, nomi: PN.mod(g, 7) }; },
    // I diesis in armatura: ordine, posto q, nome, posizione sul rigo, nota scritta in chiave di violino.
    diesis: (k) => PN.armatura(7).note.slice(0, k).map((q, i) => ({ ordine: i + 1, q, nome: PN.nomeQ(q), p: POSTI_DIESIS[i], scritta: calcola.nomeGrado(calcola.nota(POSTI_DIESIS[i], "violino")) })),
    passi: () => POSTI_DIESIS.slice(1).map((p, i) => p - POSTI_DIESIS[i]),
    frase(p) {
      const v = calcola.nota(p, "violino"), b = calcola.nota(p, "basso"), sc = calcola.scarto();
      const pos = calcola.nomePosizione(p), Pos = pos.charAt(0).toUpperCase() + pos.slice(1);
      let f = `${Pos}: **${calcola.nomeGrado(v)}** in chiave di violino, **${calcola.nomeGrado(b)}** in chiave di basso.`;
      f += ` Stessa posizione sul rigo: in chiave di basso la nota suona ${-sc.gradi} note più in basso, ma di nome è due note più su (${calcola.lettera(v)} → ${calcola.lettera(b)}: −${-sc.gradi} ≡ +${sc.nomi} mod 7).`;
      if (v === 0 || b === 0) f += ` Il do4 qui è il **do centrale**.`;
      return f;
    },
    fraseDiesis(k) {
      if (k === 0) return "Nessun diesis: **do maggiore**.";
      const d = calcola.diesis(k), u = d[k - 1], ton = PN.nomeQ(k);
      const testa = k === 1 ? `Un diesis, il ${u.nome}` : `${k} diesis: ${d.map((x) => x.nome).join(", ")}. L'ultimo è ${u.nome}`;
      let f = `${testa}, scritto ${calcola.inPosizione(u.p)}: un semitono sotto la tonica, **${ton} maggiore**.`;
      if (k > NEL_QUADERNO) f += " I posti oltre il quarto diesis non sono ancora nel quaderno.";
      return f;
    },
  };

  function disegna(ctx, param) {
    const PG = root.PG, s = PG.s;
    let p = Number.isInteger(param.p) && param.p >= P_MIN && param.p <= P_MAX ? param.p : 4, k = Number.isInteger(param.diesis) && param.diesis >= 0 && param.diesis <= 7 ? param.diesis : 3, ultimo = "pos";
    const curP = PG.cursore({ etichetta: "Posizione", min: P_MIN, max: P_MAX, passo: 1, valore: p, mostra: calcola.nomePosizione, su: (v) => { p = v; ultimo = "pos"; ridisegna(); } });
    const curK = PG.cursore({ etichetta: "Diesis in armatura", min: 0, max: 7, passo: 1, valore: k, mostra: (v) => (v ? v + " · " + PN.nomeQ(v) + " maggiore" : "0 · do maggiore"), su: (v) => { k = v; ultimo = "diesis"; ridisegna(); } });
    const r1 = (v) => Math.round(v * 10) / 10;

    function pentagramma() {
      // Cinque righe: una posizione = 5 unità. Il primo rigo è a y = 82.
      const W = 360, Y0 = 82, U = 5, X0 = 112, X1 = 248, XN = 180, yP = (q) => Y0 - q * U;
      const svg = s("svg", { viewBox: `0 0 ${W} 118`, class: "g-svg", role: "img", "aria-label": `Una nota ${calcola.inPosizione(p)}: ${calcola.nomeGrado(calcola.nota(p, "violino"))} in chiave di violino, ${calcola.nomeGrado(calcola.nota(p, "basso"))} in chiave di basso.` });
      [0, 2, 4, 6, 8].forEach((q) => svg.append(s("line", { class: "g-linea s-m", x1: X0, x2: X1, y1: yP(q), y2: yP(q) })));
      if (p === -2 || p === 10) svg.append(s("line", { class: "g-linea", x1: XN - 13, x2: XN + 13, y1: yP(p), y2: yP(p) }));
      svg.append(s("ellipse", { class: "g-punto", cx: XN, cy: r1(yP(p)), rx: 7, ry: 5, transform: `rotate(-20 ${XN} ${r1(yP(p))})` }));
      const v = calcola.nomeGrado(calcola.nota(p, "violino")), b = calcola.nomeGrado(calcola.nota(p, "basso")), ym = yP(4);
      svg.append(
        s("text", { class: "g-testo s-a", x: 12, y: ym - 6, text: "violino" }), s("text", { class: "g-testo s-a g", x: 12, y: ym + 12, text: v }),
        s("text", { class: "g-testo s-b", x: 348, y: ym - 6, "text-anchor": "end", text: "basso" }), s("text", { class: "g-testo s-b g", x: 348, y: ym + 12, "text-anchor": "end", text: b }),
        s("text", { class: "g-testo m p", x: XN, y: 112, "text-anchor": "middle", text: calcola.nomePosizione(p) }));
      return svg;
    }

    function ridisegna() {
      const v = calcola.nota(p, "violino"), b = calcola.nota(p, "basso");
      /* 1. Le due rette */
      const P = PG.piano({
        h: 300, x: [P_MIN - 0.6, P_MAX + 0.6], y: [-13, 13.2], m: { l: 40, r: 10, t: 14, b: 34 },
        xt: PN.intervallo(P_MIN, P_MAX).map((q) => ({ v: q, t: calcola.tacca(q), cls: q === p ? "forte" : "" })),
        yt: PN.intervallo(-6, 6).map((i) => ({ v: 2 * i, t: calcola.nomeGrado(2 * i), cls: 2 * i === 0 ? "forte" : "" })),
        xlab: "posizione sul rigo (r rigo, s spazio)", ylab: "nota (do4 = do centrale)",
        aria: `Chiave di violino: nota = posizione + ${INTERCETTA.violino}. Chiave di basso: nota = posizione − ${-INTERCETTA.basso}. Posizione scelta, ${calcola.nomePosizione(p)}: ${calcola.nomeGrado(v)} e ${calcola.nomeGrado(b)}.`,
      });
      P.retta(P_MIN - 0.6, 0, P_MAX + 0.6, 0, "s-m tratt");
      P.testo(4, 0, "do centrale", { dy: -5, cls: "m p" });
      P.retta(p, -13, p, 13.2, "s-m fine");
      P.retta(P_MIN - 0.6, P_MIN - 0.6 + INTERCETTA.violino, P_MAX + 0.6, P_MAX + 0.6 + INTERCETTA.violino, "s-a");
      P.retta(P_MIN - 0.6, P_MIN - 0.6 + INTERCETTA.basso, P_MAX + 0.6, P_MAX + 0.6 + INTERCETTA.basso, "s-b");
      PN.intervallo(P_MIN, P_MAX).forEach((q) => {
        const sel = q === p, su = () => { p = q; ultimo = "pos"; curP.metti(q); ridisegna(); };
        P.punto(q, q + INTERCETTA.violino, { cls: "s-a", r: sel ? 6.5 : 3.5, t: sel ? calcola.nomeGrado(v) : null, pos: q <= 0 ? "ne" : "no", tcls: "s-a g", su, tit: `${calcola.nomePosizione(q)}, chiave di violino: ${calcola.nomeGrado(q + INTERCETTA.violino)}` });
        P.punto(q, q + INTERCETTA.basso, { cls: "s-b", forma: "quadro", r: sel ? 6 : 3.2, t: sel ? calcola.nomeGrado(b) : null, pos: q >= 8 ? "no" : q <= 0 ? "ne" : "se", tcls: "s-b g", su, tit: `${calcola.nomePosizione(q)}, chiave di basso: ${calcola.nomeGrado(q + INTERCETTA.basso)}` });
      });
      /* 3. I diesis in armatura */
      const D = calcola.diesis(7), passi = calcola.passi();
      const Q = PG.piano({
        h: 236, x: [0.4, 7.6], y: [-0.7, 11.6], m: { l: 40, r: 10, t: 14, b: 34 },
        xt: PN.intervallo(1, 7).map((i) => ({ v: i, t: i + "º", cls: i === k ? "forte" : "" })), yt: PN.intervallo(0, 9).map((q) => ({ v: q, t: calcola.tacca(q) })),
        xlab: "ordine del diesis", ylab: "posizione sul rigo (chiave di violino)",
        aria: `I diesis in armatura in chiave di violino: ${D.map((d) => d.nome + " " + calcola.inPosizione(d.p)).join(", ")}. Passi: ${passi.join(", ")}.`,
      });
      [0, 2, 4, 6, 8].forEach((q) => Q.retta(0.4, q, 7.6, q, "s-m"));
      if (k > 1) Q.spezzata(D.slice(0, k).map((d) => [d.ordine, d.p]), "fine");
      D.slice(0, k).forEach((d, i) => {
        // i passi in basso, tra due colonne; i nomi in alto, sopra ogni colonna: nessuna scritta incrocia la spezzata
        if (i) { const pa = passi[i - 1]; Q.testo(d.ordine - 0.5, 1, (pa > 0 ? "+" : "−") + Math.abs(pa), { cls: "g", dy: 4 }); }
        const oltre = d.ordine > NEL_QUADERNO;
        Q.testo(d.ordine, 10.8, d.nome, { cls: oltre ? "m" : "g", dy: 4 });
        Q.punto(d.ordine, d.p, { cls: oltre ? "s-m" : "s-a", r: 5.5, vuoto: oltre, tit: `${d.ordine}º diesis: ${d.nome}, ${calcola.inPosizione(d.p)}` });
      });
      D.slice(k).forEach((d) => Q.punto(d.ordine, d.p, { cls: "s-m", r: 2.5 }));

      ctx.graf.replaceChildren(
        PG.h("h3", { text: "Ogni chiave è una retta" }), P.svg,
        PG.legenda([{ cls: "s-a", forma: "cerchio", t: `violino: nota = p + ${INTERCETTA.violino}` }, { cls: "s-b", forma: "quadro", t: `basso: nota = p − ${-INTERCETTA.basso}` }]),
        PG.h("h3", { text: "La stessa posizione sul pentagramma" }), pentagramma(),
        PG.h("h3", { text: "I diesis in armatura: su di quattro, giù di tre" }), Q.svg,
        PG.legenda([{ cls: "s-a", forma: "cerchio", t: "posto dato dal §5.1" }, { cls: "s-m", forma: "cerchio", t: "oltre il quarto: non ancora nel quaderno" }]));
      ctx.lettura(ultimo === "pos" ? calcola.frase(p) : calcola.fraseDiesis(k));
    }
    ctx.comandi.replaceChildren(curP, curK);
    ridisegna();
    return {};
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("rigo-asse", def);
})(typeof self !== "undefined" ? self : this);
