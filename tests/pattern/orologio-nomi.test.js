// Le note scritte nella tavola degli intervalli devono avere il nome dell'intervallo: do–re♭ è una seconda minore, do–do♯ no.
// Riferimento: music21 (tests/pattern/nucleo.rif.py, campo intervalli_da_do).
const test = require("node:test"), assert = require("node:assert/strict");
const RIF = require("./nucleo.rif.json"), O = require("../../pattern/motori/orologio.js").calcola;

test("intervalli sopra il do: nomi delle note = music21", () => {
  assert.deepEqual(O.NOMI_INT, RIF.intervalli_da_do);
  assert.match(O.fraseIntervallo(1, false), /seconda minore\*\* \(do–re♭\)/);
  assert.match(O.fraseIntervallo(6, false), /tritono\*\* \(do–fa♯\)/);
  assert.match(O.fraseIntervallo(8, false), /sesta minore\*\* \(do–la♭\)/);
  assert.ok(!/♯♯ aumentat/.test(O.fraseTriade(5, "aum", 0)), "nessun nome di accordo con il doppio diesis");
});
