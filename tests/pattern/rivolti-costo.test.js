// Collaudo del motore «rivolti-costo» contro la forza bruta (rivolti-costo.rif.json) e i numeri del quaderno (§1.1, §2.6, §4.5).
const test = require("node:test"), assert = require("node:assert/strict");
const C = require("../../pattern/motori/rivolti-costo.js").calcola, RIF = require("./rivolti-costo.rif.json");

test("triadi di do maggiore = music21", () => {
  for (let g = 0; g < 7; g++) assert.deepEqual([...C.triadeDo(g)].sort((a, b) => a - b), [...RIF.triadi[g]].sort((a, b) => a - b));
});
test("147 casi: costi dei tre rivolti e minimo = forza bruta su tutte le terne di tasti", () => {
  for (const [chiave, r] of Object.entries(RIF.casi)) {
    const [da, pos, a] = chiave.split(",").map(Number), M = C.migliore(da, a, pos);
    assert.deepEqual(M.partenza, r.partenza, chiave);
    assert.deepEqual(M.rivolti.map((x) => x.costo), r.rivolti, chiave);
    assert.equal(M.min, r.min_stretta); assert.equal(M.min, r.min_libera, "nessuna posizione larga costa meno");
    assert.equal(C.costo(M.partenza, M.midi), M.min);
    assert.equal(C.comuni(da, a), r.comuni);
  }
});
test("§1.1: da do a fa, 15 in stato fondamentale e 3 in secondo rivolto con il do fermo", () => {
  const M = C.migliore(0, 3, 0);
  assert.deepEqual(M.partenza, [60, 64, 67], "do4-mi4-sol4");
  assert.deepEqual(M.rivolti.map((r) => r.costo), [15, 9, 3]);
  assert.deepEqual(M.rivolti[0].midi.map((m, i) => m - M.partenza[i]), [5, 5, 5], "una quarta per ogni voce");
  assert.deepEqual(M.midi, [60, 65, 69]); assert.deepEqual(M.midi.map((m, i) => m - M.partenza[i]), [0, 1, 2]); assert.deepEqual(M.ferme, [60]);
  assert.equal(C.frase(0, 3, 0), "Da **do** a **fa**: stato fondamentale 15, primo rivolto 9, secondo rivolto 3 semitoni. Minimo: **do-fa-la** (secondo rivolto), con il do fermo.");
});
test("da I: III 1, VI 2, IV e V 3, II e VII 5", () => {
  assert.deepEqual(C.tabella(0, 0).map((r) => r.costo), [0, 5, 1, 3, 3, 2, 5]);
});
test("§2.6 e §4.5: le terze vicine (due note in comune) sono i due minimi da ogni accordo", () => {
  for (let da = 0; da < 7; da++) for (let pos = 0; pos < 3; pos++) {
    const altri = C.tabella(da, pos).filter((r) => r.a !== da), terze = altri.filter((r) => r.comuni === 2), resto = altri.filter((r) => r.comuni < 2);
    assert.equal(terze.length, 2);
    assert.ok(Math.max(...terze.map((r) => r.costo)) < Math.min(...resto.map((r) => r.costo)), `da ${da}, posizione ${pos}`);
  }
  assert.equal(C.comuni(1, 3), 2, "re minore e fa: due note in comune (§4.5)");
});
