// Collaudo del motore «scala-retta» contro le scale costruite da music21 (tests/pattern/nucleo.rif.json).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), RIF = require("./nucleo.rif.json");
const scala = require("../../pattern/motori/scala-retta.js").calcola;

test("la scala come retta: i sette modi = music21", () => {
  const nomi = { 0: "locrio", 1: "frigio", 2: "minore", 3: "dorico", 4: "misolidio", 5: "maggiore", 6: "lidio" };
  for (let c = 0; c <= 6; c++) {
    assert.deepEqual(PN.scalaSemitoni(c), RIF.modi[nomi[c]].semitoni, "intercetta " + c);
    assert.equal(scala.modo(c).da, RIF.modi[nomi[c]].da);
    assert.deepEqual(scala.note(c).map((n) => n.nome), RIF.modi[nomi[c]].note, "tasti bianchi, intercetta " + c);
    assert.ok(scala.note(c).every((n) => [0, 2, 4, 5, 7, 9, 11].includes(PN.mod(n.midi, 12))), "solo tasti bianchi");
    assert.ok(scala.punti(c).every((p) => p.semitoni <= p.retta && p.retta - p.semitoni < 1), "ogni nota è la parte intera della retta");
  }
  assert.deepEqual(scala.passi(5), ["T", "T", "S", "T", "T", "T", "S"]);
  assert.deepEqual(scala.passi(2), ["T", "S", "T", "T", "S", "T", "T"]);
});
