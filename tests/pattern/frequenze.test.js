// Prove del motore «frequenze» contro il riferimento indipendente (music21, Decimal) e i numeri del quaderno (§4.10).
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), C = require("../../pattern/motori/frequenze.js").calcola, RIF = require("./frequenze.rif.json");
const IT = { C: "do", D: "re", E: "mi", F: "fa", G: "sol", A: "la", B: "si" };

test("88 tasti = music21, nomi compresi", () => {
  for (let n = 1; n <= 88; n++) {
    assert.ok(Math.abs(C.frequenza(n) - RIF.frequenze[n]) < 1e-9 * RIF.frequenze[n], "tasto " + n);
    const m = RIF.nomi[n], alt = m[1] === "#" ? "♯" : m[1] === "-" ? "♭" : "", nome = IT[m[0]] + alt + m.slice(-1);
    assert.ok(C.nome(n).split("/").includes(nome), `nome del tasto ${n}: ${C.nome(n)} / ${nome}`);
  }
  assert.equal(C.nome(40), "do4"); assert.equal(C.nome(49), "la4"); assert.equal(C.nome(43), "re♯4/mi♭4");
});
test("fattore, tasso e raddoppio dopo dodici semitoni", () => {
  assert.ok(Math.abs(C.fattoreSemitono() - RIF.fattore) < 1e-15);
  assert.ok(Math.abs(C.tassoPercento() - RIF.tasso_percento) < 1e-12);
  assert.ok(Math.abs(Number(RIF.dodici_passi) - 2) < 1e-40, "prodotto ripetuto in Decimal");
  for (let n = 1; n <= 76; n++) assert.ok(Math.abs(C.frequenza(n + 12) / C.frequenza(n) - 2) < 1e-12);
});
test("estensione: ottave e decadi", () => {
  const e = C.estensione();
  for (const k of ["fMin", "fMax", "ottave", "decadi"]) assert.ok(Math.abs(e[k] - RIF.estensione[k]) < 1e-9, k);
  assert.equal(PN.num(e.fMin, 1), "27,5"); assert.equal(PN.num(e.fMax, 2), "4186,01");
  assert.equal(PN.num(e.ottave, 2), "7,25"); assert.equal(PN.num(e.decadi, 2), "2,18");
});
test("metà ottava: × √2, non × 1,5", () => {
  for (let k = 0; k <= 6; k++) {
    const m = C.meta(k);
    assert.ok(Math.abs(m.rapporto - RIF.meta[k].rapporto) < 1e-12 && Math.abs(m.rapporto - RIF.radice2) < 1e-12);
    assert.ok(Math.abs(m.fLineare - RIF.meta[k].lineare) < 1e-9); assert.equal(m.rapportoLineare, 1.5);
    for (let x = 1 + 12 * k + 0.25; x < 13 + 12 * k; x += 0.25) assert.ok(C.frequenza(x) < C.corda(k, x), "l'esponenziale sta sotto la corda");
  }
  assert.equal(C.ottavaDi(88), 6); assert.equal(C.ottavaDi(13), 1); assert.equal(C.ottavaDi(12), 0);
});
test("numeri del quaderno (§4.10) e dei testi della tavola", () => {
  assert.equal(PN.num(C.frequenza(49), 0), "440"); assert.equal(PN.num(C.frequenza(61), 0), "880"); assert.equal(PN.num(C.frequenza(73), 0), "1760");   // A.1
  assert.equal(PN.num(C.fattoreSemitono(), 4), "1,0595");   // A.5
  assert.equal(PN.num(C.frequenza(16), 1), "65,4");          // do2 della figura 4.4
  assert.equal(PN.num(C.tassoPercento(), 2), "5,95");
  assert.equal(PN.num(C.ottave(1, 10) / C.decadi(1, 10), 2), "3,32");   // ottave per decade, nelle formule
  assert.equal(PN.num(C.meta(3).rapporto, 3), "1,414");
  const m = C.meta(3); assert.equal(PN.num(m.f - m.fLa, 0), "91"); assert.equal(PN.num(m.fLaSu - m.f, 0), "129");   // prova alla tastiera
  assert.equal(PN.num(C.frequenza(40), 2), "261,63"); assert.equal(PN.num(C.frequenza(41), 2), "277,18"); assert.equal(PN.num(C.frequenza(52), 2), "523,25");
});
