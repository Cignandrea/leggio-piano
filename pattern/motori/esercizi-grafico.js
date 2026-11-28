/* Motore «esercizi-grafico»: ogni esercizio di ginnastica con una figura diventa un grafico tasto × tempo.
   Legge esercizi.json (lo stesso file della sezione Esercizi) e disegna da sé ogni esercizio che ha una «figura»
   o delle «varianti» con figura: un esercizio nuovo ha il suo grafico senza scrivere codice.
   L'espansione della figura in note replica quella dell'app (index.html, buildFig): il collaudo le confronta nota per nota.
   Parametri della tavola: { esercizi: [id da mostrare] (default: tutti quelli con figura), id: esercizio iniziale } */
(function (root) {
  "use strict";
  const PN = root.PN || require("../nucleo.js");

  /* Tasti bianchi numerati in ordine come nell'app: MIDI 0 (do−1) = 0, do4 = 35, re4 = 36… Un tasto nero cade sul bianco sotto. */
  const WI = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6], PC_BIANCHI = [0, 2, 4, 5, 7, 9, 11], NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const bianco = (m) => Math.floor(m / 12) * 7 + WI[PN.mod(m, 12)];
  const daBianco = (i) => Math.floor(i / 7) * 12 + PC_BIANCHI[PN.mod(i, 7)];
  const midiDi = (s) => { const r = /^([A-G])([#b]?)(-?\d)$/.exec(s); if (!r) return 60; return (Number(r[3]) + 1) * 12 + NAT[r[1]] + (r[2] === "#" ? 1 : r[2] === "b" ? -1 : 0); };
  const MANI = ["r", "l"], NOME_MANO = { r: "destra", l: "sinistra" };

  const calcola = {
    bianco, daBianco, midiDi,
    nomeBianco: (i) => PN.nomeMidi(daBianco(i)),
    // La figura in note, mano per mano: [{ i: passo nel tempo (da 1), gruppo (da 1), k: posto nel gruppo (da 0), bianco, midi, nome, dito }]
    espandi(fig) {
      const out = {}, L = fig.seq.length, G = Math.max(1, fig.gruppi || 1), passo = fig.passo || 1;
      for (const h of MANI) {
        const H = fig.mani && fig.mani[h]; if (!H) continue;
        const note = [], seq = H.seq || fig.seq;
        for (let g = 0; g < G; g++) {
          const b0 = bianco(midiDi(H.base)) + g * passo;
          for (let k = 0; k < L; k++) {
            for (const j of [].concat(seq[k])) {
              if (H.tasti[j] === undefined) continue;   // un indice fuori dalla figura non suona (come nell'app)
              const b = b0 + H.tasti[j];
              note.push({ i: g * L + k + 1, gruppo: g + 1, k, bianco: b, midi: daBianco(b), nome: PN.nomeMidi(daBianco(b)), dito: H.dita[j] });
            }
          }
        }
        out[h] = note;
      }
      return out;
    },
    // La rampa: la retta per l'inizio di ogni gruppo. Pendenza = passo / lunghezza del gruppo, in tasti per nota.
    rampa(fig) {
      const L = fig.seq.length, G = Math.max(1, fig.gruppi || 1), passo = fig.passo || 1, e = calcola.espandi(fig), out = { pendenza: passo / L, passo, lunghezza: L, gruppi: G, mani: {} };
      for (const h in e) out.mani[h] = PN.intervallo(1, G).map((g) => { const n = e[h].find((x) => x.gruppo === g); return n ? [n.i, n.bianco] : null; }).filter(Boolean);
      return out;
    },
    // Che relazione c'è tra le due mani, nota per nota (la prima nota di ogni passo):
    // differenza costante = parallelo (traslazione); somma costante = specchio (riflessione); altrimenti «altro».
    relazione(nr, nl) {
      if (!nr || !nl || !nr.length || !nl.length) return { tipo: "una mano" };
      const prima = (a) => { const m = new Map(); a.forEach((n) => { if (!m.has(n.i)) m.set(n.i, n.bianco); }); return m; };
      const R = prima(nr), Lm = prima(nl), passi = [...R.keys()].filter((i) => Lm.has(i));
      if (!passi.length || passi.length !== R.size || passi.length !== Lm.size) return { tipo: "altro" };
      const d = new Set(passi.map((i) => R.get(i) - Lm.get(i))), s = new Set(passi.map((i) => R.get(i) + Lm.get(i)));
      if (d.size === 1) return { tipo: "parallelo", c: [...d][0] };
      if (s.size === 1) return { tipo: "specchio", c: [...s][0] };
      return { tipo: "altro" };
    },
    // Gli esercizi della libreria che hanno una figura: [{ id, titolo, breve, varianti: [{ id, nome, figura }] }]
    elenco(lib) {
      const es = (lib && Array.isArray(lib.esercizi)) ? lib.esercizi : [];
      const figDi = (b, seen) => {
        if (b.figuraDa && !seen.includes(b.id)) { const src = es.find((x) => x.id === b.figuraDa); if (src && src !== b) return figDi(src, seen.concat(b.id)); }
        if (Array.isArray(b.varianti) && b.varianti.length) return b.varianti.filter((v) => v && v.figura && Array.isArray(v.figura.seq)).map((v) => ({ id: v.id, nome: v.nome || v.id, figura: v.figura }));
        return b.figura && Array.isArray(b.figura.seq) ? [{ id: "", nome: "", figura: b.figura }] : [];
      };
      return es.map((b) => ({ id: b.id, titolo: b.titolo || b.id, breve: calcola.breve(b.titolo || b.id), varianti: figDi(b, []) })).filter((x) => x.varianti.length);
    },
    // Titolo breve per il comando: la parte dopo i due punti, se c'è.
    breve: (t) => { const s = String(t).split(":"); const b = (s.length > 1 ? s.slice(1).join(":") : s[0]).trim(); return b.charAt(0).toUpperCase() + b.slice(1); },
  };

  function disegna(ctx, param) {
    const PG = root.PG;
    let lib = null, scelto = param.id || null, variante = null, vista = "tutto", attivo = true;

    function carica() {
      ctx.comandi.replaceChildren();
      ctx.graf.replaceChildren(PG.h("p", { class: "muted", text: "Apro gli esercizi…" }));
      ctx.lettura("Il grafico si costruisce dagli esercizi dell'app.");
      fetch("esercizi.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then((d) => {
        if (!attivo) return;
        try {
          lib = calcola.elenco(d);
          if (Array.isArray(param.esercizi) && param.esercizi.length) lib = lib.filter((x) => param.esercizi.includes(x.id));
          if (!lib.length) throw new Error("nessun esercizio con figura");
          if (!lib.some((x) => x.id === scelto)) scelto = lib[0].id;
          comandi(); ridisegna();
        } catch (e) {   // i dati sono arrivati ma una figura non si disegna: non è un problema di rete
          console.error(e);
          ctx.comandi.replaceChildren();
          ctx.graf.replaceChildren(PG.h("p", { class: "muted", text: "Negli esercizi non c'è una figura che si riesca a disegnare." }));
          ctx.lettura("Nessun grafico: le figure degli esercizi non sono leggibili.");
        }
      }, () => {
        if (!attivo) return;
        ctx.graf.replaceChildren(PG.h("div", { class: "vuoto" }, PG.h("p", { text: "Gli esercizi non si sono caricati: serve la rete almeno la prima volta." }), PG.pulsante({ t: "Riprova", su: carica })));
        ctx.lettura("Nessun grafico: gli esercizi non sono arrivati.");
      });
    }
    const corrente = () => { const e = lib.find((x) => x.id === scelto); const v = e.varianti.find((x) => x.id === variante) || e.varianti[0]; variante = v.id; return { e, v }; };

    function comandi() {
      const { e, v } = corrente(), c = [];
      const scelte = lib.map((x) => PG.interruttore({ etichetta: x.breve, valore: x.id === scelto, su: () => { scelto = x.id; variante = null; vista = "tutto"; comandi(); ridisegna(); } }));
      c.push(PG.h("div", { class: "pt-com" }, PG.h("span", { class: "pt-com-l", text: "Esercizio" }), PG.riga(...scelte)));
      if (e.varianti.length > 1) c.push(PG.seg({ etichetta: "Variante", opzioni: e.varianti.map((x) => ({ v: x.id, t: x.nome })), valore: v.id, su: (val) => { variante = val; vista = "tutto"; comandi(); ridisegna(); } }));
      if ((v.figura.gruppi || 1) > 1) c.push(PG.seg({ etichetta: "Vista", opzioni: [{ v: "tutto", t: "tutti i gruppi" }, { v: "due", t: "primi due" }], valore: vista, su: (val) => { vista = val; ridisegna(); } }));
      ctx.comandi.replaceChildren(...c);
    }

    function ridisegna() {
      const { e, v } = corrente(), fig = v.figura, tutte = calcola.espandi(fig), ra = calcola.rampa(fig), L = ra.lunghezza, G = ra.gruppi;
      const fino = vista === "due" ? Math.min(G, 2) * L : G * L;
      const note = {}; for (const h in tutte) note[h] = tutte[h].filter((n) => n.i <= fino);
      const bb = Object.values(note).flat().map((n) => n.bianco), lo = Math.min(...bb), hi = Math.max(...bb);
      // tacche: ogni tasto bianco se l'intervallo è corto, altrimenti do, mi e sol di ogni ottava
      const tutti = hi - lo <= 12, yt = PN.intervallo(lo, hi).filter((b) => tutti || [0, 2, 4].includes(PN.mod(b, 7))).map((b) => ({ v: b, t: calcola.nomeBianco(b), cls: PN.mod(b, 7) === 0 ? "forte" : "" }));
      // tacche: ogni nota se sono poche; altrimenti la prima nota di ogni gruppo
      const xt = PN.intervallo(1, fino).filter((i) => fino <= 16 || (G > 1 ? (i - 1) % L === 0 : i === 1 || i % 4 === 0)).map((i) => ({ v: i, t: String(i) }));
      const rel = calcola.relazione(tutte.r, tutte.l), nomeEs = e.titolo + (v.nome ? " · " + v.nome : "");
      const P = PG.piano({
        h: Math.max(230, Math.min(300, 14 * (hi - lo + 3) + 50)), x: [0.3, fino + 0.7], y: [lo - (fino <= 16 ? 1.8 : 1), hi + 1.4], m: { l: 38, r: 10, t: 22, b: 34 },
        xt, yt, xlab: "nota suonata, in ordine", ylab: fino <= 16 ? "tasto bianco · i numeri sono le dita" : "tasto bianco",
        aria: `${nomeEs}: motivo di ${L} note, ${G} ${G === 1 ? "gruppo" : "gruppi"}${G > 1 ? `, passo ${ra.passo} tasti per gruppo` : ""}. ` + Object.keys(note).map((h) => `${NOME_MANO[h]}: da ${note[h][0].nome}, ${note[h].length} note`).join("; ") + ".",
      });
      for (let g = 1; g * L < fino; g++) P.retta(g * L + 0.5, lo - 2, g * L + 0.5, hi + 2, "s-m fine punt");
      const piccolo = fino > 32 ? 2.4 : fino > 16 ? 3.2 : 4.4;
      for (const h of MANI) {
        if (!note[h]) continue;
        const cls = h === "r" ? "s-a" : "s-b", primo = new Map(); note[h].forEach((n) => { if (!primo.has(n.i)) primo.set(n.i, n); });
        if (G > 1) { const p0 = ra.mani[h][0]; P.retta(p0[0], p0[1], fino, p0[1] + ra.pendenza * (fino - p0[0]), "s-m tratt"); }
        P.spezzata([...primo.values()].map((n) => [n.i, n.bianco]), cls + " fine");
        note[h].forEach((n) => P.punto(n.i, n.bianco, { cls, forma: h === "r" ? "cerchio" : "quadro", r: h === "r" ? piccolo : piccolo - 0.4,
          t: fino <= 16 ? String(n.dito) : null, pos: h === "r" ? "n" : "s", tcls: cls + " p", tit: `${NOME_MANO[h]}, nota ${n.i}: ${n.nome}, dito ${n.dito}` }));
      }
      const leg = [];
      if (note.r) leg.push({ cls: "s-a", forma: "cerchio", t: "destra" });
      if (note.l) leg.push({ cls: "s-b", forma: "quadro", t: "sinistra" });
      if (G > 1) leg.push({ cls: "s-m tratt", forma: "linea", t: `rampa: pendenza ${ra.passo < 0 ? "−" : ""}${Math.abs(ra.passo)}/${L}` });
      ctx.graf.replaceChildren(PG.h("h3", { text: nomeEs }), P.svg, PG.legenda(leg));

      /* La lettura, calcolata */
      const dir = ra.passo > 0 ? "sale" : "scende", np = Math.abs(ra.passo);
      let r = `**${nomeEs}**: un motivo di ${L} note` + (G > 1 ? ` che ${dir} di ${np === 1 ? "un tasto" : np + " tasti"} a ogni gruppo, per ${G} gruppi.` : ", un gruppo solo.");
      if (rel.tipo === "parallelo") {
        const ott = rel.c % 7 === 0 ? (Math.abs(rel.c) === 7 ? "a un'ottava (7 tasti bianchi)" : `a ${Math.abs(rel.c) / 7} ottave (${Math.abs(rel.c)} tasti bianchi)`) : `a ${Math.abs(rel.c)} tasti bianchi`;
        r += ` Le due mani suonano le stesse note ${ott} di distanza: moto parallelo.`;
      } else if (rel.tipo === "specchio") {
        const asse = rel.c % 2 === 0 ? "sul " + calcola.nomeBianco(rel.c / 2) : `tra ${calcola.nomeBianco((rel.c - 1) / 2)} e ${calcola.nomeBianco((rel.c + 1) / 2)}`;
        r += ` Le due mani sono a specchio: la somma dei tasti resta costante, con l'asse ${asse}; una sale quando l'altra scende, moto contrario.`;
      } else if (rel.tipo === "una mano") r += ` Una mano sola: la ${NOME_MANO[Object.keys(tutte)[0]]}.`;
      else r += " Le due mani non sono né parallele né a specchio.";
      if (G > 1) r += ` La rampa ${dir} di ${np === 1 ? "un tasto" : np + " tasti"} ogni ${L} note: pendenza ${ra.passo < 0 ? "−" : ""}${np}/${L} = ${PN.num(ra.pendenza, 3)}.`;
      const incerte = MANI.filter((h) => fig.mani && fig.mani[h] && fig.mani[h].incerto);
      if (incerte.length) r += ` ${incerte.map((h) => NOME_MANO[h].replace(/^./, (x) => x.toUpperCase())).join(" e ")}: ricostruita, da confermare.`;
      ctx.lettura(r);
    }
    carica();
    return { smonta() { attivo = false; } };
  }

  const def = { calcola, disegna };
  if (typeof module === "object" && module.exports) module.exports = def; else root.Pattern.motore("esercizi-grafico", def);
})(typeof self !== "undefined" ? self : this);
