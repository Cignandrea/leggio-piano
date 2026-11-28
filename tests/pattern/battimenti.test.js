// Prove del motore «battimenti» contro il riferimento (music21, frazioni, somma campionata) e i numeri del quaderno (§4.10).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), C = require("../../pattern/motori/battimenti.js").calcola, RIF = require("./battimenti.rif.json");
const vicino = (a, b, msg, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} contro ${b}`);

test("le quattro coppie = riferimento", () => {
  for (const it of C.INTERVALLI) {
    const c = C.coppia(it.id), r = RIF[it.id];
    for (const k of ["fBassa", "fAlta", "f1", "f2", "battimenti", "scartoCents"]) vicino(c[k], r[k], `${it.id}.${k}`, 1e-8);
    assert.equal(c.armBasso, r.armBasso); assert.equal(c.armAlto, r.armAlto);
    vicino(c.periodo, r.passo_campionato, `${it.id}: distanza tra gli zeri dell'inviluppo campionato`, 2e-3 * c.periodo);
    vicino(C.inviluppo(c.battimenti, r.primo_minimo), 0, `${it.id}: primo zero`, 0.05);
    assert.ok(r.inviluppo_max > 1.99 && r.inviluppo_max <= 2 + 1e-12);
  }
});
test("identità sin a + sin b = 2·cos·sin, e inviluppo come limite della somma", () => {
  assert.ok(RIF.identita_errore_max < 1e-12);
  let seme = 12345; const rnd = () => (seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 5000; i++) { const a = 100 * rnd() - 50, b = 100 * rnd() - 50; vicino(Math.sin(a) + Math.sin(b), 2 * Math.cos((a - b) / 2) * Math.sin((a + b) / 2), "identità", 1e-12); }
  const c = C.coppia("quinta");
  for (let i = 0; i <= 20000; i++) { const t = 2 * i / 20000; assert.ok(Math.abs(C.somma(c.f1, c.f2, t)) <= C.inviluppo(c.battimenti, t) + 1e-9, "la somma sta dentro l'inviluppo"); }
  C.massimi(c.battimenti, 2).forEach((t) => vicino(C.inviluppo(c.battimenti, t), 2, "massimo"));
});
test("numeri del quaderno (§4.10) e della lettura", () => {
  const q = C.coppia("quinta"), t = C.coppia("terza");
  assert.equal(PN.num(q.battimenti, 1), "0,9"); assert.equal(PN.num(t.battimenti, 1), "10,4");                 // esempio dei battimenti
  assert.equal(PN.num(q.f1, 2), "784,88"); assert.equal(PN.num(q.f2, 2), "783,99"); assert.equal(PN.num(q.battimenti, 2), "0,89");
  assert.equal(PN.num(t.battimenti, 2), "10,38"); assert.equal(PN.num(t.scartoCents, 2), "13,69");
  // tabella A.2, colonna «pianoforte − puro»
  const A2 = { quinta: "−2,0", quarta: "2,0", terza: "13,7", terzamin: "−15,6" };
  for (const [k, v] of Object.entries(A2)) assert.equal(PN.num(C.coppia(k).scartoCents, 1), v, k);
  assert.equal(PN.num(q.scartoCents, 2), "−1,96");
  assert.ok(q.battimenti < 1 && t.battimenti > 9 && t.battimenti < 11, "meno di un battito; una decina");
});
