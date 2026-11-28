// Collaudo del motore «diteggiatura» contro gli elenchi del §1.2 (copiati a mano), music21 e i fatti dichiarati nella tavola.
const test = require("node:test"), assert = require("node:assert/strict");
const D = require("../../pattern/motori/diteggiatura.js").calcola, RIF = require("./diteggiatura.rif.json");

test("la regola di periodo 7 ridà gli elenchi del §1.2", () => {
  for (const o of [1, 2]) {
    const r = RIF.ottave[o];
    assert.deepEqual(D.dita("d", o), r.d, "destra, " + o + " ottave");
    assert.deepEqual(D.dita("s", o), r.s, "sinistra, " + o + " ottave");
    assert.deepEqual(D.dita("s", o, "giu"), r.s_giu, "sinistra che scende, " + o + " ottave");
    // periodo 7, tranne il mignolo agli estremi
    const d = D.dita("d", o), s = D.dita("s", o);
    for (let k = 0; k + 7 < d.length - 1; k++) assert.equal(d[k], d[k + 7], "destra: f(k + 7) = f(k)");
    for (let k = 1; k + 7 < s.length; k++) assert.equal(s[k], s[k + 7], "sinistra: f(k + 7) = f(k)");
  }
});
test("coincidenze e passaggi = confronto posizione per posizione", () => {
  for (const o of [1, 2]) {
    const r = RIF.ottave[o];
    assert.deepEqual(D.coincidenze(o, "parallelo"), r.coincidenze_parallelo);
    assert.deepEqual(D.coincidenze(o, "contrario"), r.coincidenze_contrario);
    const solo = (a) => a.map((p) => ({ nota: p.nota, dito: p.dito, prima: p.prima }));
    assert.deepEqual(solo(D.passaggi("d", o)), r.passaggi_d);
    assert.deepEqual(solo(D.passaggi("s", o)), r.passaggi_s);
    assert.deepEqual(solo(D.passaggi("s", o, "giu")), r.passaggi_s_giu);
  }
});
test("i fatti scritti nella tavola", () => {
  const note = (a) => a.map((c) => c.nota);
  // un'ottava: medi insieme sulle note 3 e 6, pollici mai
  assert.deepEqual(D.coincidenze(1, "parallelo"), [{ nota: 3, dito: 3 }, { nota: 6, dito: 3 }]);
  // due ottave: medi su 3, 6, 10, 13; pollici solo sulla nota 8
  const c2 = D.coincidenze(2, "parallelo");
  assert.deepEqual(note(c2.filter((c) => c.dito === 3)), [3, 6, 10, 13]);
  assert.deepEqual(note(c2.filter((c) => c.dito === 1)), [8]);
  assert.equal(c2.length, 5, "nessun'altra coincidenza");
  // in parallelo le due mani non passano mai insieme; in contrario passano sempre insieme e le dita coincidono a ogni nota
  for (const o of [1, 2]) {
    assert.deepEqual(D.passaggiInsieme(o, "parallelo"), []);
    assert.equal(D.coincidenze(o, "contrario").length, D.n(o));
    assert.deepEqual(D.passaggiInsieme(o, "contrario"), note(D.passaggi("d", o)));
  }
  assert.deepEqual(note(D.passaggi("d", 1)), [4]); assert.deepEqual(note(D.passaggi("s", 1)), [6]);
  assert.deepEqual(note(D.passaggi("d", 2)), [4, 8, 11]); assert.deepEqual(note(D.passaggi("s", 2)), [6, 9, 13]);
  assert.deepEqual(D.passaggi("s", 2).map((p) => p.dito), [3, 4, 3], "sinistra: medio, anulare, medio scavalcano");
});
test("note, tasti neri e tabella del §1.2 = music21", () => {
  for (const t of D.TONALITA) {
    const r = RIF.scale[t], nd = D.note(t, 2, "d");
    assert.deepEqual(nd.map((x) => x.nome), r.note, "note di " + r.note[0]);
    assert.deepEqual(nd.map((x) => x.midi), r.midi, "MIDI di " + r.note[0]);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((g) => D.suTastoNero(t, g)), r.nero, "tasti neri di " + r.note[0]);
    const tb = D.tabella(t), tq = RIF.tabella_1_2[t];
    assert.equal(tb.pollice, r.pollice); assert.equal(tb.medio, r.medio); assert.deepEqual(tb.neri, r.neri);
    assert.deepEqual([tb.scala, tb.neri.join(", "), tb.pollice, tb.medio], tq, "tabella del §1.2, riga " + tq[0]);
    // la sinistra un'ottava sotto, in su e in giù, con gli stessi nomi
    assert.deepEqual(D.note(t, 1, "s", "parallelo").map((x) => x.midi), r.midi.slice(0, 8).map((m) => m - 12));
    assert.deepEqual(D.note(t, 1, "s", "contrario").map((x) => x.nome), r.note.slice(7, 15).reverse());
  }
  // §5.2: in re, la e mi il medio prima del passaggio (III grado) è su un tasto nero; in do e sol no. Il VI della sinistra è nero in la e mi.
  assert.deepEqual(D.TONALITA.map((t) => D.suTastoNero(t, 2)), [false, false, true, true, true]);
  assert.deepEqual(D.TONALITA.map((t) => D.suTastoNero(t, 5)), [false, false, false, true, true]);
  assert.deepEqual(D.TONALITA.map((t) => D.suTastoNero(t, 6)), [false, true, true, true, true], "l'anulare oltre l'ottava: nero già da sol");
});
