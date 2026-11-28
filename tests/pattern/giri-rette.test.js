// Collaudo del motore «giri-rette» contro la tabella del §5.4 del quaderno (copiata a mano in tests/pattern/nucleo.rif.py).
const test = require("node:test"), assert = require("node:assert/strict");
const RIF = require("./nucleo.rif.json");
const giri = require("../../pattern/motori/giri-rette.js").calcola;

test("i due giri nelle cinque tonalità = tabella del §5.4", () => {
  for (const g of giri.GIRI) for (const t of [0, 1, 2, 3, 4]) assert.equal(giri.accordi(g.gradi, t).map((a) => a.sigla).join(" "), RIF.tabella_5_4[g.id][t]);
  assert.equal(giri.ritorno(giri.GIRI[1].gradi), -1, "giro armonico: il ritorno scende di una quinta");
  assert.equal(giri.ritorno(giri.GIRI[0].gradi), 1, "giro pop: il ritorno sale di una quinta");
  assert.deepEqual(giri.stessaNota([0, 4, 5, 3], [0, 1, 2, 3, 4], 1), [{ t: 0, g: 4 }, { t: 1, g: 0 }, { t: 2, g: 3 }], "sol: V di do, I di sol, IV di re");
  assert.deepEqual(giri.stessaNota([0, 5, 1, 4], [0, 1, 2, 3, 4], 3).slice(0, 2), [{ t: 0, g: 5 }, { t: 1, g: 1 }], "la: VI di do, II di sol");
});
