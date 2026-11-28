// Collaudo del motore «esercizi-grafico»: l'espansione delle figure è confrontata nota per nota
// (1) con la funzione dell'app, buildFig, estratta dal sorgente di index.html, e (2) con un'espansione indipendente in Python (music21).
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const PN = require("../../pattern/nucleo.js"), E = require("../../pattern/motori/esercizi-grafico.js").calcola, RIF = require("./esercizi-grafico.rif.json");
const LIB = JSON.parse(fs.readFileSync(path.join(__dirname, "../../esercizi.json"), "utf8"));

// Estrae dall'app le righe che servono a buildFig: aiuti sui tasti bianchi, midiOf e la funzione intera.
function buildFigDellApp() {
  const src = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8").split("\n");
  const riga = (re) => { const i = src.findIndex((l) => re.test(l)); assert.ok(i >= 0, "in index.html manca " + re); return src[i]; };
  const parti = [/^const pc = /, /^const WI = /, /^const wi = /, /^const fromWi = /, /^const wUp = /, /^const NAT = /, /^function midiOf\(/, /^const FIGC = /].map(riga);
  const i0 = src.findIndex((l) => /^function buildFig\(/.test(l)); assert.ok(i0 >= 0, "buildFig non trovata");
  let i1 = i0; while (src[i1] !== "}") i1++;
  parti.push(src.slice(i0, i1 + 1).join("\n"));
  return new Function(parti.join("\n") + "\nreturn { buildFig, wi };")();
}

const casi = () => E.elenco(LIB).flatMap((e) => e.varianti.map((v) => ({ chiave: e.id + (v.id ? "/" + v.id : ""), fig: v.figura })));

test("l'elenco trova gli esercizi con figura", () => {
  assert.deepEqual(casi().map((c) => c.chiave), Object.keys(RIF.casi));
  assert.ok(casi().length >= 4);
});
test("espansione = buildFig di index.html, nota per nota, su tutti gli esercizi", () => {
  const APP = buildFigDellApp();
  for (const { chiave, fig } of casi()) {
    const mie = E.espandi(fig);
    for (const h of ["r", "l"]) {
      if (!fig.mani || !fig.mani[h]) { assert.equal(mie[h], undefined); continue; }
      const F = APP.buildFig(fig, h);
      const loro = F.groups.flatMap((G, g) => G.steps.flatMap((st, k) => st.map((n) => ({ i: g * fig.seq.length + k + 1, midi: n.m, dito: n.f }))));
      assert.deepEqual(mie[h].map((n) => ({ i: n.i, midi: n.midi, dito: n.dito })), loro, chiave + " " + h);
      assert.deepEqual(mie[h].map((n) => n.bianco), loro.map((n) => APP.wi(n.midi)), chiave + " " + h + ": tasti bianchi");
    }
  }
});
test("espansione, rampe e relazioni = riferimento indipendente (music21)", () => {
  for (const { chiave, fig } of casi()) {
    const r = RIF.casi[chiave], mie = E.espandi(fig), ra = E.rampa(fig);
    for (const h in r.note) assert.deepEqual(mie[h].map((n) => ({ i: n.i, gruppo: n.gruppo, bianco: n.bianco, nome: n.nome, dito: n.dito })), r.note[h], chiave + " " + h);
    assert.deepEqual(Object.keys(mie).sort(), Object.keys(r.note).sort());
    assert.deepEqual(E.relazione(mie.r, mie.l), r.relazione, chiave + ": relazione");
    assert.deepEqual(ra.mani, r.rampa, chiave + ": inizi dei gruppi");
    if (r.pendenza !== null) assert.ok(Math.abs(ra.pendenza - r.pendenza) < 1e-12, chiave + ": pendenza");
    assert.equal(ra.lunghezza, r.L); assert.equal(ra.gruppi, r.G);
  }
});
test("i fatti scritti nella tavola", () => {
  const hanon = LIB.esercizi.find((e) => e.id === "hanon").figura, e = E.espandi(hanon);
  assert.deepEqual(e.r.slice(0, 8).map((n) => n.nome), ["do4", "mi4", "fa4", "sol4", "la4", "sol4", "fa4", "mi4"], "§3.8: do, mi, fa, sol, la e ritorno");
  assert.deepEqual(e.r.slice(0, 5).map((n) => n.dito), [1, 2, 3, 4, 5]);
  assert.deepEqual(E.relazione(e.r, e.l), { tipo: "parallelo", c: 7 }, "§3.8: a un'ottava di distanza");
  assert.equal(E.rampa(hanon).pendenza, 1 / 8);
  const medio = LIB.esercizi.find((x) => x.id === "medio").varianti;
  assert.deepEqual(medio.map((v) => E.rampa(v.figura).pendenza), [1 / 7, -1 / 7], "partenza dal medio: 1/7 in salita e in discesa");
  // traslazione: ogni gruppo è il primo spostato di passo·(g − 1) tasti
  for (const n of e.r) assert.equal(n.bianco, e.r[n.k].bianco + (n.gruppo - 1));
  const cinque = LIB.esercizi.find((x) => x.id === "cinque").varianti.find((v) => v.id === "contrario").figura, c = E.espandi(cinque);
  assert.deepEqual(E.relazione(c.r, c.l), { tipo: "specchio", c: 67 }, "§2.1: a specchio, dai pollici");
  assert.deepEqual([c.r[0].dito, c.l[0].dito], [1, 1], "si parte dai pollici");
  assert.equal(E.nomeBianco(33) + " " + E.nomeBianco(34), "la3 si3", "asse della riflessione");
  assert.equal(E.breve("Terzo esercizio: il dito perno"), "Il dito perno");
  assert.equal(PN.num(1 / 8, 3), "0,125");
});
