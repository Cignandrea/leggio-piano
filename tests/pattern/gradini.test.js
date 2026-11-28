// Collaudo del motore «gradini» contro la soluzione esatta del sistema lineare (frazioni) e una simulazione Monte Carlo con seme fisso.
const test = require("node:test"), assert = require("node:assert/strict");
const PN = require("../../pattern/nucleo.js"), G = require("../../pattern/motori/gradini.js").calcola, RIF = require("./gradini.rif.json");
const vicino = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} contro ${b}`);

test("formula chiusa = sistema lineare risolto con le frazioni, p da 0,30 a 1", () => {
  for (const [k, r] of Object.entries(RIF.curva)) {
    const p = Number(k) / 100;
    vicino(G.curva(p), r.E60, 1e-9 * r.E60, "curva a " + p);
    vicino(G.attesi(p, p, p), r.E60, 1e-9 * r.E60, "attesi a " + p);
    vicino(G.resa(p, p, p), r.resa, 1e-12, "resa a " + p);
    // il sistema da cui viene la formula: E80 = 1 + (1 − p)·E60 e E70 = 1 + p·E80 + (1 − p)·E60
    vicino(r.E80, 1 + (1 - p) * r.E60, 1e-9 * r.E60, "terza equazione a " + p);
  }
});
test("Monte Carlo, 200 000 partite per caso, entro il 2%", () => {
  for (const m of RIF.montecarlo) {
    vicino(G.attesi(...m.p), m.esatto, 1e-9 * m.esatto, "esatto " + m.p);
    vicino(G.attesi(...m.p), m.simulato, RIF.tolleranza_mc_relativa * m.esatto, "simulato " + m.p);
    vicino(G.resa(...m.p), m.resa, 1e-12, "resa " + m.p);
  }
});
test("i numeri scritti nella tavola", () => {
  for (const [p, e] of Object.entries(RIF.spec)) assert.equal(PN.num(G.curva(Number(p)), Number.isInteger(e) ? 0 : e === 51.5 ? 1 : 2), PN.num(e, Number.isInteger(e) ? 0 : e === 51.5 ? 1 : 2), "E(" + p + ")");
  assert.equal(PN.num(G.curva(0.8), 1), "4,8"); assert.equal(PN.num(100 * G.resa(0.8, 0.8, 0.8), 0), "51");
  assert.equal(PN.num(G.curva(0.5), 1), "14,0"); assert.equal(G.curva(1), 3, "il minimo: tre giri");
  assert.equal(PN.num(G.curva(0.6), 1), "9,1", "con 6 su 10");
  assert.equal(PN.num(G.attesi(0.9, 0.8, 0.6), 1), "6,1");
  for (let k = 30; k < 100; k += 5) assert.ok(G.curva(k / 100) > G.curva((k + 5) / 100), "E(p) decresce");
});
test("limite del modello: con p fisse il ritorno al gradino appena sotto costerebbe meno giri", () => {
  for (const [k, r] of Object.entries(RIF.curva)) {
    if (k === "100") vicino(r.alternativa, r.E60, 1e-12, "a p = 1 le due regole coincidono");
    else assert.ok(r.alternativa < r.E60, "a p = " + k + "%: " + r.alternativa + " < " + r.E60);
  }
});
