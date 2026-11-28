// Prove del motore «fibonacci» contro il riferimento (interi, frazioni, Decimal) e i numeri del quaderno (§4.11).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), C = require("../../pattern/motori/fibonacci.js").calcola, RIF = require("./fibonacci.rif.json");
const vicino = (a, b, msg, tol = 1e-12) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} contro ${b}`);

test("termini, rapporti, centesimi e intervalli puri = riferimento (n = 1 … 30)", () => {
  RIF.fib.forEach((f, k) => assert.equal(C.fib(k), f, "F(" + k + ")"));
  for (let n = 1; n <= 30; n++) {
    const r = RIF.rapporti[n];
    assert.equal(C.num(n), r.num); assert.equal(C.den(n), r.den);
    vicino(C.rapporto(n), r.valore, "rapporto " + n); vicino(C.cents(n), r.cents, "centesimi " + n, 1e-9);
    assert.equal(C.sopraSotto(n), r.segno, "sopra/sotto " + n);
    if (n <= 20) vicino(C.distanza(n), r.distanza, "distanza " + n, 1e-14);
    assert.equal(C.puro(n) ? C.puro(n).nome : null, r.puro, "intervallo puro " + n);
  }
  vicino(C.PHI, Number(RIF.phi), "φ"); vicino(C.centsPhi(), RIF.cents_phi, "φ in centesimi", 1e-9);
});
test("alterna sopra e sotto φ e si avvicina sempre (fino a n = 30)", () => {
  assert.ok(RIF.alterna_fino_a_30 && RIF.decresce_fino_a_30);
  for (let n = 1; n < 30; n++) assert.equal(C.sopraSotto(n), -C.sopraSotto(n + 1), "alternanza " + n);
  for (let n = 1; n < 20; n++) assert.ok(C.distanza(n + 1) < C.distanza(n), "decrescita " + n);   // oltre n = 20 la differenza scende sotto la precisione dei float: la verifica è nel riferimento
});
test("numeri del quaderno (§4.11) e della tavola", () => {
  // B.2, tabella: centesimi arrotondati all'unità
  const B2 = ["1200", "702", "884", "814", "841", "830"];
  B2.forEach((v, i) => assert.equal(PN.num(C.cents(i + 1), 0), v, C.frazione(i + 1)));
  assert.equal(PN.num(C.centsPhi(), 0), "833");
  // B.1: quozienti 2; 1,5; 1,667; 1,6; 1,625; 1,615; 1,619 e φ = 1,618
  ["2,000", "1,500", "1,667", "1,600", "1,625", "1,615", "1,619"].forEach((v, i) => assert.equal(PN.num(C.rapporto(i + 1), 3), v));
  assert.equal(PN.num(C.PHI, 3), "1,618"); assert.equal(PN.num(100 / C.PHI, 1), "61,8");
  // i primi quattro puri, poi nessuno (fino a 12)
  assert.deepEqual([1, 2, 3, 4].map((n) => C.puro(n).nome), ["ottava", "quinta", "sesta maggiore", "sesta minore"]);
  for (let n = 5; n <= 12; n++) { assert.equal(C.puro(n), null); const t = C.tasti(n); assert.equal(t.sotto, 800); assert.equal(t.sopra, 900); }
  // testi: lettura e «Che cosa guardare»
  assert.equal(PN.num(C.cents(4), 1), "813,7"); assert.equal(PN.num(C.cents(5), 1), "840,5"); assert.equal(PN.num(C.cents(6), 1), "830,3"); assert.equal(PN.num(C.centsPhi(), 2), "833,09");
  assert.equal(C.tasti(4).vicino, 800); assert.equal(C.tasti(3).vicino, 900); assert.equal(C.tasti(2).vicino, 700); assert.equal(C.tasti(1).vicino, 1200);
  assert.deepEqual([1, 2, 3, 4].map(C.frazione), ["2/1", "3/2", "5/3", "8/5"]); assert.equal(C.frazione(12), "377/233");
});
