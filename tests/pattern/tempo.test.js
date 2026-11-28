// Collaudo del motore «tempo» contro frazioni esatte, una derivata numerica e la tabella del §2.4.
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), T = require("../../pattern/motori/tempo.js").calcola, RIF = require("./tempo.rif.json");
const vicino = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} contro ${b}`);

test("durate, guadagni e divisioni = frazioni esatte, da 40 a 180 BPM", () => {
  for (const [bs, r] of Object.entries(RIF.punti)) {
    const b = Number(bs), v = T.valori(b), g = T.guadagno(b, 10);
    vicino(T.durata(b), r.durata, 1e-12, "durata " + b); vicino(v.minima, r.minima, 1e-12, "minima " + b); vicino(v.semibreve, r.semibreve, 1e-12, "semibreve " + b);
    vicino(g.secondi, r.guadagno_s, 1e-12, "guadagno " + b); vicino(g.percento, r.guadagno_pct, 1e-9, "percento " + b);
    T.divisione(b, "pari").forEach((x, i) => vicino(x, r.pari[i], 1e-12, "pari " + b));
    T.divisione(b, "shuffle").forEach((x, i) => vicino(x, r.shuffle[i], 1e-12, "shuffle " + b));
    vicino(T.pendenza(b), r.pendenza_num, 1e-7, "pendenza = differenza centrale " + b);
  }
});
test("la tabella del §2.4", () => {
  for (const [fig, [tempi, a60, a120]] of Object.entries(RIF.tabella_2_4)) {
    assert.equal(T.valori(60)[fig] / T.durata(60), tempi);
    assert.equal(PN.num(T.valori(60)[fig], a60.includes(",") ? 1 : 0), a60, fig + " a 60");
    assert.equal(PN.num(T.valori(120)[fig], a120.includes(",") ? 1 : 0), a120, fig + " a 120");
  }
});
test("i numeri scritti nella tavola", () => {
  assert.equal(PN.num(T.guadagno(60, 10).secondi, 2), "0,14"); assert.equal(PN.num(T.guadagno(60, 10).percento, 1), "14,3");
  assert.equal(PN.num(T.guadagno(70, 10).percento, 1), "12,5"); assert.equal(RIF.gradini_pct_esatti["70→80"], "25/2");
  assert.equal(PN.num(T.guadagno(170, 10).secondi, 2), "0,02"); assert.equal(PN.num(T.guadagno(170, 10).percento, 1), "5,6");
  assert.equal(T.durata(120), T.durata(60) / 2, "raddoppiare i BPM dimezza la durata");
  assert.equal(PN.num(T.pendenza(60), 4), "−0,0167");
  const [l, c] = T.divisione(90, "shuffle"); vicino(l / c, 2, 1e-12, "shuffle: la lunga vale il doppio della corta");
});
