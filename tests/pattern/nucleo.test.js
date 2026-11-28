// Collaudo del nucleo di Pattern contro i valori di riferimento (music21, frazioni) e la tabella del quaderno.
// Uso: node --test tests/pattern/
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), RIF = require("./nucleo.rif.json");

test("nomi sulla retta delle quinte e classi di altezza", () => {
  assert.deepEqual(PN.intervallo(-2, 9).map(PN.nomeQ), ["si♭", "fa", "do", "sol", "re", "la", "mi", "si", "fa♯", "do♯", "sol♯", "re♯"]);
  assert.deepEqual(PN.intervallo(0, 11).map(PN.pcQ).sort((a, b) => a - b), PN.intervallo(0, 11), "dodici quinte toccano tutte le dodici note");
  assert.deepEqual(PN.Q_GRADO, [0, 2, 4, -1, 1, 3, 5]);
});
test("scale, armature e triadi di tredici tonalità = music21", () => {
  for (const [ts, r] of Object.entries(RIF.tonalita)) {
    const t = Number(ts);
    assert.equal(PN.nomeQ(t), r.tonica);
    assert.deepEqual(PN.scalaQ(t).map(PN.nomeQ), r.scala, "scala di " + r.tonica);
    assert.deepEqual(PN.armatura(t).note.map(PN.nomeQ), r.armatura, "armatura di " + r.tonica);
    r.gradi.forEach((g, i) => { const a = PN.triade(t, i); assert.equal(a.tipo, g.tipo); assert.equal(a.sigla, g.sigla); assert.deepEqual(a.q.map(PN.nomeQ), g.note); });
  }
});
test("frequenze degli 88 tasti e centesimi", () => {
  for (const [n, f] of Object.entries(RIF.frequenze)) assert.ok(Math.abs(PN.freqTasto(Number(n)) - f) < 1e-6 * f, "tasto " + n);
  for (const [r, c] of Object.entries(RIF.cents)) { const [a, b] = r.split("/").map(Number); assert.ok(Math.abs(PN.cents(a / b) - c) < 1e-9, r); }
  assert.equal(PN.num(-1.955, 2), "−1,96"); assert.equal(PN.nomeMidi(60), "do4"); assert.equal(PN.nomeMidi(69), "la4");
});
